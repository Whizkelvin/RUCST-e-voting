'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  FaMoon,
  FaShieldAlt,
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';
import { logOtpGeneration, getClientIP } from '@/utils/auditLog';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingRole, setIsDetectingRole] = useState(false);
  const [clientIP, setClientIP] = useState('unknown');
  const [loginStatus, setLoginStatus] = useState(null);
  const [voterStatus, setVoterStatus] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const formRef = useRef(null);
  const router = useRouter();

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

  // Role configuration (built-in)
  const getRoleConfig = useCallback((role) => {
    const roleMap = {
      dean: {
        name: 'Dean of Students',
        icon: FaUniversity,
        redirectPath: '/admin/dean-dashboard',
        color: 'purple',
        colorClass: {
          dark: 'purple',
          light: 'purple'
        }
      },
      electoral_commission: {
        name: 'Electoral Commission',
        icon: FaUserShield,
        redirectPath: '/admin/electoral-commission-dashboard',
        color: 'emerald',
        colorClass: {
          dark: 'emerald',
          light: 'emerald'
        }
      },
      ec: {
        name: 'Electoral Commission',
        icon: FaUserShield,
        redirectPath: '/admin/electoral-commission-dashboard',
        color: 'emerald',
        colorClass: {
          dark: 'emerald',
          light: 'emerald'
        }
      },
      admin: {
        name: 'IT Administrator',
        icon: FaUserCog,
        redirectPath: '/admin/manage-voters',
        color: 'cyan',
        colorClass: {
          dark: 'cyan',
          light: 'cyan'
        }
      },
      hod: {
        name: 'Head of Department',
        icon: FaChalkboardTeacher,
        redirectPath: '/admin/hod-dashboard',
        color: 'green',
        colorClass: {
          dark: 'green',
          light: 'green'
        }
      }
    };
    
    return roleMap[role] || null;
  }, []);

  // Get redirect path based on role
  const getRedirectPath = useCallback((role) => {
    const roleConfig = getRoleConfig(role);
    if (roleConfig) {
      return roleConfig.redirectPath;
    }
    return '/admin/manage-voters';
  }, [getRoleConfig]);

  // Get role icon
  const getRoleIcon = useCallback(() => {
    const roleConfig = getRoleConfig(adminRole);
    if (roleConfig) {
      const IconComponent = roleConfig.icon;
      return <IconComponent className={`text-${roleConfig.color}-400 text-lg`} />;
    }
    return <FaUserShield className="text-purple-400 text-lg" />;
  }, [adminRole, getRoleConfig]);

  // Get role name
  const getRoleName = useCallback(() => {
    const roleConfig = getRoleConfig(adminRole);
    return roleConfig ? roleConfig.name : 'Administrator';
  }, [adminRole, getRoleConfig]);

  // Get role color class
  const getRoleColorClass = useCallback((type = 'bg') => {
    const roleConfig = getRoleConfig(adminRole);
    const color = roleConfig ? roleConfig.color : 'purple';
    
    switch(type) {
      case 'bg':
        return `bg-${color}-500/20`;
      case 'border':
        return `border-${color}-400/50`;
      case 'text':
        return `text-${color}-200`;
      case 'text-dark':
        return `text-${color}-700`;
      default:
        return '';
    }
  }, [adminRole, getRoleConfig]);

  // Check rate limit
  const checkRateLimit = useCallback(() => {
    if (lockoutUntil && new Date() < new Date(lockoutUntil)) {
      const remainingMinutes = Math.ceil((new Date(lockoutUntil) - new Date()) / 60000);
      toast.error(`Too many attempts. Try again in ${remainingMinutes} minute(s).`, {
        position: "top-center",
        autoClose: 5000
      });
      return false;
    }
    
    if (loginAttempts >= 5) {
      const lockoutTime = new Date(Date.now() + 15 * 60000);
      setLockoutUntil(lockoutTime);
      toast.error('Too many failed attempts. Account locked for 15 minutes.', {
        position: "top-center",
        autoClose: 5000
      });
      return false;
    }
    
    return true;
  }, [loginAttempts, lockoutUntil]);

  // Check existing session
  useEffect(() => {
    const checkExistingSession = async () => {
      const isAuthenticated = localStorage.getItem('is_authenticated');
      const userRole = localStorage.getItem('user_role');
      const userEmail = localStorage.getItem('user_email');
      const lastActivity = localStorage.getItem('last_activity');
      
      // Check session timeout (30 minutes)
      if (lastActivity) {
        const inactiveTime = Date.now() - parseInt(lastActivity);
        if (inactiveTime > 30 * 60 * 1000) {
          localStorage.removeItem('is_authenticated');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_details');
          localStorage.removeItem('last_activity');
          toast.info('Session expired. Please login again.');
          return;
        }
      }
      
      if (isAuthenticated === 'true' && userRole && userEmail) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const redirectPath = getRedirectPath(userRole);
          router.push(redirectPath);
        } else {
          localStorage.removeItem('is_authenticated');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_details');
          localStorage.removeItem('last_activity');
        }
      }
    };
    
    checkExistingSession();
  }, [router, getRedirectPath]);

  // Update last activity
  useEffect(() => {
    const updateActivity = () => {
      if (localStorage.getItem('is_authenticated') === 'true') {
        localStorage.setItem('last_activity', Date.now().toString());
      }
    };
    
    window.addEventListener('click', updateActivity);
    window.addEventListener('keypress', updateActivity);
    
    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keypress', updateActivity);
    };
  }, []);

  // Theme management
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [theme]);

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
        setIsDetectingRole(true);
        
        try {
          const cleanEmail = watchedEmail.toLowerCase().trim();
          const cleanSchoolId = watchedSchoolId.trim().padStart(8, '0');
          
          // Check voter
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
            setIsDetectingRole(false);
            return;
          }
          
          // Check user roles
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
            setIsDetectingRole(false);
            return;
          }
          
          // Check admins
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
            setIsDetectingRole(false);
            return;
          }
          
          setLoginStatus('invalid');
          setAdminRole(null);
          setVoterStatus(null);
          
        } catch (error) {
          console.error('Error checking user type:', error);
          setLoginStatus('invalid');
        } finally {
          setIsDetectingRole(false);
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

  const hashCode = useCallback(async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  const handleAdminLogin = useCallback(async (email, schoolId) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanSchoolId = schoolId.trim().padStart(8, '0');
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanSchoolId
      });
      
      if (authError) {
        setLoginAttempts(prev => prev + 1);
        
        if (authError.message === 'Invalid login credentials') {
          toast.error('❌ Invalid School ID. Please check your credentials.', {
            position: "top-center",
            autoClose: 3000
          });
        } else if (authError.message === 'Email not confirmed') {
          toast.error('❌ Email not confirmed. Please check your inbox for verification link.', {
            position: "top-center",
            autoClose: 3000
          });
        } else {
          toast.error('❌ Authentication failed: ' + authError.message, {
            position: "top-center",
            autoClose: 3000
          });
        }
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
        toast.error('User authenticated but no role found. Please contact administrator.', {
          position: "top-center",
          autoClose: 3000
        });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }
      
      // Store session data
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('user_email', cleanEmail);
      localStorage.setItem('user_id', authData.user.id);
      localStorage.setItem('is_authenticated', 'true');
      localStorage.setItem('last_activity', Date.now().toString());
      
      if (userDetails) {
        localStorage.setItem('user_details', JSON.stringify(userDetails));
      }
      
      const roleConfig = getRoleConfig(userRole);
      const welcomeMessage = roleConfig 
        ? `✅ Welcome ${roleConfig.name}! Redirecting to dashboard...`
        : '✅ Welcome Admin! Redirecting to Admin Panel...';
      const redirectPath = roleConfig ? roleConfig.redirectPath : '/admin/manage-voters';
      
      toast.success(welcomeMessage, {
        position: "top-center",
        autoClose: 2000
      });
      
      setLoginAttempts(0);
      setLockoutUntil(null);
      
      setTimeout(() => {
        router.push(redirectPath);
      }, 2000);
      
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('System error. Please try again later.', {
        position: "top-center",
        autoClose: 3000
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, setLoginAttempts, getRoleConfig]);

  const handleVoterLogin = useCallback(async (email, schoolId) => {
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
        setLoginAttempts(prev => prev + 1);
        toast.error('Voter not found. Please check your credentials.', {
          position: "top-center",
          autoClose: 3000
        });
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
          toast.info(`🔑 Development OTP: ${otpCode} (Check console for email details)`, {
            position: "top-center",
            autoClose: 10000,
          });
          console.log('OTP for testing:', otpCode);
        } else {
          toast.success(`✅ OTP sent to ${email}. Check your inbox.`, {
            position: "top-center",
            autoClose: 3000
          });
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        toast.info(`🔑 Development OTP: ${otpCode} (Email service temporarily unavailable)`, {
          position: "top-center",
          autoClose: 10000,
        });
      }
      
      localStorage.setItem('temp_voter_email', cleanEmail);
      localStorage.setItem('temp_voter_school_id', cleanSchoolId);
      localStorage.setItem('temp_voter_id', voter.id);
      localStorage.setItem('temp_voter_name', voter.name);
      localStorage.setItem('temp_voter_expiry', (Date.now() + 10 * 60 * 1000).toString());
      
      await logOtpGeneration({
        voter_id: voter.id,
        email: email,
        ip_address: clientIP,
        success: true
      });
      
      toast.success('OTP sent! Redirecting to verification...', {
        position: "top-center",
        autoClose: 1500
      });
      
      setTimeout(() => {
        router.push("/verify-otp");
      }, 1500);
      
    } catch (error) {
      console.error('Voter login error:', error);
      toast.error('Error during login: ' + error.message, {
        position: "top-center",
        autoClose: 3000
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, hashCode, clientIP]);

  const onSubmit = useCallback(async (formData) => {
    if (!checkRateLimit()) return;
    
    const { email, schoolId } = formData;
    
    try {
      if (loginStatus === 'voter') {
        await handleVoterLogin(email, schoolId);
      } else if (loginStatus === 'admin') {
        await handleAdminLogin(email, schoolId);
      } else {
        setLoginAttempts(prev => prev + 1);
        toast.error('Invalid credentials. Please check your email and school ID.', {
          position: "top-center",
          autoClose: 3000
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginAttempts(prev => prev + 1);
    }
  }, [loginStatus, handleVoterLogin, handleAdminLogin, checkRateLimit, setLoginAttempts]);

  // Keyboard shortcut for testing (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        if (process.env.NODE_ENV === 'development') {
          setValue('email', 'test@regent.edu.gh');
          setValue('schoolId', '12345678');
          toast.info('Test credentials filled', {
            position: "top-center",
            autoClose: 2000
          });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setValue]);

  const themeStyles = useMemo(() => ({
    dark: {
      background: 'from-[#02140f] via-[#063d2e] to-[#0b2545]',
      cardBg: 'bg-white/10 backdrop-blur-2xl',
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
      cardBg: 'bg-white/80 backdrop-blur-2xl',
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
  }), []);

  const currentTheme = themeStyles[theme];

  // Get admin status card class
  const getAdminStatusClass = useCallback(() => {
    switch(adminRole) {
      case 'dean': return currentTheme.statusCard.admin.dean;
      case 'electoral_commission':
      case 'ec': return currentTheme.statusCard.admin.electoral;
      case 'it_admin': return currentTheme.statusCard.admin.it_admin;
      case 'hod': return currentTheme.statusCard.admin.hod;
      default: return currentTheme.statusCard.admin.default;
    }
  }, [adminRole, currentTheme]);

  // Get admin text color
  const getAdminTextColor = useCallback(() => {
    switch(adminRole) {
      case 'dean': return theme === 'dark' ? 'text-purple-200' : 'text-purple-700';
      case 'electoral_commission':
      case 'ec': return theme === 'dark' ? 'text-emerald-200' : 'text-emerald-700';
      case 'it_admin': return theme === 'dark' ? 'text-cyan-200' : 'text-cyan-700';
      case 'hod': return theme === 'dark' ? 'text-green-200' : 'text-green-700';
      default: return theme === 'dark' ? 'text-purple-200' : 'text-purple-700';
    }
  }, [adminRole, theme]);

  if (!mounted) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300`}>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className={`absolute top-[-100px] right-[-100px] w-[300px] h-[300px] ${theme === 'dark' ? 'bg-green-600' : 'bg-green-400'} opacity-20 blur-3xl rounded-full animate-pulse`}></div>
        <div className={`absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] ${theme === 'dark' ? 'bg-yellow-500' : 'bg-yellow-400'} opacity-20 blur-3xl rounded-full animate-pulse delay-1000`}></div>
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
          className={`${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8 transition-all duration-300`}
        >
          
          {/* Logos */}
          <div className="flex justify-center gap-4 mb-4">
            <Image 
              src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png"
              width={60}
              height={60}
              alt="Regent University Logo"
              className="object-contain"
            />
            <Image 
              src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png"
              width={60}
              height={60}
              alt="E-Voting Logo"
              className="object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className={`text-2xl font-bold ${currentTheme.textPrimary}`}>Regent E-Voting Portal</h1>
            <p className={`text-sm ${currentTheme.textSecondary} mt-1`}>Secure access to cast your vote</p>
          </div>

          {/* Rate Limit Warning */}
          {loginAttempts > 3 && loginAttempts < 5 && (
            <div className="mb-4 p-3 rounded-xl bg-yellow-500/20 border border-yellow-400/50">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-yellow-400" />
                <p className="text-sm text-yellow-200">
                  Warning: {5 - loginAttempts} attempts remaining before 15-minute lockout
                </p>
              </div>
            </div>
          )}

          {lockoutUntil && new Date() < new Date(lockoutUntil) && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/50">
              <div className="flex items-center gap-2">
                <FaClock className="text-red-400 animate-pulse" />
                <p className="text-sm text-red-200">
                  Account temporarily locked. Please try again later.
                </p>
              </div>
            </div>
          )}

          {/* User Type Status Card */}
          {isDetectingRole && (
            <div className={`mb-4 p-3 rounded-xl ${currentTheme.statusCard.checking}`}>
              <div className="flex items-center gap-2">
                <FaSpinner className="animate-spin" />
                <p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                  Validating credentials...
                </p>
              </div>
            </div>
          )}

          {loginStatus === 'voter' && !isDetectingRole && (
            <div className={`mb-4 p-3 rounded-xl ${currentTheme.statusCard.voter}`}>
              <div className="flex items-center gap-2">
                <FaUserGraduate className={theme === 'dark' ? 'text-blue-300' : 'text-blue-600'} />
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                  Student Voter Detected
                </p>
              </div>
              {voterStatus === 'can_vote' && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`}>
                  <FaCheckCircle className="text-xs" /> You are eligible to vote. OTP will be sent to your email.
                </p>
              )}
              {voterStatus === 'already_voted' && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-600'}`}>
                  <FaExclamationTriangle className="text-xs" /> You have already voted. You will be redirected to results.
                </p>
              )}
            </div>
          )}

          {loginStatus === 'admin' && !isDetectingRole && (
            <div className={`mb-4 p-3 rounded-xl ${getAdminStatusClass()}`}>
              <div className="flex items-center gap-2">
                {getRoleIcon()}
                <p className={`text-sm font-medium ${getAdminTextColor()}`}>
                  {getRoleName()} Detected
                </p>
              </div>
              <p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                <FaShieldAlt className="text-xs" /> Please enter your password (School ID) to login.
              </p>
            </div>
          )}

          {loginStatus === 'invalid' && !isDetectingRole && (
            <div className={`mb-4 p-3 rounded-xl ${currentTheme.statusCard.invalid}`}>
              <div className="flex items-center gap-2">
                <FaTimesCircle className={theme === 'dark' ? 'text-red-300' : 'text-red-600'} />
                <p className={`text-sm ${theme === 'dark' ? 'text-red-200' : 'text-red-700'}`}>
                  Invalid credentials. Please check your email and school ID.
                </p>
              </div>
            </div>
          )}

          <form 
            ref={formRef}
            onSubmit={handleSubmit(onSubmit)} 
            className="space-y-5"
            autoComplete="off"
          >
            <input type="hidden" autoComplete="false" />
            
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
                autoComplete="off"
                className={`w-full pl-10 pr-4 py-3 ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl ${currentTheme.textPrimary} ${currentTheme.placeholder} focus:outline-none focus:ring-2 ${currentTheme.inputFocus} transition`}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <FaExclamationTriangle className="text-xs" /> {errors.email.message}
                </p>
              )}
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
                placeholder="Enter your School ID (8 digits)"
                autoComplete="off"
                className={`w-full pl-10 pr-4 py-3 ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl ${currentTheme.textPrimary} ${currentTheme.placeholder} focus:outline-none focus:ring-2 ${currentTheme.inputFocus} transition`}
                disabled={isLoading}
              />
              {errors.schoolId && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <FaExclamationTriangle className="text-xs" /> {errors.schoolId.message}
                </p>
              )}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || loginStatus === 'invalid' || (loginStatus === 'voter' && voterStatus === 'already_voted') || (lockoutUntil && new Date() < new Date(lockoutUntil))}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${
                loginStatus === 'admin' 
                  ? 'bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500'
                  : loginStatus === 'voter' && voterStatus !== 'already_voted'
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
            {process.env.NODE_ENV === 'development' && (
              <p className="text-yellow-400 text-xs mt-2">
                💡 Dev: Press Ctrl+Shift+D to fill test credentials
              </p>
            )}
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