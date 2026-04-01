// app/login/page.js - Updated to check user_roles table

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
  const router = useRouter();
  const { login: adminLogin } = useAdminAuth();

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

  useEffect(() => {
    const getIP = async () => {
      const ip = await getClientIP();
      setClientIP(ip);
    };
    getIP();
  }, []);

  // Check user type from both admins and user_roles tables
  useEffect(() => {
    const checkUserType = async () => {
      if (watchedEmail && watchedSchoolId) {
        try {
          const cleanEmail = watchedEmail.toLowerCase().trim();
          const cleanSchoolId = watchedSchoolId.trim().padStart(8, '0');
          
          // First check in user_roles table (for EC, Dean, HOD, IT Admin)
          const { data: roleUser, error: roleError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('email', cleanEmail)
            .eq('is_active', true)
            .maybeSingle();

          if (roleUser && !roleError) {
            const role = roleUser.role;
            setUserRoleDetails(roleUser);
            
            if (role === 'ec') {
              setUserType('electoral');
              setUserRole('electoral_commission');
            } else if (role === 'dean') {
              setUserType('dean');
              setUserRole('dean');
            } else if (role === 'hod') {
              setUserType('hod');
              setUserRole('hod');
            } else if (role === 'it_admin') {
              setUserType('it_admin');
              setUserRole('it_admin');
            }
            
            setAlreadyVoted(false);
            return;
          }
          
          // If not in user_roles, check in admins table
          const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('email', cleanEmail)
            .eq('school_id', cleanSchoolId)
            .maybeSingle();

          if (admin && !adminError) {
            const role = admin.role || 'admin';
            setUserRole(role);
            
            if (role === 'dean') {
              setUserType('dean');
            } else if (role === 'electoral_commission') {
              setUserType('electoral');
            } else if (role === 'it_admin') {
              setUserType('it_admin');
            } else {
              setUserType('admin');
            }
            
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
            setUserRole(null);
            
            let hasVoted = false;
            
            if (voter.has_voted === true) {
              hasVoted = true;
            } else {
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
            setUserRole(null);
            setUserRoleDetails(null);
            setAlreadyVoted(false);
          }
        } catch (error) {
          console.error('Error checking user type:', error);
          setUserType(null);
          setUserRole(null);
          setUserRoleDetails(null);
          setAlreadyVoted(false);
        }
      } else {
        setUserType(null);
        setUserRole(null);
        setUserRoleDetails(null);
        setAlreadyVoted(false);
      }
    };

    const timeoutId = setTimeout(() => {
      checkUserType();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedEmail, watchedSchoolId]);

  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Handle admin login - checks both admins and user_roles
  const handleAdminLogin = async (email, schoolId) => {
    setIsLoading(true);
    try {
      console.log('Attempting admin login...');
      
      const cleanEmail = email.toLowerCase().trim();
      const cleanSchoolId = schoolId.trim().padStart(8, '0');
      
      // First check user_roles table
      let role = null;
      let roleDetails = null;
      
      const { data: roleUser, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('is_active', true)
        .maybeSingle();
      
      if (roleUser && !roleError) {
        role = roleUser.role;
        roleDetails = roleUser;
      } else {
        // Check admins table
        const { data: admin, error: adminError } = await supabase
          .from('admins')
          .select('role')
          .eq('email', cleanEmail)
          .eq('school_id', cleanSchoolId)
          .maybeSingle();
        
        if (admin && !adminError) {
          role = admin.role || 'admin';
        }
      }
      
      // Use the existing working adminLogin function
      const result = await adminLogin(email, schoolId);
      console.log('Admin login result:', result);
      
      if (result.success) {
        // Store role in localStorage
        localStorage.setItem('user_role', role || 'admin');
        localStorage.setItem('user_email', email);
        
        if (roleDetails) {
          localStorage.setItem('user_role_details', JSON.stringify(roleDetails));
        }
        
        // Redirect based on role
        let redirectPath = '/admin/manage-voters';
        let welcomeMessage = '';
        
        switch (role) {
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
            redirectPath = '/admin/manage-voters';
            welcomeMessage = 'Welcome IT Admin! Redirecting to IT Admin Dashboard...';
            break;
          case 'hod':
            redirectPath = '/admin/hod-dashboard';
            welcomeMessage = 'Welcome Head of Department! Redirecting to HOD Dashboard...';
            break;
          default:
            redirectPath = '/admin';
            welcomeMessage = 'Welcome Admin! Redirecting to Admin Panel...';
        }
        
        toast.success(welcomeMessage);
        setTimeout(() => {
          router.push(redirectPath);
        }, 1500);
      } else {
        toast.error(result.error || 'Invalid admin credentials');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('Error during admin login');
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtpCode = async (email, schoolId) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanSchoolId = schoolId.trim().padStart(8, '0');

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

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await hashCode(otpCode);
      
      await supabase
        .from('otp_codes')
        .delete()
        .eq('voter_id', voter.id);
      
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

      return { success: true, message: `OTP sent to ${email}. Valid for 10 minutes.` };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, error: error.message };
    }
  };

  const getUserTypeDisplay = () => {
    switch (userType) {
      case 'dean':
        return {
          icon: <FaUniversity className="text-purple-300" />,
          title: 'Dean of Students',
          color: 'purple',
          message: 'Dean Access Detected'
        };
      case 'electoral':
        return {
          icon: <FaUserShield className="text-emerald-300" />,
          title: 'Electoral Commission',
          color: 'emerald',
          message: 'Electoral Commission Access Detected'
        };
      case 'it_admin':
        return {
          icon: <FaUserCog className="text-cyan-300" />,
          title: 'IT Administrator',
          color: 'cyan',
          message: 'IT Admin Access Detected'
        };
      case 'hod':
        return {
          icon: <FaChalkboardTeacher className="text-green-300" />,
          title: 'Head of Department',
          color: 'green',
          message: 'HOD Access Detected'
        };
      case 'admin':
        return {
          icon: <FaUserShield className="text-purple-300" />,
          title: 'System Administrator',
          color: 'purple',
          message: 'Admin Access Detected'
        };
      case 'voter':
        return {
          icon: <FaUserGraduate className="text-blue-300" />,
          title: 'Student Voter',
          color: 'blue',
          message: 'Voter Access Detected'
        };
      default:
        return null;
    }
  };

  const getButtonStyle = () => {
    switch (userType) {
      case 'dean':
        return 'bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500';
      case 'electoral':
        return 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500';
      case 'it_admin':
        return 'bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500';
      case 'hod':
        return 'bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500';
      case 'admin':
        return 'bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500';
      case 'voter':
        if (alreadyVoted) {
          return 'bg-gradient-to-r from-amber-600 to-amber-500 cursor-not-allowed';
        }
        return 'bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500';
      default:
        return 'bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500';
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center gap-2">
          <FaSpinner className="animate-spin" />
          Processing...
        </div>
      );
    }
    
    switch (userType) {
      case 'dean':
        return (
          <div className="flex items-center justify-center gap-2">
            <FaUniversity />
            Access Dean Dashboard
          </div>
        );
      case 'electoral':
        return (
          <div className="flex items-center justify-center gap-2">
            <FaUserShield />
            Access Electoral Dashboard
          </div>
        );
      case 'it_admin':
        return (
          <div className="flex items-center justify-center gap-2">
            <FaUserCog />
            Access IT Admin Dashboard
          </div>
        );
      case 'hod':
        return (
          <div className="flex items-center justify-center gap-2">
            <FaChalkboardTeacher />
            Access HOD Dashboard
          </div>
        );
      case 'admin':
        return (
          <div className="flex items-center justify-center gap-2">
            <FaUserShield />
            Access Admin Panel
          </div>
        );
      case 'voter':
        if (alreadyVoted) {
          return (
            <div className="flex items-center justify-center gap-2">
              <FaCheckCircle />
              Already Voted
            </div>
          );
        }
        return "Send OTP";
      default:
        return "Send OTP";
    }
  };

  const onSubmit = async (formData) => {
    setIsLoading(true);
    const { email, schoolId } = formData;

    try {
      if (userType === 'admin' || userType === 'dean' || userType === 'electoral' || userType === 'it_admin' || userType === 'hod') {
        await handleAdminLogin(email, schoolId);
      } 
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

  const userDisplay = getUserTypeDisplay();

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

          {userDisplay && (
            <div data-aos="fade-up" data-aos-delay="350" className={`mb-4 p-3 rounded-xl ${
              userType === 'dean' ? 'bg-purple-500/20 border border-purple-400/50' :
              userType === 'electoral' ? 'bg-emerald-500/20 border border-emerald-400/50' :
              userType === 'it_admin' ? 'bg-cyan-500/20 border border-cyan-400/50' :
              userType === 'hod' ? 'bg-green-500/20 border border-green-400/50' :
              userType === 'admin' ? 'bg-purple-500/20 border border-purple-400/50' :
              'bg-blue-500/20 border border-blue-400/50'
            }`}>
              <div className="flex items-center gap-2">
                {userDisplay.icon}
                <p className={`text-sm font-medium ${
                  userType === 'dean' ? 'text-purple-200' :
                  userType === 'electoral' ? 'text-emerald-200' :
                  userType === 'it_admin' ? 'text-cyan-200' :
                  userType === 'hod' ? 'text-green-200' :
                  userType === 'admin' ? 'text-purple-200' :
                  'text-blue-200'
                }`}>
                  {userDisplay.message}
                </p>
              </div>
              {userType === 'voter' && alreadyVoted && (
                <p className="text-xs text-amber-200/80 mt-1">
                  You have already voted. Redirecting to results...
                </p>
              )}
            </div>
          )}

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
                className={`w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 transition ${
                  alreadyVoted && userType === 'voter'
                    ? 'border-amber-400/50 focus:ring-amber-400' 
                    : 'border-white/10 focus:ring-green-400'
                }`}
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
                className={`w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 transition ${
                  alreadyVoted && userType === 'voter'
                    ? 'border-amber-400/50 focus:ring-amber-400' 
                    : 'border-white/10 focus:ring-green-400'
                }`}
              />
              {errors.schoolId && <p className="text-red-400 text-xs mt-1">{errors.schoolId.message}</p>}
            </div>

            <div data-aos="fade-up" data-aos-delay="600">
              <button
                type="submit"
                disabled={isLoading || (userType === 'voter' && alreadyVoted)}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${getButtonStyle()}`}
              >
                {getButtonText()}
              </button>
            </div>
          </form>

        

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