'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { Toaster, toast } from 'sonner';
import Link from 'next/link';
import { 
  FaSpinner, FaArrowLeft, FaExclamationTriangle, FaCheckCircle, 
  FaClock, FaEnvelope, FaShieldAlt, FaLock, FaSun, FaMoon, FaHome
} from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';
import { logOtpVerification, logLogin, logOtpGeneration, getClientIP } from '@/utils/auditLog';

export default function VerifyOTP() {
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [clientIP, setClientIP] = useState('unknown');
  const [voterInfo, setVoterInfo] = useState(null);
  const [sessionError, setSessionError] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [otpExpiry, setOtpExpiry] = useState(null);
  
  const inputRefs = useRef([]);
  const router = useRouter();
  const verificationLock = useRef(false);

  // Theme management
  useEffect(() => {
    setMounted(true);
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

  // Memoized theme styles
  const themeStyles = useMemo(() => ({
    dark: {
      background: 'from-[#02140f] via-[#063d2e] to-[#0b2545]',
      cardBg: 'bg-white/10 backdrop-blur-2xl',
      cardBorder: 'border-white/20',
      textPrimary: 'text-white',
      textSecondary: 'text-emerald-100/80',
      inputBg: 'bg-white/10',
      inputBorder: 'border-white/20',
      inputFocus: 'focus:border-[#f4a261] focus:ring-[#f4a261]/50 ring-offset-transparent',
      buttonPrimary: 'from-[#f4a261] to-[#e76f51]',
      buttonSecondary: 'bg-white/5 hover:bg-white/10 border-white/10',
      accent: '#f4a261'
    },
    light: {
      background: 'from-teal-50 via-white to-amber-50',
      cardBg: 'bg-white/90 backdrop-blur-2xl',
      cardBorder: 'border-gray-200',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-600',
      inputBg: 'bg-white',
      inputBorder: 'border-gray-300',
      inputFocus: 'focus:border-teal-500 focus:ring-teal-500/50 ring-offset-transparent',
      buttonPrimary: 'from-teal-600 to-teal-700',
      buttonSecondary: 'bg-gray-100 hover:bg-gray-200 border-gray-200',
      accent: '#0d9488'
    }
  }), []);

  const currentTheme = themeStyles[theme];

  // Security check - prevent iframe attacks
  useEffect(() => {
    if (typeof window !== 'undefined' && window.self !== window.top) {
      toast.error('Security check failed');
      router.push('/login');
    }
  }, [router]);

  // Get client IP on mount
  useEffect(() => {
    const getIP = async () => {
      const ip = await getClientIP();
      setClientIP(ip);
    };
    getIP();
  }, []);

  // Validate session and voter info on mount
  useEffect(() => {
    const validateSession = async () => {
      try {
        const tempEmail = localStorage.getItem('temp_voter_email');
        const tempSchoolId = localStorage.getItem('temp_voter_school_id');
        const tempVoterId = localStorage.getItem('temp_voter_id');
        const tempVoterName = localStorage.getItem('temp_voter_name');

        if (!tempEmail || !tempSchoolId || !tempVoterId) {
          setSessionError(true);
          toast.error('No active session found. Please login again.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        // Check if IP is locked
        const { data: ipLock } = await supabase
          .from('ip_locks')
          .select('*')
          .eq('ip_address', clientIP)
          .eq('is_locked', true)
          .single();

        if (ipLock && new Date(ipLock.lock_until) > new Date()) {
          setIsLocked(true);
          setLockUntil(new Date(ipLock.lock_until));
          toast.error(`Too many failed attempts. Try again later.`);
          return;
        }

        const { data: voter, error: voterError } = await supabase
          .from('voters')
          .select('*')
          .eq('email', tempEmail.toLowerCase())
          .eq('school_id', tempSchoolId)
          .single();

        if (voterError || !voter) {
          setSessionError(true);
          toast.error('Your account could not be verified.');
          localStorage.removeItem('temp_voter_email');
          localStorage.removeItem('temp_voter_school_id');
          localStorage.removeItem('temp_voter_id');
          localStorage.removeItem('temp_voter_name');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        // Get failed attempts from database
        const { data: attemptRecord } = await supabase
          .from('otp_attempts')
          .select('*')
          .eq('voter_id', voter.id)
          .single();

        if (attemptRecord) {
          setFailedAttempts(attemptRecord.failed_count);
          if (attemptRecord.failed_count >= 5 && new Date(attemptRecord.lock_until) > new Date()) {
            setIsLocked(true);
            setLockUntil(new Date(attemptRecord.lock_until));
            toast.error(`Too many failed attempts. Try again later.`);
            return;
          }
        }

        if (voter.id !== tempVoterId) {
          setSessionError(true);
          toast.error('Session mismatch. Please login again.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('voter_id', voter.id)
          .maybeSingle();

        if (existingVote) {
          setSessionError(true);
          toast.error('You have already cast your vote.');
          setTimeout(() => router.push('/election-result'), 2000);
          return;
        }

        // Get latest valid OTP record for expiry timer
        const { data: otpRecord } = await supabase
          .from('otp_codes')
          .select('expires_at')
          .eq('voter_id', voter.id)
          .eq('used', false)
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (otpRecord) {
          setOtpExpiry(new Date(otpRecord.expires_at));
        }

        setVoterInfo({
          email: tempEmail,
          schoolId: tempSchoolId,
          id: tempVoterId,
          name: tempVoterName || voter.name
        });

      } catch (error) {
        console.error('Session validation error:', error);
        setSessionError(true);
        toast.error('Session validation failed.');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    if (clientIP !== 'unknown') {
      validateSession();
    }
  }, [router, clientIP]);

  // OTP expiry countdown timer
  useEffect(() => {
    if (!otpExpiry) return;
    
    const interval = setInterval(() => {
      const remaining = otpExpiry - new Date();
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeRemaining(0);
        setOtpDigits(['', '', '', '', '', '']);
        toast.warning('Your OTP has expired. Tap "Resend OTP" to get a new one.');
      } else {
        setTimeRemaining(Math.floor(remaining / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [otpExpiry]);

  // Handle OTP digit input
  const handleDigitChange = useCallback((index, value) => {
    if (isLocked || isVerifying) return;
    
    if (value && !/^\d+$/.test(value)) return;
    
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(0, 1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otpDigits, isLocked, isVerifying]);

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    if (isLocked || isVerifying) return;
    
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newDigits = [...otpDigits];
      for (let i = 0; i < digits.length && i < 6; i++) {
        newDigits[i] = digits[i];
      }
      setOtpDigits(newDigits);
      const nextEmptyIndex = newDigits.findIndex(d => !d);
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
    }
  };

  // Record failed attempt
  const recordFailedAttempt = async (voterId) => {
    const newFailedCount = failedAttempts + 1;
    setFailedAttempts(newFailedCount);

    const lockUntilTime = new Date();
    if (newFailedCount >= 5) {
      lockUntilTime.setMinutes(lockUntilTime.getMinutes() + 15);
      setIsLocked(true);
      setLockUntil(lockUntilTime);
      
      await supabase
        .from('ip_locks')
        .upsert({
          ip_address: clientIP,
          is_locked: true,
          lock_until: lockUntilTime.toISOString(),
          attempt_count: newFailedCount
        });
    }

    await supabase
      .from('otp_attempts')
      .upsert({
        voter_id: voterId,
        failed_count: newFailedCount,
        last_attempt: new Date().toISOString(),
        lock_until: newFailedCount >= 5 ? lockUntilTime.toISOString() : null
      });
  };

  // Reset failed attempts on success
  const resetFailedAttempts = async (voterId) => {
    setFailedAttempts(0);
    setIsLocked(false);
    setLockUntil(null);
    
    await supabase
      .from('otp_attempts')
      .upsert({
        voter_id: voterId,
        failed_count: 0,
        last_attempt: new Date().toISOString(),
        lock_until: null
      });
    
    await supabase
      .from('ip_locks')
      .delete()
      .eq('ip_address', clientIP);
  };

  // Constant time comparison for hash
  const constantTimeCompare = (a, b) => {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  };

  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Helper to format time remaining
  const formatTimeRemaining = (expiryDate) => {
    if (!expiryDate) return '';
    const remaining = new Date(expiryDate) - new Date();
    if (remaining <= 0) return 'expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ========== GENERATE NEW OTP (used by resend) ==========
  const generateNewOtp = async (voterId, email, schoolId, name) => {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const hashedOtp = await hashCode(otpCode);
    
    // Delete all expired/unused OTPs for this voter first
    await supabase
      .from('otp_codes')
      .delete()
      .eq('voter_id', voterId)
      .or(`used.eq.true,expires_at.lt.${new Date().toISOString()}`);
    
    // Insert NEW OTP record
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        voter_id: voterId,
        email: email.toLowerCase(),
        school_id: schoolId,
        code_hash: hashedOtp,
        otp_code: otpCode,
        expires_at: newExpiry.toISOString(),
        used: false,
        created_at: new Date().toISOString(),
        resend_count: 0
      });
    
    if (insertError) {
      console.error('Failed to create new OTP:', insertError);
      throw new Error('Failed to generate new OTP');
    }
    
    // Send NEW OTP via email
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase(),
        otp: otpCode,
        name: name,
        expiresIn: 15
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send new OTP email');
    }
    
    // Update expiry timer in UI
    setOtpExpiry(newExpiry);
    
    await logOtpGeneration({
      voter_id: voterId,
      email: email,
      ip_address: clientIP,
      success: true,
      action: 'new_generation'
    });
    
    toast.success(`New OTP sent to ${email}. Valid for 15 minutes.`);
  };

  // ========== ENHANCED RESEND OTP ==========
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !voterInfo || isLoading || isLocked) return;
    
    setIsLoading(true);
    
    try {
      const { email, schoolId, name, id } = voterInfo;
      
      // Check voting period
      const { data: votingSettings } = await supabase
        .from('voting_periods')
        .select('is_active, end_date')
        .single();
      
      if (!votingSettings?.is_active || new Date() > new Date(votingSettings.end_date)) {
        toast.error('Voting period has ended');
        router.push('/election-result');
        return;
      }
      
      // Check if already voted
      const { data: voter } = await supabase
        .from('voters')
        .select('has_voted')
        .eq('id', id)
        .single();
      
      if (voter?.has_voted) {
        toast.error('You have already voted');
        router.push('/election-result');
        return;
      }
      
      // Look for existing valid OTP (unused, not expired)
      const { data: existingOtp } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('voter_id', id)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const now = new Date();
      
      if (existingOtp && new Date(existingOtp.expires_at) > now) {
        // ✅ VALID OTP EXISTS – RESEND SAME CODE
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.toLowerCase(),
            otp: existingOtp.otp_code,
            name: name,
            expiresIn: 15
          }),
        });
        
        if (!response.ok) throw new Error('Failed to send OTP email');
        
        // Update last_resent_at and resend_count
        await supabase
          .from('otp_codes')
          .update({
            last_resent_at: new Date().toISOString(),
            resend_count: (existingOtp.resend_count || 0) + 1
          })
          .eq('id', existingOtp.id);
        
        await logOtpGeneration({
          voter_id: id,
          email: email,
          ip_address: clientIP,
          success: true,
          action: 'resend_existing'
        });
        
        toast.success(`OTP resent to ${email}. Valid until ${formatTimeRemaining(existingOtp.expires_at)}`);
      } else {
        // ❌ NO VALID OTP OR EXPIRED – GENERATE NEW ONE
        if (existingOtp && new Date(existingOtp.expires_at) <= now) {
          toast.warning('Previous OTP expired. Generating a new one...');
        }
        await generateNewOtp(id, email, schoolId, name);
      }
      
      // Reset input fields and start cooldown
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ========== VERIFY OTP ==========
  const handleVerify = async () => {
    if (verificationLock.current || isVerifying) return;
    verificationLock.current = true;
    setIsVerifying(true);
    
    try {
      if (isLocked) {
        toast.error(`Too many failed attempts. Please wait.`);
        return;
      }

      const otpCode = otpDigits.join('');
      if (otpCode.length !== 6) {
        toast.error('Please enter all 6 digits');
        return;
      }

      if (!voterInfo) {
        toast.error('Session expired. Please login again.');
        router.push('/login');
        return;
      }

      const { email, schoolId, id: voterId } = voterInfo;

      const { data: voter, error: voterError } = await supabase
        .from('voters')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('school_id', schoolId)
        .single();

      if (voterError || !voter) {
        throw new Error('Voter not found. Please login again.');
      }

      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('voter_id', voter.id)
        .maybeSingle();

      if (existingVote) {
        throw new Error('You have already cast your vote.');
      }

      // Get the most recent valid OTP record
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('voter_id', voter.id)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError || !otpRecord) {
        await recordFailedAttempt(voter.id);
        throw new Error('No valid OTP found. Please request a new code.');
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        await recordFailedAttempt(voter.id);
        throw new Error('OTP has expired. Please request a new code.');
      }

      const hashedInputOtp = await hashCode(otpCode);
      
      if (!constantTimeCompare(otpRecord.code_hash, hashedInputOtp)) {
        await recordFailedAttempt(voter.id);
        const remainingAttempts = 4 - failedAttempts;
        throw new Error(`Invalid OTP code. ${remainingAttempts} attempts remaining.`);
      }

      await resetFailedAttempts(voter.id);

      // Mark OTP as used
      const { error: updateError } = await supabase
        .from('otp_codes')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', otpRecord.id)
        .eq('used', false);

      if (updateError) {
        throw new Error('OTP already used. Please request a new one.');
      }

      const sessionData = {
        is_authenticated: true,
        role: 'voter',
        email: voter.email,
        name: voter.name,
        user_id: voter.id,
        school_id: voter.school_id,
        login_time: new Date().toISOString()
      };

      localStorage.setItem('user_session', JSON.stringify(sessionData));
      localStorage.setItem('user_role', 'voter');
      localStorage.setItem('voter_data', JSON.stringify(voter));
      
      localStorage.removeItem('temp_voter_email');
      localStorage.removeItem('temp_voter_school_id');
      localStorage.removeItem('temp_voter_id');
      localStorage.removeItem('temp_voter_name');

      await logOtpVerification({
        voter_id: voter.id,
        email: email,
        ip_address: clientIP,
        success: true
      });

      await logLogin({
        email: email,
        user_role: 'voter',
        success: true,
        ip_address: clientIP
      });

      toast.success('Verification successful! Redirecting...');
      setTimeout(() => router.push("/vote"), 1500);
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.message);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
      setTimeout(() => {
        verificationLock.current = false;
      }, 500);
    }
  };

  // Format time remaining display
  const formatDisplayTime = () => {
    if (!timeRemaining || timeRemaining <= 0) return null;
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!mounted) return null;

  if (sessionError) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${theme === 'dark' ? 'from-[#02140f] via-[#063d2e] to-[#0b2545]' : 'from-teal-50 via-white to-amber-50'} flex items-center justify-center p-4`}>
        <Toaster position="top-center" richColors />
        <div className="relative w-full max-w-md">
          <div className={`${theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-white border-gray-200'} backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center`}>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="text-red-400 text-4xl" />
              </div>
            </div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Session Expired</h2>
            <p className={`${theme === 'dark' ? 'text-emerald-100/80' : 'text-gray-600'} mb-6`}>
              Your session is invalid or has expired. Please login again to continue.
            </p>
            <button
              onClick={() => router.push('/login')}
              className={`w-full py-3 px-6 bg-gradient-to-r ${currentTheme.buttonPrimary} text-white font-semibold rounded-xl transition-all duration-300`}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!voterInfo) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${theme === 'dark' ? 'from-[#02140f] via-[#063d2e] to-[#0b2545]' : 'from-teal-50 via-white to-amber-50'} flex items-center justify-center`}>
        <Toaster position="top-center" richColors />
        <div className={`text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <FaSpinner className="animate-spin text-4xl mx-auto mb-4" />
          <p>Validating your session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 4000, className: 'text-sm font-medium' }} />
      
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <FaSun className="text-yellow-400 text-xl" /> : <FaMoon className="text-gray-700 text-xl" />}
      </button>

      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300`}>
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute -top-40 -right-32 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse ${theme === 'dark' ? 'bg-[#2d6a4f]' : 'bg-teal-400'}`}></div>
          <div className={`absolute -bottom-40 -left-32 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse ${theme === 'dark' ? 'bg-[#f4a261]' : 'bg-amber-400'}`}></div>
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse ${theme === 'dark' ? 'bg-[#40916c]' : 'bg-teal-300'}`}></div>
        </div>

        <div className="relative w-full max-w-md">
          <div className={`${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl shadow-2xl p-6 sm:p-8 transform transition-all duration-300`}>
            
            {/* Header with Logos */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-4">
                <Image src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png" alt="Regent University Logo" width={60} height={60} className="h-12 w-12 sm:h-[70px] sm:w-[70px] object-contain" priority />
                <Image src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png" alt="RGSP Logo" width={60} height={60} className="h-12 w-12 sm:h-[70px] sm:w-[70px] object-contain" priority />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${currentTheme.textPrimary} mb-2`}>Verify Your Identity</h1>
              <div className={`flex items-center justify-center gap-2 ${currentTheme.textSecondary} text-xs sm:text-sm`}>
                <FaEnvelope className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="truncate max-w-[200px] sm:max-w-none">{voterInfo.email}</span>
              </div>
              
              {/* OTP Expiry Timer */}
              {timeRemaining > 0 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-100'} px-2 py-1 rounded-full`}>
                    <FaClock className={`w-3 h-3 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    <span className={`text-[10px] ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      OTP expires in: {formatDisplayTime()}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-[#f4a261]/20' : 'bg-teal-100'} px-2 py-1 rounded-full`}>
                  <FaLock className={`w-3 h-3 ${theme === 'dark' ? 'text-[#f4a261]' : 'text-teal-600'}`} />
                  <span className={`text-[10px] ${theme === 'dark' ? 'text-[#f4a261]' : 'text-teal-600'}`}>Secure OTP</span>
                </div>
                {failedAttempts > 0 && !isLocked && (
                  <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-full">
                    <FaShieldAlt className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] text-red-400">{4 - failedAttempts} attempts left</span>
                  </div>
                )}
                {isLocked && (
                  <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-full">
                    <FaShieldAlt className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] text-red-400">Temporarily Locked</span>
                  </div>
                )}
              </div>
            </div>

            {/* OTP Input Boxes */}
            <div className="mb-6 sm:mb-8">
              <label className={`${currentTheme.textSecondary} text-sm font-medium block text-center mb-3 sm:mb-4`}>Enter 6-Digit Verification Code</label>
              <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={isVerifying || isLocked}
                    className={`
                      w-10 h-12 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold 
                      ${currentTheme.inputBg} border-2 rounded-xl ${currentTheme.textPrimary}
                      focus:outline-none focus:ring-2 transition-all duration-200
                      ${digit ? `border-${theme === 'dark' ? '[#f4a261]' : 'teal-500'} bg-white/20 ring-1 ring-${theme === 'dark' ? '[#f4a261]' : 'teal-500'}/50` : currentTheme.inputBorder}
                      ${currentTheme.inputFocus} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    autoFocus={index === 0 && !isLocked}
                  />
                ))}
              </div>
              <p className={`text-center ${currentTheme.textSecondary} text-xs mt-3 opacity-50`}>Enter the 6-digit code sent to your email</p>
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={isVerifying || otpDigits.join('').length !== 6 || isLocked}
              className={`w-full py-3 sm:py-4 px-6 bg-gradient-to-r ${currentTheme.buttonPrimary} disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 disabled:transform-none disabled:cursor-not-allowed mb-4`}
            >
              {isVerifying ? (
                <div className="flex items-center justify-center space-x-2"><FaSpinner className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /><span>Verifying...</span></div>
              ) : (
                <div className="flex items-center justify-center space-x-2"><FaCheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /><span>Verify & Vote</span></div>
              )}
            </button>

            {/* Resend Section */}
            <div className="text-center mb-6">
              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading || isLocked}
                className={`${theme === 'dark' ? 'text-[#f4a261] hover:text-[#e76f51]' : 'text-teal-600 hover:text-teal-700'} text-xs sm:text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mx-auto`}
              >
                <FaClock className="w-3 h-3" />
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive code? Resend OTP"}
              </button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6">
              <div className={`${currentTheme.cardBg} rounded-xl p-2 sm:p-3 text-center border ${currentTheme.cardBorder}`}>
                <div className={`${theme === 'dark' ? 'text-[#f4a261]' : 'text-teal-600'} text-base sm:text-lg font-bold mb-1`}>15 min</div>
                <div className={`${currentTheme.textSecondary} text-[10px] sm:text-xs opacity-70`}>Code Valid For</div>
              </div>
              <div className={`${currentTheme.cardBg} rounded-xl p-2 sm:p-3 text-center border ${currentTheme.cardBorder}`}>
                <div className={`${theme === 'dark' ? 'text-[#f4a261]' : 'text-teal-600'} text-base sm:text-lg font-bold mb-1`}>1 Time</div>
                <div className={`${currentTheme.textSecondary} text-[10px] sm:text-xs opacity-70`}>Single Use Only</div>
              </div>
            </div>

            {/* Back to Login */}
            <button
              onClick={() => {
                localStorage.removeItem('temp_voter_email');
                localStorage.removeItem('temp_voter_school_id');
                localStorage.removeItem('temp_voter_id');
                localStorage.removeItem('temp_voter_name');
                router.push('/login');
              }}
              className={`w-full py-2.5 sm:py-3 px-6 ${currentTheme.buttonSecondary} ${currentTheme.textPrimary} font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 border text-sm sm:text-base`}
            >
              <FaArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Back to Login</span>
            </button>

            {/* Home Button */}
            <div className="mt-4 text-center">
              <Link href="/" className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white/80' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                <FaHome className="text-sm" />
                <span>Go to Home</span>
              </Link>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <div className={`flex items-center justify-center space-x-3 sm:space-x-4 text-[10px] sm:text-xs ${currentTheme.textSecondary} opacity-60`}>
                <span className="flex items-center space-x-1"><div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${theme === 'dark' ? 'bg-[#f4a261]' : 'bg-teal-600'} rounded-full animate-pulse`}></div><span>Secure</span></span>
                <span>•</span>
                <span className="flex items-center space-x-1"><div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${theme === 'dark' ? 'bg-[#2d6a4f]' : 'bg-teal-400'} rounded-full animate-pulse`}></div><span>Encrypted</span></span>
                <span>•</span>
                <span className="flex items-center space-x-1"><div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${theme === 'dark' ? 'bg-[#f4a261]' : 'bg-amber-500'} rounded-full animate-pulse`}></div><span>Audited</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}