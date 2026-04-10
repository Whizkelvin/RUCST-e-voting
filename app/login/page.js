'use client';

import { Suspense } from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { Toaster, toast } from 'sonner';
import Link from 'next/link';
import { 
  FaEnvelope, FaIdCard, FaSpinner, FaCheckCircle, FaTimesCircle,
  FaUserShield, FaUserGraduate, FaUniversity, FaUserCog, FaChalkboardTeacher,
  FaSun, FaMoon, FaShieldAlt, FaClock, FaExclamationTriangle, FaHome
} from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';
import { logOtpGeneration, getClientIP } from '@/utils/auditLog';

// Create a separate component that uses useSearchParams
function LoginContent() {
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
  const [votingStatus, setVotingStatus] = useState({
    isActive: false,
    hasStarted: false,
    hasEnded: false,
    message: '',
    startDate: null,
    endDate: null,
    timeRemaining: ''
  });
  const formRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/admin/manage-voters';

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    mode: 'onChange',
    defaultValues: { email: '', schoolId: '' }
  });

  const watchedEmail = watch('email');
  const watchedSchoolId = watch('schoolId');

  // Helper functions
  const setAuthCookies = useCallback((isAuthenticated, userRole, userEmail, userId = null) => {
    const maxAge = 30 * 60;
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = `path=/; max-age=${maxAge}; SameSite=Strict${isProduction ? '; Secure; HttpOnly' : ''}`;
    document.cookie = `is_authenticated=${isAuthenticated}; ${cookieOptions}`;
    document.cookie = `user_role=${userRole}; ${cookieOptions}`;
    document.cookie = `user_email=${encodeURIComponent(userEmail)}; ${cookieOptions}`;
    if (userId) document.cookie = `user_id=${userId}; ${cookieOptions}`;
    localStorage.setItem('is_authenticated', isAuthenticated);
    localStorage.setItem('user_role', userRole);
    localStorage.setItem('user_email', userEmail);
    if (userId) localStorage.setItem('user_id', userId);
    localStorage.setItem('last_activity', Date.now().toString());
  }, []);

  const clearAuthCookies = useCallback(() => {
    const cookieOptions = 'path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = `is_authenticated=; ${cookieOptions}`;
    document.cookie = `user_role=; ${cookieOptions}`;
    document.cookie = `user_email=; ${cookieOptions}`;
    document.cookie = `user_id=; ${cookieOptions}`;
    localStorage.removeItem('is_authenticated');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_details');
    localStorage.removeItem('last_activity');
  }, []);

  const getRoleConfig = useCallback((role) => {
    const roleMap = {
      dean: { name: 'Dean of Students', icon: FaUniversity, redirectPath: '/admin/dean-dashboard', color: 'purple' },
      electoral_commission: { name: 'Electoral Commission', icon: FaUserShield, redirectPath: '/admin/electoral-commission-dashboard', color: 'emerald' },
      ec: { name: 'Electoral Commission', icon: FaUserShield, redirectPath: '/admin/electoral-commission-dashboard', color: 'emerald' },
      admin: { name: 'Admin', icon: FaUserCog, redirectPath: '/admin/manage-voters', color: 'cyan' },
      hod: { name: 'Head of Department', icon: FaChalkboardTeacher, redirectPath: '/admin/hod-dashboard', color: 'green' }
    };
    return roleMap[role] || null;
  }, []);

  const getRedirectPath = useCallback((role) => getRoleConfig(role)?.redirectPath || '/admin/manage-voters', [getRoleConfig]);
  const getRoleIcon = useCallback(() => { const config = getRoleConfig(adminRole); return config ? <config.icon className={`text-${config.color}-400 text-lg`} /> : <FaUserShield className="text-purple-400 text-lg" />; }, [adminRole, getRoleConfig]);
  const getRoleName = useCallback(() => getRoleConfig(adminRole)?.name || 'Administrator', [adminRole, getRoleConfig]);

  const checkRateLimit = useCallback(async (identifier, type = 'login') => {
    if (lockoutUntil && new Date() < new Date(lockoutUntil)) {
      const remainingMinutes = Math.ceil((new Date(lockoutUntil) - new Date()) / 60000);
      toast.error(`Too many attempts. Try again in ${remainingMinutes} minute(s).`);
      return false;
    }
    if (loginAttempts >= 5) {
      const lockoutTime = new Date(Date.now() + 15 * 60000);
      setLockoutUntil(lockoutTime);
      toast.error('Too many failed attempts. Account locked for 15 minutes.');
      return false;
    }
    return true;
  }, [loginAttempts, lockoutUntil]);

  const checkVotingPeriod = useCallback(async () => {
    try {
      const { data: settings, error } = await supabase.from('voting_periods').select('is_active, start_date, end_date').single();
      if (error) throw error;
      const now = new Date();
      const startDate = new Date(settings.start_date);
      const endDate = new Date(settings.end_date);
      const hasStarted = now >= startDate;
      const hasEnded = now > endDate;
      const isActive = settings.is_active === true && hasStarted && !hasEnded;
      let message = '';
      let timeRemaining = '';
      if (!settings.is_active) message = 'Voting is currently disabled by the Electoral Commission.';
      else if (!hasStarted) message = `Voting starts on ${startDate.toLocaleString()}`;
      else if (hasEnded) message = 'Voting period has ended. View results below.';
      else if (settings.is_active && hasStarted && !hasEnded) {
        const timeLeft = endDate - now;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        timeRemaining = `${hours}h ${minutes}m`;
        message = `Voting is active! Ends in ${timeRemaining}`;
      }
      setVotingStatus({ isActive, hasStarted, hasEnded, message, startDate: settings.start_date, endDate: settings.end_date, timeRemaining });
    } catch (error) { console.error('Error checking voting period:', error); }
  }, []);

  useEffect(() => { checkVotingPeriod(); const interval = setInterval(checkVotingPeriod, 60000); return () => clearInterval(interval); }, [checkVotingPeriod]);

  // Check existing session
  useEffect(() => {
    const checkExistingSession = async () => {
      const isAuthenticated = localStorage.getItem('is_authenticated');
      const userRole = localStorage.getItem('user_role');
      const userEmail = localStorage.getItem('user_email');
      const lastActivity = localStorage.getItem('last_activity');
      if (lastActivity && (Date.now() - parseInt(lastActivity)) > 30 * 60 * 1000) { clearAuthCookies(); toast.info('Session expired. Please login again.'); return; }
      if (isAuthenticated === 'true' && userRole && userEmail) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { setAuthCookies(true, userRole, userEmail); router.push(getRedirectPath(userRole)); }
        else clearAuthCookies();
      }
    };
    checkExistingSession();
  }, [router, getRedirectPath, setAuthCookies, clearAuthCookies]);

  // Theme
  useEffect(() => { setMounted(true); const savedTheme = localStorage.getItem('theme') || 'dark'; setTheme(savedTheme); document.documentElement.setAttribute('data-theme', savedTheme); }, []);
  const toggleTheme = useCallback(() => { const newTheme = theme === 'dark' ? 'light' : 'dark'; setTheme(newTheme); localStorage.setItem('theme', newTheme); document.documentElement.setAttribute('data-theme', newTheme); }, [theme]);
  useEffect(() => { AOS.init({ duration: 1000, once: true }); }, []);
  useEffect(() => { getClientIP().then(ip => setClientIP(ip)); }, []);

  // Check user type
  useEffect(() => {
    const checkUserType = async () => {
      if (watchedEmail && watchedSchoolId) {
        setLoginStatus('checking'); setIsDetectingRole(true);
        try {
          const cleanEmail = watchedEmail.toLowerCase().trim();
          const cleanSchoolId = watchedSchoolId.trim().padStart(8, '0');
          const { data: voter, error: voterError } = await supabase.from('voters').select('has_voted, voted_at').eq('email', cleanEmail).eq('school_id', cleanSchoolId).maybeSingle();
          if (voter && !voterError) { setLoginStatus('voter'); setVoterStatus(voter.has_voted ? 'already_voted' : 'can_vote'); setAdminRole(null); setIsDetectingRole(false); return; }
          const { data: admin, error: adminError } = await supabase.from('admins').select('role').eq('email', cleanEmail).eq('school_id', cleanSchoolId).maybeSingle();
          if (admin && !adminError) { setLoginStatus('admin'); setAdminRole(admin.role || 'admin'); setVoterStatus(null); setIsDetectingRole(false); return; }
          setLoginStatus('invalid'); setAdminRole(null); setVoterStatus(null);
        } catch (error) { console.error('Error checking user type:', error); setLoginStatus('invalid'); } finally { setIsDetectingRole(false); }
      } else { setLoginStatus(null); setAdminRole(null); setVoterStatus(null); }
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
      const { data: adminData, error: adminCheckError } = await supabase.from('admins').select('*').eq('email', cleanEmail).eq('school_id', cleanSchoolId).maybeSingle();
      if (!adminData || adminCheckError) { setLoginAttempts(prev => prev + 1); toast.error('Invalid credentials. Please try again.'); setIsLoading(false); return; }
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanSchoolId });
      if (authError) { setLoginAttempts(prev => prev + 1); toast.error('Invalid credentials. Please try again.'); setIsLoading(false); return; }
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      const { error: updateError } = await supabase.from('admins').update({ otp_code: otpCode, otp_expires_at: otpExpiry.toISOString(), otp_verified: false, last_otp_sent_at: new Date().toISOString(), otp_attempts: 0 }).eq('id', adminData.id);
      if (updateError) { toast.error('Failed to generate OTP. Please try again.'); setIsLoading(false); return; }
      localStorage.setItem('temp_admin_id', adminData.id);
      localStorage.setItem('temp_admin_email', cleanEmail);
      localStorage.setItem('temp_admin_name', adminData.name || 'Admin User');
      localStorage.setItem('temp_admin_role', adminData.role || 'admin');
      localStorage.setItem('temp_admin_auth_id', authData.user.id);
      try {
        const response = await fetch('/api/send-admin-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: cleanEmail, otp: otpCode, name: adminData.name || 'Admin User', role: adminData.role || 'admin' }) });
        const result = await response.json();
        if (result.success) toast.success(`✅ Admin OTP sent to ${cleanEmail}.`);
        else toast.error('Failed to send OTP. Please try again.');
      } catch (emailError) { toast.error('Failed to send OTP. Please try again.'); }
      setLoginAttempts(0); setLockoutUntil(null); setAuthCookies(false, adminData.role || 'admin', cleanEmail, adminData.id);
      setTimeout(() => router.push('/admin-verify-otp'), 1500);
    } catch (error) { console.error('Admin login error:', error); toast.error('System error. Please try again later.'); } finally { setIsLoading(false); }
  }, [router, setLoginAttempts, setAuthCookies]);

  // ========== FIXED VOTER LOGIN ==========
  const handleVoterLogin = useCallback(async (email, schoolId) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanSchoolId = schoolId.trim().padStart(8, '0');
      
      // Step 1: Get voter data
      const { data: voter, error: voterError } = await supabase
        .from('voters')
        .select('*')
        .eq('email', cleanEmail)
        .eq('school_id', cleanSchoolId)
        .maybeSingle();
      
      if (voterError || !voter) {
        setLoginAttempts(prev => prev + 1);
        toast.error('Invalid credentials. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Step 2: Check if already voted
      if (voter.has_voted === true) {
        toast.error('❌ You have already voted. Redirecting to results...');
        setTimeout(() => router.push('/election-result'), 3000);
        setIsLoading(false);
        return;
      }
      
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('voter_id', voter.id)
        .maybeSingle();
      
      if (existingVote) {
        await supabase.from('voters').update({ has_voted: true, voted_at: new Date().toISOString() }).eq('id', voter.id);
        toast.error('❌ You have already voted. Redirecting to results...');
        setTimeout(() => router.push('/election-result'), 3000);
        setIsLoading(false);
        return;
      }
      
      // Step 3: Check voting period
      const { data: votingSettings, error: settingsError } = await supabase
        .from('voting_periods')
        .select('is_active, start_date, end_date')
        .single();
      
      if (settingsError) {
        toast.error('Unable to verify voting period. Please try again.');
        setIsLoading(false);
        return;
      }
      
      const now = new Date();
      const startDate = new Date(votingSettings.start_date);
      const endDate = new Date(votingSettings.end_date);
      
      if (now < startDate) {
        toast.error(`❌ Voting has not started yet. Begins on ${startDate.toLocaleString()}`);
        setIsLoading(false);
        return;
      }
      
      if (now > endDate) {
        toast.error('❌ Voting period has ended. Redirecting to results...');
        setTimeout(() => router.push('/election-result'), 2000);
        setIsLoading(false);
        return;
      }
      
      if (!votingSettings?.is_active) {
        toast.error('❌ Voting is currently disabled by the Electoral Commission.');
        setIsLoading(false);
        return;
      }
      
      // Step 4: Check for existing valid OTP
      const { data: existingOtp, error: fetchOtpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('voter_id', voter.id)
        .eq('used', false)
        .gt('expires_at', now.toISOString())
        .maybeSingle();
      
      if (existingOtp && !fetchOtpError) {
        // Valid OTP exists – redirect directly
        localStorage.setItem('temp_voter_email', cleanEmail);
        localStorage.setItem('temp_voter_school_id', cleanSchoolId);
        localStorage.setItem('temp_voter_id', voter.id);
        localStorage.setItem('temp_voter_name', voter.name);
        localStorage.setItem('temp_voter_expiry', existingOtp.expires_at);
        toast.info(`You already have a valid OTP. Redirecting to verification page...`);
        setTimeout(() => router.push("/verify-otp"), 1500);
        setIsLoading(false);
        return;
      }
      
      // Step 5: Delete all expired or used OTPs for this voter (cleanup)
      await supabase
        .from('otp_codes')
        .delete()
        .eq('voter_id', voter.id)
        .or(`used.eq.true,expires_at.lt.${now.toISOString()}`);
      
      // Step 6: Generate new OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
      const hashedOtp = await hashCode(otpCode);
      
      const { error: otpError } = await supabase
        .from('otp_codes')
        .insert({
          voter_id: voter.id,
          email: cleanEmail,
          school_id: cleanSchoolId,
          code_hash: hashedOtp,
          otp_code: otpCode,
          expires_at: otpExpiry.toISOString(),
          used: false,
          created_at: now.toISOString(),
          resend_count: 0
        });
      
      if (otpError) {
        console.error('OTP insertion error:', otpError);
        toast.error('Failed to generate OTP. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Step 7: Send OTP email
      try {
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, otp: otpCode, name: voter.name, expiresIn: 15 }),
        });
        const result = await response.json();
        if (!result.success) {
          toast.error('Failed to send OTP. Please try again.');
          setIsLoading(false);
          return;
        } else {
          toast.success(`✅ OTP sent to ${email}. Valid for 15 minutes.`);
        }
      } catch (emailError) {
        console.error('Email error:', emailError);
        toast.error('Failed to send OTP. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Step 8: Store temporary data
      localStorage.setItem('temp_voter_email', cleanEmail);
      localStorage.setItem('temp_voter_school_id', cleanSchoolId);
      localStorage.setItem('temp_voter_id', voter.id);
      localStorage.setItem('temp_voter_name', voter.name);
      localStorage.setItem('temp_voter_expiry', otpExpiry.getTime().toString());
      
      await logOtpGeneration({ voter_id: voter.id, email: email, ip_address: clientIP, success: true });
      
      toast.success('Redirecting to verification...');
      setTimeout(() => router.push("/verify-otp"), 1500);
      
    } catch (error) {
      console.error('Voter login error:', error);
      toast.error('Error during login: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [router, hashCode, clientIP]);

  const isVoterLoginDisabled = useCallback(() => {
    if (loginStatus !== 'voter') return false;
    if (voterStatus === 'already_voted') return true;
    if (votingStatus.hasEnded) return true;
    if (!votingStatus.hasStarted) return true;
    if (!votingStatus.isActive) return true;
    return false;
  }, [loginStatus, voterStatus, votingStatus]);

  const onSubmit = useCallback(async (formData) => {
    if (!await checkRateLimit()) return;
    const { email, schoolId } = formData;
    if (loginStatus === 'voter') {
      if (voterStatus === 'already_voted') { toast.error('❌ You have already voted. Cannot login again.'); setTimeout(() => router.push('/election-result'), 2000); return; }
      if (votingStatus.hasEnded) { toast.error('❌ Voting period has ended. You cannot vote at this time.'); setTimeout(() => router.push('/election-result'), 2000); return; }
      if (!votingStatus.hasStarted) { toast.error(`❌ Voting has not started yet. Begins on ${new Date(votingStatus.startDate).toLocaleString()}`); return; }
      if (!votingStatus.isActive) { toast.error('❌ Voting is currently disabled. Please contact the electoral commission.'); return; }
    }
    try {
      if (loginStatus === 'voter') await handleVoterLogin(email, schoolId);
      else if (loginStatus === 'admin') await handleAdminLogin(email, schoolId);
      else { setLoginAttempts(prev => prev + 1); toast.error('Invalid credentials. Please try again.'); }
    } catch (error) { console.error('Login error:', error); setLoginAttempts(prev => prev + 1); }
  }, [loginStatus, voterStatus, votingStatus, handleVoterLogin, handleAdminLogin, checkRateLimit, setLoginAttempts, router]);

  // Debug mode
  useEffect(() => {
    const handleKeyPress = (e) => { if (e.ctrlKey && e.shiftKey && e.key === 'D' && process.env.NODE_ENV === 'development') { setValue('email', 'admin@regent.edu.gh'); setValue('schoolId', '00000001'); toast.info('Debug credentials filled'); } };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setValue]);

  const themeStyles = useMemo(() => ({
    dark: {
      background: 'from-[#02140f] via-[#063d2e] to-[#0b2545]',
      cardBg: 'bg-white/10 backdrop-blur-2xl', cardBorder: 'border-white/20', textPrimary: 'text-white', textSecondary: 'text-white/70',
      inputBg: 'bg-white/5', inputBorder: 'border-white/10', inputFocus: 'focus:ring-green-400', placeholder: 'placeholder-white/40',
      statusCard: { checking: 'bg-blue-500/20 border-blue-400/50', voter: 'bg-blue-500/20 border-blue-400/50', admin: { dean: 'bg-purple-500/20 border-purple-400/50', electoral: 'bg-emerald-500/20 border-emerald-400/50', it_admin: 'bg-cyan-500/20 border-cyan-400/50', hod: 'bg-green-500/20 border-green-400/50', default: 'bg-purple-500/20 border-purple-400/50' }, invalid: 'bg-red-500/20 border-red-400/50' }
    },
    light: {
      background: 'from-blue-50 via-white to-gray-100',
      cardBg: 'bg-white/80 backdrop-blur-2xl', cardBorder: 'border-gray-200', textPrimary: 'text-gray-900', textSecondary: 'text-gray-600',
      inputBg: 'bg-white', inputBorder: 'border-gray-300', inputFocus: 'focus:ring-green-500', placeholder: 'placeholder-gray-400',
      statusCard: { checking: 'bg-blue-100 border-blue-300', voter: 'bg-blue-100 border-blue-300', admin: { dean: 'bg-purple-100 border-purple-300', electoral: 'bg-emerald-100 border-emerald-300', it_admin: 'bg-cyan-100 border-cyan-300', hod: 'bg-green-100 border-green-300', default: 'bg-purple-100 border-purple-300' }, invalid: 'bg-red-100 border-red-300' }
    }
  }), []);
  const currentTheme = themeStyles[theme];
  const getAdminStatusClass = useCallback(() => { switch(adminRole) { case 'dean': return currentTheme.statusCard.admin.dean; case 'electoral_commission': case 'ec': return currentTheme.statusCard.admin.electoral; case 'it_admin': return currentTheme.statusCard.admin.it_admin; case 'hod': return currentTheme.statusCard.admin.hod; default: return currentTheme.statusCard.admin.default; } }, [adminRole, currentTheme]);
  const getAdminTextColor = useCallback(() => { switch(adminRole) { case 'dean': return theme === 'dark' ? 'text-purple-200' : 'text-purple-700'; case 'electoral_commission': case 'ec': return theme === 'dark' ? 'text-emerald-200' : 'text-emerald-700'; case 'it_admin': return theme === 'dark' ? 'text-cyan-200' : 'text-cyan-700'; case 'hod': return theme === 'dark' ? 'text-green-200' : 'text-green-700'; default: return theme === 'dark' ? 'text-purple-200' : 'text-purple-700'; } }, [adminRole, theme]);

  if (!mounted) return null;

  return (
    <>
      <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3000, className: 'text-sm font-medium' }} />
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300`}>
        <div className="absolute inset-0">
          <div className={`absolute top-[-100px] right-[-100px] w-[300px] h-[300px] ${theme === 'dark' ? 'bg-green-600' : 'bg-green-400'} opacity-20 blur-3xl rounded-full animate-pulse`}></div>
          <div className={`absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] ${theme === 'dark' ? 'bg-yellow-500' : 'bg-yellow-400'} opacity-20 blur-3xl rounded-full animate-pulse delay-1000`}></div>
        </div>
        <button onClick={toggleTheme} className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300">
          {theme === 'dark' ? <FaSun className="text-yellow-400 text-xl" /> : <FaMoon className="text-gray-700 text-xl" />}
        </button>
        <div className="relative w-full max-w-md">
          <div data-aos="fade-up" className={`${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8 transition-all duration-300`}>
            <div className="flex justify-center gap-4 mb-4">
              <Image src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png" width={60} height={60} alt="Regent University Logo" className="object-contain" />
              <Image src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png" width={60} height={60} alt="E-Voting Logo" className="object-contain" />
            </div>
            <div className="text-center mb-6">
              <h1 className={`text-2xl font-bold ${currentTheme.textPrimary}`}>Regent E-Voting Portal</h1>
              <p className={`text-sm ${currentTheme.textSecondary} mt-1`}>Secure access to cast your vote</p>
            </div>
            {votingStatus && (
              <div className={`mb-4 p-3 rounded-xl ${votingStatus.hasEnded ? 'bg-red-500/20 border border-red-400/50' : !votingStatus.hasStarted ? 'bg-yellow-500/20 border border-yellow-400/50' : votingStatus.isActive ? 'bg-green-500/20 border border-green-400/50' : 'bg-gray-500/20 border border-gray-400/50'}`}>
                <div className="flex items-center gap-2">
                  {votingStatus.hasEnded ? <FaTimesCircle className="text-red-400" /> : !votingStatus.hasStarted ? <FaClock className="text-yellow-400 animate-pulse" /> : votingStatus.isActive ? <FaCheckCircle className="text-green-400" /> : <FaExclamationTriangle className="text-gray-400" />}
                  <p className={`text-sm font-medium ${votingStatus.hasEnded ? 'text-red-200' : !votingStatus.hasStarted ? 'text-yellow-200' : votingStatus.isActive ? 'text-green-200' : 'text-gray-200'}`}>{votingStatus.message}</p>
                </div>
              </div>
            )}
            {loginAttempts > 3 && loginAttempts < 5 && (<div className="mb-4 p-3 rounded-xl bg-yellow-500/20 border border-yellow-400/50"><div className="flex items-center gap-2"><FaExclamationTriangle className="text-yellow-400" /><p className="text-sm text-yellow-200">Warning: {5 - loginAttempts} attempts remaining</p></div></div>)}
            {lockoutUntil && new Date() < new Date(lockoutUntil) && (<div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/50"><div className="flex items-center gap-2"><FaClock className="text-red-400 animate-pulse" /><p className="text-sm text-red-200">Account temporarily locked. Please try again later.</p></div></div>)}
            {isDetectingRole && (<div className={`mb-4 p-3 rounded-xl ${currentTheme.statusCard.checking}`}><div className="flex items-center gap-2"><FaSpinner className="animate-spin" /><p className={`text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Validating credentials...</p></div></div>)}
            {loginStatus === 'voter' && !isDetectingRole && (
              <div className={`mb-4 p-3 rounded-xl ${currentTheme.statusCard.voter}`}>
                <div className="flex items-center gap-2"><FaUserGraduate className={theme === 'dark' ? 'text-blue-300' : 'text-blue-600'} /><p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Student Voter Detected</p></div>
                {voterStatus === 'can_vote' && votingStatus.isActive && (<p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`}><FaCheckCircle className="text-xs" /> You are eligible to vote. Voting is active!</p>)}
                {voterStatus === 'can_vote' && !votingStatus.isActive && !votingStatus.hasEnded && !votingStatus.hasStarted && (<p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'}`}><FaExclamationTriangle className="text-xs" /> You are eligible but voting is currently disabled.</p>)}
                {voterStatus === 'already_voted' && (<p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-600'}`}><FaExclamationTriangle className="text-xs" /> You have already voted.</p>)}
                {voterStatus === 'can_vote' && votingStatus.hasEnded && (<p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}><FaTimesCircle className="text-xs" /> Voting has ended. You cannot vote.</p>)}
                {voterStatus === 'can_vote' && !votingStatus.hasStarted && votingStatus.startDate && (<p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'}`}><FaClock className="text-xs" /> Voting starts on {new Date(votingStatus.startDate).toLocaleString()}</p>)}
              </div>
            )}
            {loginStatus === 'admin' && !isDetectingRole && (
              <div className={`mb-4 p-3 rounded-xl ${getAdminStatusClass()}`}>
                <div className="flex items-center gap-2">{getRoleIcon()}<p className={`text-sm font-medium ${getAdminTextColor()}`}>{getRoleName()} Detected</p></div>
                <p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}><FaShieldAlt className="text-xs" /> Please enter your password (School ID) to login.</p>
                <p className={`text-xs mt-1 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}><FaShieldAlt className="text-xs" /> Admin access is always available regardless of voting period.</p>
              </div>
            )}
            {loginStatus === 'invalid' && !isDetectingRole && (<div className={`mb-4 p-3 rounded-xl ${currentTheme.statusCard.invalid}`}><div className="flex items-center gap-2"><FaTimesCircle className={theme === 'dark' ? 'text-red-300' : 'text-red-600'} /><p className={`text-sm ${theme === 'dark' ? 'text-red-200' : 'text-red-700'}`}>Invalid credentials. Please try again.</p></div></div>)}
            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
              <input type="hidden" autoComplete="false" />
              <div className="relative group">
                <FaEnvelope className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-white/50 group-focus-within:text-green-400' : 'text-gray-400 group-focus-within:text-green-500'} transition`} />
                <input {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@regent\.edu\.gh$/i, message: 'Only @regent.edu.gh emails allowed' } })} type="email" placeholder="Enter your university email" autoComplete="off" className={`w-full pl-10 pr-4 py-3 ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl ${currentTheme.textPrimary} ${currentTheme.placeholder} focus:outline-none focus:ring-2 ${currentTheme.inputFocus} transition`} disabled={isLoading} />
                {errors.email && (<p className="text-red-400 text-xs mt-1 flex items-center gap-1"><FaExclamationTriangle className="text-xs" /> {errors.email.message}</p>)}
              </div>
              <div className="relative group">
                <FaIdCard className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-white/50 group-focus-within:text-green-400' : 'text-gray-400 group-focus-within:text-green-500'} transition`} />
                <input {...register('schoolId', { required: 'School ID required', pattern: { value: /^[0-9]{8}$/, message: 'Must be 8 digits' } })} type="text" placeholder="Enter your School ID (8 digits)" autoComplete="off" className={`w-full pl-10 pr-4 py-3 ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl ${currentTheme.textPrimary} ${currentTheme.placeholder} focus:outline-none focus:ring-2 ${currentTheme.inputFocus} transition`} disabled={isLoading} />
                {errors.schoolId && (<p className="text-red-400 text-xs mt-1 flex items-center gap-1"><FaExclamationTriangle className="text-xs" /> {errors.schoolId.message}</p>)}
              </div>
              <button type="submit" disabled={isLoading || loginStatus === 'invalid' || (loginStatus === 'voter' && voterStatus === 'already_voted') || (lockoutUntil && new Date() < new Date(lockoutUntil)) || isVoterLoginDisabled()} className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${loginStatus === 'admin' ? 'bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500' : loginStatus === 'voter' && voterStatus !== 'already_voted' && !isVoterLoginDisabled() ? 'bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500' : theme === 'dark' ? 'bg-gradient-to-r from-gray-700 to-gray-600' : 'bg-gradient-to-r from-gray-500 to-gray-400'}`}>
                {isLoading ? (<div className="flex items-center justify-center gap-2"><FaSpinner className="animate-spin" />Processing...</div>) : loginStatus === 'admin' ? (<div className="flex items-center justify-center gap-2">{getRoleIcon()} Login as {getRoleName()}</div>) : loginStatus === 'voter' && voterStatus === 'already_voted' ? (<div className="flex items-center justify-center gap-2"><FaCheckCircle /> Already Voted</div>) : loginStatus === 'voter' && isVoterLoginDisabled() ? (<div className="flex items-center justify-center gap-2"><FaClock /> Voting Not Active</div>) : loginStatus === 'voter' ? "Send OTP" : "Login"}
              </button>
            </form>
            <div className={`mt-6 text-xs ${currentTheme.textSecondary} text-center space-y-3`}>
              <p>Enter your email and school ID to login</p>
              <p>Students: OTP will be sent to your email</p>
              <div className="pt-2"><Link href="/" className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white/80' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}><FaHome className="text-sm" /><span>Go to Home</span></Link></div>
            </div>
            <div className={`mt-4 flex justify-center gap-3 text-xs ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}><span>Secure</span><span>•</span><span>Encrypted</span><span>•</span><span>Audited</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div><p className="text-white">Loading secure portal...</p></div></div>}>
      <LoginContent />
    </Suspense>
  );
}