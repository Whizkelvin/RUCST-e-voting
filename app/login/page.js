// app/login/page.js
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { FaEnvelope, FaIdCard, FaSpinner, FaCheckCircle, FaUserShield, FaUserGraduate, FaUserCog, FaUniversity, FaChalkboardTeacher } from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';
import { logOtpGeneration, getClientIP } from '@/utils/auditLog';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [clientIP, setClientIP] = useState('unknown');
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [userType, setUserType] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userRoleDetails, setUserRoleDetails] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const { login: adminLogin } = useAdminAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      email: '',
      schoolId: ''
    }
  });

  const watchedEmail = watch('email');
  const watchedSchoolId = watch('schoolId');

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  useEffect(() => {
    const getIP = async () => {
      const ip = await getClientIP();
      setClientIP(ip);
    };
    getIP();
  }, []);

  // REMOVED the automatic role detection - THIS WAS THE SECURITY ISSUE!
  // Now we only detect role AFTER successful authentication

  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Check if user exists and get their role (for display after password verification)
  const checkUserRole = async (email, schoolId) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanSchoolId = schoolId.trim().padStart(8, '0');
      
      // First check in user_roles table
      const { data: roleUser, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (roleUser && !roleError) {
        return {
          type: roleUser.role,
          details: roleUser
        };
      }
      
      // Check in admins table
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', cleanEmail)
        .eq('school_id', cleanSchoolId)
        .maybeSingle();

      if (admin && !adminError) {
        return {
          type: admin.role || 'admin',
          details: admin
        };
      }
      
      // Check if voter exists
      const { data: voter, error: voterError } = await supabase
        .from('voters')
        .select('id, has_voted')
        .eq('email', cleanEmail)
        .eq('school_id', cleanSchoolId)
        .maybeSingle();

      if (voter && !voterError) {
        return {
          type: 'voter',
          details: voter
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking user role:', error);
      return null;
    }
  };

  // Handle admin login with proper authentication
  const handleAdminLogin = async (email, schoolId) => {
    setIsLoading(true);
    try {
      console.log('Attempting admin login...');
      
      const cleanEmail = email.toLowerCase().trim();
      const cleanSchoolId = schoolId.trim().padStart(8, '0');
      
      // FIRST: Attempt to authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanSchoolId
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        toast.error('Invalid email or password. Please check your credentials.');
        setIsLoading(false);
        return;
      }
      
      // If authentication successful, THEN get the user's role
      const userRoleInfo = await checkUserRole(email, schoolId);
      
      if (!userRoleInfo) {
        toast.error('User authenticated but no role found. Please contact administrator.');
        // Sign out since no role found
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }
      
      // Store role in localStorage
      localStorage.setItem('user_role', userRoleInfo.type);
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_id', authData.user.id);
      
      if (userRoleInfo.details) {
        localStorage.setItem('user_details', JSON.stringify(userRoleInfo.details));
      }
      
      // Redirect based on role
      let redirectPath = '/';
      let welcomeMessage = '';
      
      switch (userRoleInfo.type) {
        case 'dean':
          redirectPath = '/admin/dean-dashboard';
          welcomeMessage = 'Welcome Dean of Students! Redirecting to Dean Dashboard...';
          break;
        case 'electoral_commission':
        case 'ec':
          redirectPath = '/admin/electoral-commission-dashboard';
          welcomeMessage = 'Welcome Electoral Commissioner! Redirecting to Electoral Dashboard...';
          break;
        case 'it_admin':
          redirectPath = '/admin/it-admin-dashboard';
          welcomeMessage = 'Welcome IT Admin! Redirecting to IT Admin Dashboard...';
          break;
        case 'hod':
          redirectPath = '/admin/hod-dashboard';
          welcomeMessage = 'Welcome Head of Department! Redirecting to HOD Dashboard...';
          break;
        case 'admin':
          redirectPath = '/admin/manage-voters';
          welcomeMessage = 'Welcome Admin! Redirecting to Admin Panel...';
          break;
        case 'voter':
          redirectPath = '/verify-otp';
          welcomeMessage = 'Authentication successful! Redirecting to vote...';
          break;
        default:
          redirectPath = '/';
          welcomeMessage = 'Login successful!';
      }
      
      toast.success(welcomeMessage);
      
      setTimeout(() => {
        router.push(redirectPath);
      }, 1500);
      
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('Error during login: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voter login with OTP
  const handleVoterLogin = async (email, schoolId) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanSchoolId = schoolId.trim().padStart(8, '0');

      // Check if voter exists
      const { data: voter, error: voterError } = await supabase
        .from('voters')
        .select('*')
        .eq('email', cleanEmail)
        .eq('school_id', cleanSchoolId)
        .maybeSingle();

      if (voterError || !voter) {
        toast.error('Voter not found. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      // Check if voter has already voted
      if (voter.has_voted === true) {
        toast.error('❌ You have already cast your vote. Voting is only allowed once per voter.');
        setTimeout(() => {
          router.push('/election-result');
        }, 3000);
        setIsLoading(false);
        return;
      }

      // Check votes table as fallback
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('voter_id', voter.id)
        .maybeSingle();

      if (existingVote) {
        await supabase
          .from('voters')
          .update({ 
            has_voted: true,
            voted_at: new Date().toISOString()
          })
          .eq('id', voter.id);
        
        toast.error('❌ You have already cast your vote.');
        setTimeout(() => {
          router.push('/election-result');
        }, 3000);
        setIsLoading(false);
        return;
      }

      // Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await hashCode(otpCode);
      
      // Delete any existing OTP for this voter
      await supabase
        .from('otp_codes')
        .delete()
        .eq('voter_id', voter.id);
      
      // Insert new OTP
      const { error: otpError } = await supabase
        .from('otp_codes')
        .insert({
          voter_id: voter.id,
          email: cleanEmail,
          school_id: cleanSchoolId,
          code_hash: hashedOtp,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          used: false
        });

      if (otpError) throw otpError;

      // Send OTP
      try {
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            otp: otpCode,
            name: voter.name,
            expiresIn: 10
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.info(`🔑 Test OTP: ${otpCode}`);
        } else {
          toast.success(`✅ OTP sent to ${email}. Check your inbox.`);
        }
      } catch (emailError) {
        toast.info(`🔑 Test OTP: ${otpCode}`);
      }

      // Store voter info for OTP verification
      localStorage.setItem('temp_voter_email', cleanEmail);
      localStorage.setItem('temp_voter_school_id', cleanSchoolId);
      localStorage.setItem('temp_voter_id', voter.id);
      localStorage.setItem('temp_voter_name', voter.name);

      await logOtpGeneration({
        voter_id: voter.id,
        email: email,
        ip_address: clientIP,
        success: true
      });

      toast.success('OTP sent! Redirecting to verification...');
      setTimeout(() => {
        router.push("/verify-otp");
      }, 1500);
      
    } catch (error) {
      console.error('Voter login error:', error);
      toast.error(error.message || 'Error during login');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (formData) => {
    setIsLoading(true);
    const { email, schoolId } = formData;

    try {
      // First check what type of user this is (without authentication)
      // This is just to determine the flow, not to grant access
      const userRoleInfo = await checkUserRole(email, schoolId);
      
      if (!userRoleInfo) {
        toast.error('❌ No account found with these credentials. Please check your email and school ID.');
        setIsLoading(false);
        return;
      }
      
      if (userRoleInfo.type === 'voter') {
        await handleVoterLogin(email, schoolId);
      } else {
        // For admin roles, we need to authenticate with password
        await handleAdminLogin(email, schoolId);
      }
      
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.message || "Error processing request");
      setIsLoading(false);
    }
  };

  const getButtonStyle = () => {
    if (isLoading) {
      return 'bg-gradient-to-r from-green-700 to-emerald-600';
    }
    return 'bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02140f] via-[#063d2e] to-[#0b2545] flex items-center justify-center p-4 relative overflow-hidden">

      <div className="absolute inset-0">
        <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-green-600 opacity-20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-yellow-500 opacity-20 blur-3xl rounded-full"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div 
          data-aos="fade-up"
          data-aos-duration="1000"
          className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8 transition-all duration-500 hover:shadow-[0_25px_80px_rgba(0,0,0,0.6)]"
        >

          <div className="flex justify-center gap-4 mb-4">
            <div data-aos="zoom-in" data-aos-delay="100">
              <Image 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png"
                width={60}
                height={60}
                alt="logo"
                className="object-contain"
              />
            </div>
            <div data-aos="zoom-in" data-aos-delay="200">
              <Image 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png"
                width={60}
                height={60}
                alt="logo"
                className="object-contain"
              />
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="300" className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">
              Regent E-Voting Portal
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Secure access to cast your vote
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            <div data-aos="fade-up" data-aos-delay="400" className="relative group">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-green-400 transition" />
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@regent\.edu\.gh$/i,
                    message: 'Only @regent.edu.gh emails allowed'
                  }
                })}
                type="email"
                placeholder="Enter your university email"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div data-aos="fade-up" data-aos-delay="500" className="relative group">
              <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-green-400 transition" />
              <input
                {...register('schoolId', {
                  required: 'School ID required',
                  pattern: {
                    value: /^[0-9]{8}$/,
                    message: 'Must be 8 digits'
                  }
                })}
                type="text"
                placeholder="Enter your School ID"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              />
              {errors.schoolId && <p className="text-red-400 text-xs mt-1">{errors.schoolId.message}</p>}
            </div>

            <div data-aos="fade-up" data-aos-delay="600">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${getButtonStyle()}`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaSpinner className="animate-spin" />
                    Verifying credentials...
                  </div>
                ) : (
                  "Login"
                )}
              </button>
            </div>
          </form>

          <div data-aos="fade-up" data-aos-delay="700" className="mt-6 text-xs text-white/60 text-center space-y-1">
            <p>🔐 Enter your email and school ID to login</p>
            <p>👥 Students, Deans, HODs, Electoral Commission, and IT Admins</p>
            <p className="text-yellow-400/60">⚠️ Passwords are your School ID for admin accounts</p>
          </div>

          <div data-aos="fade-up" data-aos-delay="800" className="mt-6 flex justify-center gap-3 text-xs text-white/40">
            <span>Secure</span>
            <span>•</span>
            <span>Encrypted</span>
            <span>•</span>
            <span>Audited</span>
          </div>

        </div>
      </div>
    </div>
  );
}