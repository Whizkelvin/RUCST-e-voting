
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { 
  FaEnvelope, 
  FaIdCard, 
  FaSpinner, 
  FaCheckCircle, 
  FaTimesCircle,
  FaUserShield,
  FaUserGraduate,
  FaUniversity,
  FaUserCog,
  FaChalkboardTeacher,
  FaSun,
  FaMoon
} from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';
import { logOtpGeneration, getClientIP } from '@/utils/auditLog';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [clientIP, setClientIP] = useState('unknown');
  const [loginStatus, setLoginStatus] = useState(null);
  const [voterStatus, setVoterStatus] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [theme, setTheme] = useState('dark');
  const router = useRouter();

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

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

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

  // Check user type when typing
  useEffect(() => {
    const checkUserType = async () => {
      if (watchedEmail && watchedSchoolId) {
        setLoginStatus('checking');
        
        try {
          const cleanEmail = watchedEmail.toLowerCase().trim();
          const cleanSchoolId = watchedSchoolId.trim().padStart(8, '0');
          
          const { data: voter, error: voterError } = await supabase
            .from('voters')
            .select('has_voted, voted_at')
            .eq('email', cleanEmail)
            .eq('school_id', cleanSchoolId)
            .maybeSingle();
          
          if (voter && !voterError) {
            setLoginStatus('voter');
            setVoterStatus(voter.has_voted ? 'already_voted' : 'can_vote');
            setAdminRole(null);
            return;
          }
          
          const { data: roleUser, error: roleError } = await supabase
            .from('user_roles')
            .select('role, is_active, name')
            .eq('email', cleanEmail)
            .eq('is_active', true)
            .maybeSingle();
          
          if (roleUser && !roleError) {
            setLoginStatus('admin');
            setAdminRole(roleUser.role);
            setVoterStatus(null);
            return;
          }
          
          const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('role')
            .eq('email', cleanEmail)
            .eq('school_id', cleanSchoolId)
            .maybeSingle();
          
          if (admin && !adminError) {
            setLoginStatus('admin');
            setAdminRole(admin.role || 'admin');
            setVoterStatus(null);
            return;
          }
          
          setLoginStatus('invalid');
          setAdminRole(null);
          setVoterStatus(null);
          
        } catch (error) {
          console.error('Error checking user type:', error);
          setLoginStatus('invalid');
        }
      } else {
        setLoginStatus(null);
        setAdminRole(null);
        setVoterStatus(null);
      }
    };
    
    const timeoutId = setTimeout(checkUserType, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedEmail, watchedSchoolId]);

  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleAdminLogin = async (email, schoolId) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanSchoolId = schoolId.trim().padStart(8, '0');
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanSchoolId
      });
      
      if (authError) {
        toast.error('❌ Invalid password. Please check your credentials.', {
          position: "top-center",
          autoClose: 3000
        });
        setIsLoading(false);
        return;
      }
      
      let userRole = null;
      let userDetails = null;
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('is_active', true)
        .maybeSingle();
      
      if (roleData && !roleError) {
        userRole = roleData.role;
        userDetails = roleData;
      } else {
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('email', cleanEmail)
          .eq('school_id', cleanSchoolId)
          .maybeSingle();
        
        if (adminData && !adminError) {
          userRole = adminData.role || 'admin';
          userDetails = adminData;
        }
      }
      
      if (!userRole) {
        toast.error('User authenticated but no role found. Please contact administrator.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }
      
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('user_email', cleanEmail);
      localStorage.setItem('user_id', authData.user.id);
      localStorage.setItem('is_authenticated', 'true');
      
      if (userDetails) {
        localStorage.setItem('user_details', JSON.stringify(userDetails));
      }
      
      let welcomeMessage = '';
      let redirectPath = '';
      
      switch (userRole) {
        case 'dean':
          welcomeMessage = '✅ Welcome Dean of Students! Redirecting to Dean Dashboard...';
          redirectPath = '/admin/dean-dashboard';
          break;
        case 'electoral_commission':
        case 'ec':
          welcomeMessage = '✅ Welcome Electoral Commissioner! Redirecting to Electoral Dashboard...';
          redirectPath = '/admin/electoral-commission-dashboard';
          break;
        case 'it_admin':
          welcomeMessage = '✅ Welcome IT Admin! Redirecting to IT Admin Dashboard...';
          redirectPath = '/admin/it-admin-dashboard';
          break;
        case 'hod':
          welcomeMessage = '✅ Welcome Head of Department! Redirecting to HOD Dashboard...';
          redirectPath = '/admin/hod-dashboard';
          break;
        default:
          welcomeMessage = '✅ Welcome Admin! Redirecting to Admin Panel...';
          redirectPath = '/admin/manage-voters';
      }
      
      toast.success(welcomeMessage, {
        position: "top-center",
        autoClose: 2000
      });
      
      setTimeout(() => {
        router.push(redirectPath);
      }, 2000);
      
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('Error during login: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoterLogin = async (email, schoolId) => {
    setIsLoading(true);
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
        toast.error('Voter not found. Please check your credentials.');
        setIsLoading(false);
        return;
      }
      
      if (voter.has_voted === true) {
        toast.error('❌ You have already voted. Redirecting to results page...', {
          position: "top-center",
          autoClose: 3000
        });
        setTimeout(() => {
          router.push('/election-result');
        }, 3000);
        setIsLoading(false);
        return;
      }
      
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('voter_id', voter.id)
        .maybeSingle();
      
      if (existingVote) {
        await supabase
          .from('voters')
          .update({ has_voted: true, voted_at: new Date().toISOString() })
          .eq('id', voter.id);
        
        toast.error('❌ You have already voted. Redirecting to results page...');
        setTimeout(() => {
          router.push('/election-result');
        }, 3000);
        setIsLoading(false);
        return;
      }
      
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await hashCode(otpCode);
      
      await supabase.from('otp_codes').delete().eq('voter_id', voter.id);
      
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            otp: otpCode,
            name: voter.name,
            expiresIn: 10
          }),
        });
        
        const result = await response.json();
        
        if (!result.success) {
          toast.info(`🔑 Test OTP: ${otpCode}`);
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
      
      toast.success('OTP sent! Redirecting to verification...');
      setTimeout(() => {
        router.push("/verify-otp");
      }, 1500);
      
    } catch (error) {
      console.error('Voter login error:', error);
      toast.error('Error during login: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (formData) => {
    const { email, schoolId } = formData;
    
    if (loginStatus === 'voter') {
      await handleVoterLogin(email, schoolId);
    } else if (loginStatus === 'admin') {
      await handleAdminLogin(email, schoolId);
    } else {
      toast.error('Invalid credentials. Please check your email and school ID.');
    }
  };

  const getRoleIcon = () => {
    switch (adminRole) {
      case 'dean': return <FaUniversity className="text-purple-400 text-lg" />;
      case 'electoral_commission':
      case 'ec': return <FaUserShield className="text-emerald-400 text-lg" />;
      case 'it_admin': return <FaUserCog className="text-cyan-400 text-lg" />;
      case 'hod': return <FaChalkboardTeacher className="text-green-400 text-lg" />;
      default: return <FaUserShield className="text-purple-400 text-lg" />;
    }
  };

  const getRoleName = () => {
    switch (adminRole) {
      case 'dean': return 'Dean of Students';
      case 'electoral_commission':
      case 'ec': return 'Electoral Commission';
      case 'it_admin': return 'IT Administrator';
      case 'hod': return 'Head of Department';
      default: return 'Administrator';
    }
  };

  // Theme-specific styles
  const themeStyles = {
    dark: {
      background: 'from-[#02140f] via-[#063d2e] to-[#0b2545]',
      cardBg: 'bg-white/10',
      cardBorder: 'border-white/20',
      textPrimary: 'text-white',
      textSecondary: 'text-white/70',
      inputBg: 'bg-white/5',
      inputBorder: 'border-white/10',
      inputFocus: 'focus:ring-green-400',
      placeholder: 'placeholder-white/40',
      statusCard: {
        checking: 'bg-blue-500/20 border-blue-400/50',
        voter: 'bg-blue-500/20 border-blue-400/50',
        admin: {
          dean: 'bg-purple-500/20 border-purple-400/50',
          electoral: 'bg-emerald-500/20 border-emerald-400/50',
          it_admin: 'bg-cyan-500/20 border-cyan-400/50',
          hod: 'bg-green-500/20 border-green-400/50',
          default: 'bg-purple-500/20 border-purple-400/50'
        },
        invalid: 'bg-red-500/20 border-red-400/50'
      }
    },
    light: {
      background: 'from-blue-50 via-white to-gray-100',
      cardBg: 'bg-white/80',
      cardBorder: 'border-gray-200',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-600',
      inputBg: 'bg-white',
      inputBorder: 'border-gray-300',
      inputFocus: 'focus:ring-green-500',
      placeholder: 'placeholder-gray-400',
      statusCard: {
        checking: 'bg-blue-100 border-blue-300',
        voter: 'bg-blue-100 border-blue-300',
        admin: {
          dean: 'bg-purple-100 border-purple-300',
          electoral: 'bg-emerald-100 border-emerald-300',
          it_admin: 'bg-cyan-100 border-cyan-300',
          hod: 'bg-green-100 border-green-300',
          default: 'bg-purple-100 border-purple-300'
        },
        invalid: 'bg-red-100 border-red-300'
      }
    }
  };

  const currentTheme = themeStyles[theme];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300`}>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className={`absolute top-[-100px] right-[-100px] w-[300px] h-[300px] ${theme === 'dark' ? 'bg-green-600' : 'bg-green-400'} opacity-20 blur-3xl rounded-full`}></div>
        <div className={`absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] ${theme === 'dark' ? 'bg-yellow-500' : 'bg-yellow-400'} opacity-20 blur-3xl rounded-full`}></div>
      </div>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <FaSun className="text-yellow-400 text-xl" />
        ) : (
          <FaMoon className="text-gray-700 text-xl" />
        )}
      </button>

      <div className="relative w-full max-w-md">
        <div 
          data-aos="fade-up" 
          className={`backdrop-blur-2xl ${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8 transition-all duration-300`}
        >
          
          {/* Logos */}
          <div className="flex justify-center gap-4 mb-4">
            <Image 
              src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png"
              width={60}
              height={60}
              alt="logo"
              className="object-contain"
            />
            <Image 
              src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png"
              width={60}
              height={60}
              alt="logo"
              className="object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className={`text-2xl font-bold ${currentTheme.textPrimary}`}>Regent E-Voting Portal</h1>
            <p className={`text-sm ${currentTheme.textSecondary} mt-1`}>Secure access to cast your vote</p>
          </div>

          {/* User Type Status Card */}
          {loginStatus === 'checking' && (
            <div className={`mb-4 p-3 rounded-xl ${currentTheme.statusCard.checking}`}>
              <div className="flex items-center gap-2">
                <FaSpinner className={`animate-spin ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Checking credentials...</p>
              </div>
            </div>
          )}

          {loginStatus === 'voter' && (
            <div className={`mb-4 p-3 rounded-xl ${currentTheme.statusCard.voter}`}>
              <div className="flex items-center gap-2">
                <FaUserGraduate className={theme === 'dark' ? 'text-blue-300' : 'text-blue-600'} />
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Student Voter Detected</p>
              </div>
              {voterStatus === 'can_vote' && (
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`}>✓ You are eligible to vote. OTP will be sent to your email.</p>
              )}
              {voterStatus === 'already_voted' && (
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-600'}`}>⚠️ You have already voted. You will be redirected to results.</p>
              )}
            </div>
          )}

          {loginStatus === 'admin' && (
            <div className={`mb-4 p-3 rounded-xl ${
              adminRole === 'dean' ? currentTheme.statusCard.admin.dean :
              adminRole === 'electoral_commission' || adminRole === 'ec' ? currentTheme.statusCard.admin.electoral :
              adminRole === 'it_admin' ? currentTheme.statusCard.admin.it_admin :
              adminRole === 'hod' ? currentTheme.statusCard.admin.hod :
              currentTheme.statusCard.admin.default
            }`}>
              <div className="flex items-center gap-2">
                {getRoleIcon()}
                <p className={`text-sm font-medium ${
                  adminRole === 'dean' ? (theme === 'dark' ? 'text-purple-200' : 'text-purple-700') :
                  adminRole === 'electoral_commission' || adminRole === 'ec' ? (theme === 'dark' ? 'text-emerald-200' : 'text-emerald-700') :
                  adminRole === 'it_admin' ? (theme === 'dark' ? 'text-cyan-200' : 'text-cyan-700') :
                  adminRole === 'hod' ? (theme === 'dark' ? 'text-green-200' : 'text-green-700') :
                  (theme === 'dark' ? 'text-purple-200' : 'text-purple-700')
                }`}>
                  {getRoleName()} Detected
                </p>
              </div>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>✓ Please enter your password (School ID) to login.</p>
            </div>
          )}

          {loginStatus === 'invalid' && (
            <div className={`mb-4 p-3 rounded-xl ${currentTheme.statusCard.invalid}`}>
              <div className="flex items-center gap-2">
                <FaTimesCircle className={theme === 'dark' ? 'text-red-300' : 'text-red-600'} />
                <p className={`text-sm ${theme === 'dark' ? 'text-red-200' : 'text-red-700'}`}>Invalid credentials. Please check your email and school ID.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <div className="relative group">
              <FaEnvelope className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-white/50 group-focus-within:text-green-400' : 'text-gray-400 group-focus-within:text-green-500'} transition`} />
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
                className={`w-full pl-10 pr-4 py-3 ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl ${currentTheme.textPrimary} ${currentTheme.placeholder} focus:outline-none focus:ring-2 ${currentTheme.inputFocus} transition`}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* School ID Field */}
            <div className="relative group">
              <FaIdCard className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-white/50 group-focus-within:text-green-400' : 'text-gray-400 group-focus-within:text-green-500'} transition`} />
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
                className={`w-full pl-10 pr-4 py-3 ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl ${currentTheme.textPrimary} ${currentTheme.placeholder} focus:outline-none focus:ring-2 ${currentTheme.inputFocus} transition`}
              />
              {errors.schoolId && <p className="text-red-400 text-xs mt-1">{errors.schoolId.message}</p>}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || loginStatus === 'invalid' || (loginStatus === 'voter' && voterStatus === 'already_voted')}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${
                loginStatus === 'admin' 
                  ? 'bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500'
                  : loginStatus === 'voter'
                  ? 'bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500'
                  : theme === 'dark'
                  ? 'bg-gradient-to-r from-gray-700 to-gray-600'
                  : 'bg-gradient-to-r from-gray-500 to-gray-400'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin" />
                  Processing...
                </div>
              ) : loginStatus === 'admin' ? (
                <div className="flex items-center justify-center gap-2">
                  {getRoleIcon()} Login as {getRoleName()}
                </div>
              ) : loginStatus === 'voter' && voterStatus === 'already_voted' ? (
                <div className="flex items-center justify-center gap-2">
                  <FaCheckCircle /> Already Voted
                </div>
              ) : loginStatus === 'voter' ? (
                "Send OTP"
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Info Footer */}
          <div className={`mt-6 text-xs ${currentTheme.textSecondary} text-center space-y-1`}>
            <p>🔐 Enter your email and school ID to login</p>
            <p>👥 Students: OTP will be sent to your email</p>
            <p>👑 Staff/Admin: Use your School ID as password</p>
          </div>

          <div className={`mt-4 flex justify-center gap-3 text-xs ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
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