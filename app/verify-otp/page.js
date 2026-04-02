'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { Toaster, toast } from 'sonner'; // ← Changed from react-toastify
import { FaSpinner, FaArrowLeft, FaExclamationTriangle, FaCheckCircle, FaClock, FaEnvelope, FaShieldAlt, FaLock } from 'react-icons/fa';
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
  const inputRefs = useRef([]);
  const router = useRouter();

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
          toast.error(`Too many failed attempts. Try again in ${Math.ceil((new Date(ipLock.lock_until) - new Date()) / 60000)} minutes.`);
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
          toast.error('Your account could not be verified. Please login again.');
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
          if (attemptRecord.failed_count >= 5) {
            setIsLocked(true);
            setLockUntil(new Date(attemptRecord.lock_until));
            toast.error(`Too many failed attempts. Try again in ${Math.ceil((new Date(attemptRecord.lock_until) - new Date()) / 60000)} minutes.`);
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
          setTimeout(() => router.push('/results'), 2000);
          return;
        }

        const { data: otpRecord } = await supabase
          .from('otp_codes')
          .select('*')
          .eq('voter_id', voter.id)
          .maybeSingle();

        if (otpRecord && new Date(otpRecord.expires_at) < new Date()) {
          setSessionError(true);
          toast.error('Your OTP has expired. Please request a new code.');
          setTimeout(() => router.push('/login'), 2000);
          return;
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
        toast.error('Session validation failed. Please login again.');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    if (clientIP !== 'unknown') {
      validateSession();
    }
  }, [router, clientIP]);

  // Handle OTP digit input
  const handleDigitChange = (index, value) => {
    if (isLocked || isVerifying) return;
    
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;
    
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(0, 1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
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
      // Focus the next empty input or last input
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
      
      // Record IP lock
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

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !voterInfo || isLocked) return;
    
    setIsLoading(true);
    
    try {
      const { email, schoolId, name, id } = voterInfo;
      
      const { data: voter, error: voterError } = await supabase
        .from('voters')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('school_id', schoolId)
        .single();

      if (voterError || !voter) {
        throw new Error('Voter not found. Please login again.');
      }
      
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await hashCode(otpCode);
      
      const { error: otpError } = await supabase
        .from('otp_codes')
        .upsert({
          voter_id: voter.id,
          email: email.toLowerCase(),
          school_id: schoolId,
          code_hash: hashedOtp,
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
          used: false
        }, {
          onConflict: 'voter_id'
        });

      if (otpError) throw otpError;

      // Send via API route
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          otp: otpCode,
          name: name,
          expiresIn: 10
        }),
      });

      if (!response.ok) {
        console.error('Email sending failed');
      }

      await logOtpGeneration({
        voter_id: voter.id,
        email: email,
        ip_address: clientIP,
        success: true
      });

      toast.success(`New OTP sent to ${email}`);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error(error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleVerify = async () => {
    if (isLocked) {
      const remainingMinutes = Math.ceil((new Date(lockUntil) - new Date()) / 60000);
      toast.error(`Too many failed attempts. Please wait ${remainingMinutes} minutes before trying again.`);
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

    setIsVerifying(true);

    try {
      const { email, schoolId, id: voterId, name: voterName } = voterInfo;

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

      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('voter_id', voter.id)
        .single();

      if (otpError || !otpRecord) {
        await recordFailedAttempt(voter.id);
        throw new Error('No OTP found. Please request a new code.');
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        await recordFailedAttempt(voter.id);
        throw new Error('OTP has expired. Please request a new code.');
      }

      if (otpRecord.used) {
        await recordFailedAttempt(voter.id);
        throw new Error('This OTP has already been used.');
      }

      const hashedInputOtp = await hashCode(otpCode);
      if (otpRecord.code_hash !== hashedInputOtp) {
        await recordFailedAttempt(voter.id);
        const remainingAttempts = 4 - failedAttempts;
        throw new Error(`Invalid OTP code. ${remainingAttempts} attempts remaining before 15-minute lockout.`);
      }

      // Success - reset failed attempts
      await resetFailedAttempts(voter.id);

      const { error: updateError } = await supabase
        .from('otp_codes')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', otpRecord.id);

      if (updateError) throw updateError;

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

      toast.success('Verification successful! Redirecting to voting page...');
      setTimeout(() => router.push("/vote"), 1500);
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.message);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (sessionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a2418] via-[#1a4d2a] to-[#2d6a4f] flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <div className="relative w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="text-red-400 text-4xl" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Session Expired</h2>
            <p className="text-emerald-100/80 mb-6">
              Your session is invalid or has expired. Please login again to continue.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-6 bg-gradient-to-r from-[#1a4d2a] to-[#2d6a4f] hover:from-[#2d6a4f] hover:to-[#40916c] text-white font-semibold rounded-xl transition-all duration-300"
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
      <div className="min-h-screen bg-gradient-to-br from-[#0a2418] via-[#1a4d2a] to-[#2d6a4f] flex items-center justify-center">
        <Toaster position="top-center" richColors />
        <div className="text-white text-center">
          <FaSpinner className="animate-spin text-4xl mx-auto mb-4" />
          <p>Validating your session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster 
        position="top-center" 
        richColors 
        closeButton
        toastOptions={{
          duration: 4000,
          className: 'text-sm font-medium',
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-[#0a2418] via-[#1a4d2a] to-[#2d6a4f] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-[#2d6a4f] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-[#f4a261] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#40916c] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        </div>

        <div className="relative w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-8 transform transition-all duration-300">
            
            {/* Header with Logos */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-4">
                <Image 
                  src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png" 
                  alt="Regent University Logo" 
                  width={60}
                  height={60}
                  className="h-12 w-12 sm:h-[70px] sm:w-[70px] object-contain"
                  priority
                />
                <Image 
                  src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png" 
                  alt="RGSP Logo" 
                  width={60}
                  height={60}
                  className="h-12 w-12 sm:h-[70px] sm:w-[70px] object-contain"
                  priority
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Verify Your Identity
              </h1>
              <div className="flex items-center justify-center gap-2 text-emerald-100/80 text-xs sm:text-sm">
                <FaEnvelope className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="truncate max-w-[200px] sm:max-w-none">{voterInfo.email}</span>
              </div>
              
              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="flex items-center gap-1 bg-[#f4a261]/20 px-2 py-1 rounded-full">
                  <FaLock className="w-3 h-3 text-[#f4a261]" />
                  <span className="text-[10px] text-[#f4a261]">Secure OTP</span>
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

            {/* Responsive OTP Boxes */}
            <div className="mb-6 sm:mb-8">
              <label className="text-emerald-100 text-sm font-medium block text-center mb-3 sm:mb-4">
                Enter 6-Digit Verification Code
              </label>
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
                      w-10 h-12 sm:w-14 sm:h-16 
                      text-center text-xl sm:text-2xl font-bold 
                      bg-white/10 border-2 
                      rounded-xl text-white 
                      focus:outline-none focus:ring-2 
                      transition-all duration-200
                      ${digit 
                        ? 'border-[#f4a261] bg-white/20 ring-1 ring-[#f4a261]/50' 
                        : 'border-white/20 focus:border-[#f4a261] focus:ring-[#f4a261]/50'
                      }
                      ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    autoFocus={index === 0 && !isLocked}
                  />
                ))}
              </div>
              <p className="text-center text-emerald-200/50 text-xs mt-3">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={isVerifying || otpDigits.join('').length !== 6 || isLocked}
              className="w-full py-3 sm:py-4 px-6 bg-gradient-to-r from-[#f4a261] to-[#e76f51] hover:from-[#e76f51] hover:to-[#f4a261] disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 disabled:transform-none disabled:cursor-not-allowed mb-4"
            >
              {isVerifying ? (
                <div className="flex items-center justify-center space-x-2">
                  <FaSpinner className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <FaCheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Verify & Vote</span>
                </div>
              )}
            </button>

            {/* Resend Section */}
            <div className="text-center mb-6">
              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading || isLocked}
                className="text-[#f4a261] hover:text-[#e76f51] text-xs sm:text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <FaClock className="w-3 h-3" />
                {resendCooldown > 0 
                  ? `Resend code in ${resendCooldown}s` 
                  : "Didn't receive code? Resend OTP"}
              </button>
            </div>

            {/* Info Cards - Responsive Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-2 sm:p-3 text-center border border-white/10">
                <div className="text-[#f4a261] text-base sm:text-lg font-bold mb-1">10 min</div>
                <div className="text-emerald-100/70 text-[10px] sm:text-xs">Code Valid For</div>
              </div>
              <div className="bg-white/5 rounded-xl p-2 sm:p-3 text-center border border-white/10">
                <div className="text-[#f4a261] text-base sm:text-lg font-bold mb-1">1 Time</div>
                <div className="text-emerald-100/70 text-[10px] sm:text-xs">Single Use Only</div>
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
              className="w-full py-2.5 sm:py-3 px-6 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 border border-white/10 text-sm sm:text-base"
            >
              <FaArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Back to Login</span>
            </button>

            {/* Footer */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center space-x-3 sm:space-x-4 text-[10px] sm:text-xs text-emerald-100/60">
                <span className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#f4a261] rounded-full animate-pulse"></div>
                  <span>Secure</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#2d6a4f] rounded-full animate-pulse"></div>
                  <span>Encrypted</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#f4a261] rounded-full animate-pulse"></div>
                  <span>Audited</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}