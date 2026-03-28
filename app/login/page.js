// app/login/page.js
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { FaEnvelope, FaIdCard, FaSpinner, FaCheckCircle, FaUserShield, FaUserGraduate } from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';
import { logOtpGeneration, getClientIP } from '@/utils/auditLog';
import { useAdminAuth } from '@/hooks/useAdminAuth'; // Add this import

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [clientIP, setClientIP] = useState('unknown');
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [userType, setUserType] = useState(null); // 'voter' or 'admin'
  const router = useRouter();
  const { login: adminLogin } = useAdminAuth(); // Add this line

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
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

  // Get client IP on mount
  useEffect(() => {
    const getIP = async () => {
      const ip = await getClientIP();
      setClientIP(ip);
    };
    getIP();
  }, []);

  // Check user type (admin or voter) when email/schoolId changes
  useEffect(() => {
    const checkUserType = async () => {
      if (watchedEmail && watchedSchoolId) {
        try {
          const cleanEmail = watchedEmail.toLowerCase().trim();
          const cleanSchoolId = watchedSchoolId.trim().padStart(8, '0');
          
          // First check if user is admin
          const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('email', cleanEmail)
            .eq('school_id', cleanSchoolId)
            .maybeSingle();

          if (admin && !adminError) {
            setUserType('admin');
            setAlreadyVoted(false);
            return;
          }

          // If not admin, check if voter exists
          const { data: voter, error: voterError } = await supabase
            .from('voters')
            .select('id, has_voted, voted_at, email, school_id, name')
            .eq('email', cleanEmail)
            .eq('school_id', cleanSchoolId)
            .maybeSingle();

          if (voter && !voterError) {
            setUserType('voter');
            
            // Check if voter has already voted
            let hasVoted = false;
            
            if (voter.has_voted === true) {
              hasVoted = true;
            } else {
              // Check votes table as fallback
              const { data: existingVote } = await supabase
                .from('votes')
                .select('id')
                .eq('voter_id', voter.id)
                .maybeSingle();
              
              hasVoted = !!existingVote;
              
              if (hasVoted && !voter.has_voted) {
                await supabase
                  .from('voters')
                  .update({ 
                    has_voted: true,
                    voted_at: new Date().toISOString()
                  })
                  .eq('id', voter.id);
              }
            }
            
            setAlreadyVoted(hasVoted);
            
            if (hasVoted) {
              localStorage.setItem('has_voted', 'true');
              localStorage.setItem('voted_voter_id', voter.id);
            }
          } else {
            setUserType(null);
            setAlreadyVoted(false);
          }
        } catch (error) {
          console.error('Error checking user type:', error);
          setUserType(null);
          setAlreadyVoted(false);
        }
      } else {
        setUserType(null);
        setAlreadyVoted(false);
      }
    };

    const timeoutId = setTimeout(() => {
      checkUserType();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedEmail, watchedSchoolId]);

  // Hash function for OTP
  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Handle admin login
  const handleAdminLogin = async (email, schoolId) => {
    try {
      const result = await adminLogin(email, schoolId);
      
      if (result.success) {
        toast.success('✅ Welcome Admin! Redirecting to admin panel...');
        setTimeout(() => {
          router.push('/admin/manage-voters');
        }, 1500);
      } else {
        toast.error(result.error || 'Invalid admin credentials');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('Error during admin login');
    }
  };

  // Generate and send OTP to voter email
  const sendOtpCode = async (email, schoolId) => {
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
        await logOtpGeneration({
          voter_id: null,
          email: email,
          ip_address: clientIP,
          success: false
        });
        throw new Error('Voter not found. Please check your email and school ID.');
      }

      // Check if voter has already voted
      if (voter.has_voted === true) {
        await logOtpGeneration({
          voter_id: voter.id,
          email: email,
          ip_address: clientIP,
          success: false,
          error: 'Already voted'
        });
        
        localStorage.setItem('has_voted', 'true');
        localStorage.setItem('voted_voter_id', voter.id);
        
        throw new Error('❌ You have already cast your vote. Voting is only allowed once per voter.');
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
        
        throw new Error('❌ You have already cast your vote. Voting is only allowed once per voter.');
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Hash the OTP before storing
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

      // Send OTP via Next.js API route
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

        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          result = { success: false, error: 'Invalid response from server' };
        }

        if (!response.ok || !result.success) {
          toast.info(`🔑 Test OTP: ${otpCode} (Check console for details)`);
        } else {
          toast.success(`✅ OTP sent to ${email}. Check your inbox.`);
        }
      } catch (emailError) {
        toast.info(`🔑 Test OTP: ${otpCode}`);
      }

      // Store voter info in localStorage for OTP verification page
      localStorage.setItem('temp_voter_email', cleanEmail);
      localStorage.setItem('temp_voter_school_id', cleanSchoolId);
      localStorage.setItem('temp_voter_id', voter.id);
      localStorage.setItem('temp_voter_name', voter.name);

      // Log successful OTP generation
      await logOtpGeneration({
        voter_id: voter.id,
        email: email,
        ip_address: clientIP,
        success: true
      });

      return { success: true, message: `OTP sent to ${email}. Valid for 10 minutes.` };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, error: error.message };
    }
  };

  // Main form submission handler
  const onSubmit = async (formData) => {
    setIsLoading(true);
    const { email, schoolId } = formData;

    try {
      // Check if user is admin
      if (userType === 'admin') {
        await handleAdminLogin(email, schoolId);
      } 
      // Check if user is voter
      else if (userType === 'voter') {
        if (alreadyVoted) {
          toast.error('❌ You have already voted. Voting is allowed only once per voter.', {
            position: "top-center",
            autoClose: 5000,
          });
          
          setTimeout(() => {
            router.push('/election-result');
          }, 3000);
          return;
        }
        
        const result = await sendOtpCode(email, schoolId);
        
        if (result.success) {
          setTimeout(() => {
            router.push("/verify-otp");
          }, 1500);
        } else {
          toast.error(result.error);
        }
      } 
      else {
        toast.error('❌ Invalid credentials. You are not registered as a voter or admin.');
      }
    } catch (err) {
      toast.error(err.message || "Error processing request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02140f] via-[#063d2e] to-[#0b2545] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Soft Glow Background */}
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

          {/* Logos */}
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

          {/* Title */}
          <div data-aos="fade-up" data-aos-delay="300" className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">
              Regent E-Voting Portal
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Secure access to cast your vote
            </p>
          </div>

          {/* User Type Indicator */}
          {userType && (
            <div data-aos="fade-up" data-aos-delay="350" className={`mb-4 p-3 rounded-xl ${
              userType === 'admin' 
                ? 'bg-purple-500/20 border border-purple-400/50' 
                : 'bg-blue-500/20 border border-blue-400/50'
            }`}>
              <div className="flex items-center gap-2">
                {userType === 'admin' ? (
                  <>
                    <FaUserShield className="text-purple-300" />
                    <p className="text-sm font-medium text-purple-200">Admin Access Detected</p>
                  </>
                ) : (
                  <>
                    <FaUserGraduate className="text-blue-300" />
                    <p className="text-sm font-medium text-blue-200">Voter Access Detected</p>
                  </>
                )}
              </div>
              {userType === 'voter' && alreadyVoted && (
                <p className="text-xs text-amber-200/80 mt-1">
                  You have already voted. Redirecting to results...
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
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
                className={`w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 transition ${
                  alreadyVoted && userType === 'voter'
                    ? 'border-amber-400/50 focus:ring-amber-400' 
                    : 'border-white/10 focus:ring-green-400'
                }`}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* School ID */}
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
                className={`w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 transition ${
                  alreadyVoted && userType === 'voter'
                    ? 'border-amber-400/50 focus:ring-amber-400' 
                    : 'border-white/10 focus:ring-green-400'
                }`}
              />
              {errors.schoolId && <p className="text-red-400 text-xs mt-1">{errors.schoolId.message}</p>}
            </div>

            {/* Button */}
            <div data-aos="fade-up" data-aos-delay="600">
              <button
                type="submit"
                disabled={isLoading || (userType === 'voter' && alreadyVoted)}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${
                  userType === 'admin'
                    ? 'bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500'
                    : alreadyVoted && userType === 'voter'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500 hover:shadow-green-500/30'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaSpinner className="animate-spin" />
                    Processing...
                  </div>
                ) : userType === 'admin' ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaUserShield />
                    Access Admin Panel
                  </div>
                ) : alreadyVoted && userType === 'voter' ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaCheckCircle />
                    Already Voted
                  </div>
                ) : (
                  "Send OTP"
                )}
              </button>
            </div>
          </form>

          {/* Info */}
          <div data-aos="fade-up" data-aos-delay="700" className="mt-6 text-xs text-white/60 text-center space-y-1">
            {userType === 'admin' ? (
              <>
                <p>🔐 Admin authentication required</p>
                <p>👑 Access to voter management system</p>
                <p>📊 View and manage election data</p>
              </>
            ) : userType === 'voter' && !alreadyVoted ? (
              <>
                <p>🔐 Secure OTP authentication</p>
                <p>⏳ Code valid for 10 minutes</p>
                <p>📧 Check spam if not received</p>
              </>
            ) : userType === 'voter' && alreadyVoted ? (
              <>
                <p>✅ Thank you for participating in the election</p>
                <p>📊 View results to see the outcome</p>
              </>
            ) : (
              <>
                <p>🔐 Enter your credentials to continue</p>
                <p>👥 Both voters and admins can log in here</p>
              </>
            )}
          </div>

          {/* Footer */}
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