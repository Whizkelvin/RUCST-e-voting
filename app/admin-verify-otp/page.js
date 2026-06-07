// app/admin-verify-otp/page.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import Image from 'next/image';
import {
  FaShieldAlt,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaKey,
  FaUserShield,
  FaClock,
  FaExclamationTriangle,
  FaArrowLeft,
  FaSun,
  FaMoon,
} from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';
import { OTPHash } from '@/utils/otpHash';

// ─── Theme definitions - Grayscale ──────────────────────────────────────────
const THEME_STYLES = {
  dark: {
    background: 'from-gray-900 via-gray-800 to-gray-900',
    cardBg: 'bg-white/10 backdrop-blur-2xl',
    cardBorder: 'border-white/20',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-300',
    inputBg: 'bg-white/10',
    inputBorder: 'border-white/20',
    inputFocus: 'focus:ring-gray-400 focus:border-transparent',
    buttonPrimary: 'from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500',
    buttonSecondary: 'text-gray-300 hover:text-gray-200',
    infoCardBg: 'bg-white/5',
    infoCardBorder: 'border-white/10',
    adminCardBg: 'bg-gray-500/20 border-gray-400/50',
    iconColor: 'text-gray-400',
    glowBlob1: 'bg-gray-600',
    glowBlob2: 'bg-gray-500',
    timerHigh: 'bg-gray-500',
    timerMedium: 'bg-gray-500',
    timerLow: 'bg-red-500',
  },
  light: {
    background: 'from-gray-50 via-white to-gray-100',
    cardBg: 'bg-white/90 backdrop-blur-2xl',
    cardBorder: 'border-gray-200',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    inputBg: 'bg-white',
    inputBorder: 'border-gray-300',
    inputFocus: 'focus:ring-gray-500 focus:border-transparent',
    buttonPrimary: 'from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500',
    buttonSecondary: 'text-gray-600 hover:text-gray-700',
    infoCardBg: 'bg-gray-50',
    infoCardBorder: 'border-gray-200',
    adminCardBg: 'bg-gray-100 border-gray-200',
    iconColor: 'text-gray-600',
    glowBlob1: 'bg-gray-400',
    glowBlob2: 'bg-gray-300',
    timerHigh: 'bg-gray-500',
    timerMedium: 'bg-gray-500',
    timerLow: 'bg-red-500',
  },
};

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;
const MAX_ATTEMPTS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminVerifyOTP() {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false); // NEW: Track redirect state

  const timerRef = useRef(null);
  const router = useRouter();
  const currentTheme = THEME_STYLES[theme];

  // Get icon color based on theme
  const getIconColor = () => {
    return theme === 'light' ? 'text-gray-700' : 'text-gray-300';
  };

  // ── Theme ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }, [theme]);

  // ── Timer ────────────────────────────────────────────────────────────────
  const startTimer = useCallback((initialSeconds = OTP_EXPIRY_SECONDS) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(initialSeconds);
    setCanResend(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Complete login & redirect - FIXED ─────────────────────────────────────
  // ── Complete login & redirect - FIXED ─────────────────────────────────────
// In AdminVerifyOTP component, update completeLogin:
const completeLogin = useCallback(async () => {
  if (redirecting) return;
  setRedirecting(true);

  const authId   = localStorage.getItem('temp_admin_auth_id');
  const email    = localStorage.getItem('temp_admin_email');
  const role     = localStorage.getItem('temp_admin_role');
  const name     = localStorage.getItem('temp_admin_name');
  const maxAge   = 60 * 60;
  const cookieOpts = `path=/; max-age=${maxAge}; SameSite=Lax`;

  // Set localStorage
  localStorage.setItem('is_authenticated', 'true');
  localStorage.setItem('user_role', role);
  localStorage.setItem('user_email', email);
  localStorage.setItem('user_name', name);
  localStorage.setItem('user_id', authId);
  localStorage.setItem('last_activity', Date.now().toString());

  // Set cookies
  document.cookie = `is_authenticated=true; ${cookieOpts}`;
  document.cookie = `user_role=${role}; ${cookieOpts}`;
  document.cookie = `user_email=${encodeURIComponent(email)}; ${cookieOpts}`;
  if (authId) document.cookie = `user_id=${authId}; ${cookieOpts}`;

  // Clear temp data
  ['temp_admin_id', 'temp_admin_email', 'temp_admin_name',
   'temp_admin_role', 'temp_admin_auth_id', 'temp_admin_expiry'].forEach(
    (k) => localStorage.removeItem(k)
  );

  toast.success('Verification successful. Redirecting to dashboard...');

  // Force a hard navigation to ensure cookies are read
  setTimeout(() => {
    window.location.href = '/admin/dashboard';
  }, 1500);
}, [redirecting]);

  // ── Load admin data & sync timer from DB ─────────────────────────────────
  useEffect(() => {
    const adminId    = localStorage.getItem('temp_admin_id');
    const adminEmail = localStorage.getItem('temp_admin_email');
    const adminName  = localStorage.getItem('temp_admin_name');
    const adminRole  = localStorage.getItem('temp_admin_role');

    if (!adminId || !adminEmail) {
      toast.error('Session expired. Please login again.');
      router.replace('/login');
      return;
    }

    setAdminData({
      id: adminId,
      email: adminEmail,
      name: adminName || 'Admin User',
      role: adminRole || 'admin',
    });

    (async () => {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('otp_expires_at, otp_verified')
          .eq('id', adminId)
          .single();

        if (error) throw error;

        if (data.otp_verified) {
          toast.info('Already verified. Redirecting...');
          completeLogin();
          return;
        }

        if (data.otp_expires_at) {
          const remaining = Math.max(
            0,
            Math.floor((new Date(data.otp_expires_at).getTime() - Date.now()) / 1000)
          );
          if (remaining > 0) {
            startTimer(remaining);
          } else {
            setCanResend(true);
            toast.warning('OTP has expired. Please request a new one.');
          }
        }
      } catch (err) {
        console.error('Error checking OTP status:', err);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OTP input helpers ─────────────────────────────────────────────────────
  const focusInput = (index) => {
    document.getElementById(`otp-${index}`)?.focus();
  };

  const handleOtpChange = useCallback((index, value) => {
    if (!/^\d*$/.test(value)) return;
    setOtp((prev) => {
      const next = [...prev];
      next[index] = value.slice(0, 1);
      return next;
    });
    if (value && index < OTP_LENGTH - 1) focusInput(index + 1);
  }, []);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) focusInput(index - 1);
  }, [otp]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  }, []);

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const verifyOTP = useCallback(async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setVerificationStatus('verifying');

    try {
      const adminId = localStorage.getItem('temp_admin_id');
      const { data: admin, error: fetchError } = await supabase
        .from('admins')
        .select('otp_hash, otp_expires_at, otp_attempts, otp_verified')
        .eq('id', adminId)
        .single();

      if (fetchError) throw fetchError;

      if (admin.otp_verified) {
        toast.warning('OTP already verified. Redirecting...');
        completeLogin();
        return;
      }

      if (new Date(admin.otp_expires_at) < new Date()) {
        setVerificationStatus('expired');
        toast.error('OTP has expired. Please request a new one.');
        return;
      }

      if (admin.otp_attempts >= MAX_ATTEMPTS) {
        setVerificationStatus('failed');
        toast.error('Too many failed attempts. Please request a new OTP.');
        return;
      }

      const isValid = await OTPHash.verify(otpCode, admin.otp_hash);

      if (isValid) {
        const { error: updateError } = await supabase
          .from('admins')
          .update({ otp_verified: true, otp_attempts: 0, otp_hash: null, otp_expires_at: null })
          .eq('id', adminId);
        if (updateError) throw updateError;

        setVerificationStatus('success');
        
        // Call completeLogin to handle redirect
        await completeLogin();
      } else {
        const newAttempts = (admin.otp_attempts || 0) + 1;
        const { error: updateError } = await supabase
          .from('admins')
          .update({ otp_attempts: newAttempts })
          .eq('id', adminId);
        if (updateError) throw updateError;

        setVerificationStatus('failed');
        const remaining = MAX_ATTEMPTS - newAttempts;
        toast.error(
          `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
        );
        setOtp(Array(OTP_LENGTH).fill(''));
        focusInput(0);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setVerificationStatus('failed');
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [otp, completeLogin]);

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const resendOTP = useCallback(async () => {
    if (!canResend) {
      toast.warning(`Please wait ${formatTime(timeLeft)} before requesting another OTP`);
      return;
    }

    setIsLoading(true);
    try {
      const adminId    = localStorage.getItem('temp_admin_id');
      const adminEmail = localStorage.getItem('temp_admin_email');
      const adminName  = localStorage.getItem('temp_admin_name');
      const adminRole  = localStorage.getItem('temp_admin_role');

      const newOtpCode = OTPHash.generateOTP();
      const newExpiry  = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
      const hashedOtp  = await OTPHash.hash(newOtpCode);

      const { error: updateError } = await supabase
        .from('admins')
        .update({
          otp_hash: hashedOtp,
          otp_expires_at: newExpiry.toISOString(),
          otp_verified: false,
          last_otp_sent_at: new Date().toISOString(),
          otp_attempts: 0,
        })
        .eq('id', adminId);
      if (updateError) throw updateError;

      const response = await fetch('/api/send-admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          otp: newOtpCode,
          name: adminName || 'Admin User',
          role: adminRole || 'admin',
          expiresIn: 5,
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success('New OTP sent to your email');
        localStorage.setItem('temp_admin_expiry', newExpiry.getTime().toString());
        startTimer(OTP_EXPIRY_SECONDS);
        setOtp(Array(OTP_LENGTH).fill(''));
        setVerificationStatus(null);
        focusInput(0);
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      toast.error('Error sending OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [canResend, timeLeft, startTimer]);

  // ── Go back ───────────────────────────────────────────────────────────────
  const goBackToLogin = useCallback(() => {
    ['temp_admin_id', 'temp_admin_email', 'temp_admin_name',
     'temp_admin_role', 'temp_admin_auth_id', 'temp_admin_expiry'].forEach(
      (k) => localStorage.removeItem(k)
    );
    if (timerRef.current) clearInterval(timerRef.current);
    router.replace('/login');
  }, [router]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!mounted) return null;

  if (!adminData && !redirecting) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center`}>
        <Toaster position="top-center" richColors />
        <FaSpinner className={`animate-spin text-4xl ${currentTheme.textPrimary}`} />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const timerPercent = Math.round((timeLeft / OTP_EXPIRY_SECONDS) * 100);
  const getTimerColor = () => {
    if (timerPercent > 50) return currentTheme.timerHigh;
    if (timerPercent > 20) return currentTheme.timerMedium;
    return currentTheme.timerLow;
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300`}
    >
      <Toaster position="top-center" richColors closeButton />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark'
          ? <FaSun className="text-yellow-400 text-xl" />
          : <FaMoon className="text-gray-700 text-xl" />}
      </button>

      {/* Ambient blobs - Grayscale */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className={`absolute -top-24 -right-24 w-72 h-72 ${currentTheme.glowBlob1} opacity-20 blur-3xl rounded-full animate-pulse`} />
        <div className={`absolute -bottom-24 -left-24 w-72 h-72 ${currentTheme.glowBlob2} opacity-20 blur-3xl rounded-full animate-pulse delay-1000`} />
      </div>

      <div className="relative w-full max-w-md">
        <div
          className={`${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-6 sm:p-8 transition-all duration-300`}
        >
          {/* Back */}
          <button
            onClick={goBackToLogin}
            disabled={redirecting}
            className={`absolute top-4 left-4 ${currentTheme.textSecondary} hover:${currentTheme.textPrimary} transition-colors`}
            aria-label="Back to login"
          >
            <FaArrowLeft className="text-lg sm:text-xl" />
          </button>

          {/* Logos */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Image
              src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png"
              width={60}
              height={60}
              alt="Regent University Logo"
              className="h-12 w-12 sm:h-[60px] sm:w-[60px] object-contain"
            />
            <Image
              src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png"
              width={60}
              height={60}
              alt="E-Voting Logo"
              className="h-12 w-12 sm:h-[60px] sm:w-[60px] object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-5 sm:mb-6">
            <div className="flex justify-center mb-3">
              <div className={`p-3 ${theme === 'dark' ? 'bg-gray-500/20' : 'bg-gray-100'} rounded-full`}>
                <FaShieldAlt className={`${currentTheme.iconColor} text-2xl sm:text-3xl`} />
              </div>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold ${currentTheme.textPrimary}`}>
              Admin Verification
            </h1>
            <p className={`${currentTheme.textSecondary} text-xs sm:text-sm mt-1`}>
              Enter the OTP sent to your email
            </p>
          </div>

          {/* Admin Info */}
          <div className={`mb-5 sm:mb-6 p-3 sm:p-4 rounded-xl border ${currentTheme.adminCardBg}`}>
            <div className="flex items-center gap-3">
              <FaUserShield className={`${currentTheme.iconColor} text-lg sm:text-xl shrink-0`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className={`${currentTheme.textPrimary} font-medium text-sm sm:text-base truncate`}>
                  {adminData?.name}
                </p>
                <p className={`${currentTheme.textSecondary} text-xs sm:text-sm truncate`}>
                  {adminData?.email}
                </p>
                <p className={`${currentTheme.iconColor} text-xs mt-0.5`}>
                  Role: {adminData?.role}
                </p>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="mb-5 sm:mb-6">
            <div className="flex justify-center mb-2">
              <div
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full ${currentTheme.infoCardBg} border ${currentTheme.infoCardBorder}`}
                aria-live="polite"
                aria-label={`Time remaining: ${formatTime(timeLeft)}`}
              >
                <FaClock className={`${getIconColor()} text-sm sm:text-base`} aria-hidden="true" />
                <span className={`${currentTheme.textPrimary} font-mono text-base sm:text-lg`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className={`h-1 rounded-full ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
              <div
                className={`h-full rounded-full transition-all duration-1000 ${getTimerColor()}`}
                style={{ width: `${timerPercent}%` }}
                role="progressbar"
                aria-valuenow={timerPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            {canResend && (
              <p className="text-yellow-400 text-xs mt-2 text-center">
                OTP expired. Click "Resend OTP" to get a new code.
              </p>
            )}
          </div>

          {/* Status banners */}
          <div role="status" aria-live="polite">
            {verificationStatus === 'verifying' && (
              <div className="mb-4 p-3 rounded-xl bg-gray-500/20 border border-gray-400/50 flex items-center gap-2">
                <FaSpinner className="animate-spin text-gray-400 text-sm sm:text-base shrink-0" aria-hidden="true" />
                <p className="text-gray-300 text-xs sm:text-sm">Verifying OTP...</p>
              </div>
            )}
            {verificationStatus === 'success' && (
              <div className="mb-4 p-3 rounded-xl bg-green-500/20 border border-green-400/50 flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-sm sm:text-base shrink-0" aria-hidden="true" />
                <p className="text-green-200 text-xs sm:text-sm">Verification successful. Redirecting...</p>
              </div>
            )}
            {verificationStatus === 'failed' && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/50 flex items-center gap-2">
                <FaTimesCircle className="text-red-400 text-sm sm:text-base shrink-0" aria-hidden="true" />
                <p className="text-red-200 text-xs sm:text-sm">Invalid OTP. Please try again.</p>
              </div>
            )}
            {verificationStatus === 'expired' && (
              <div className="mb-4 p-3 rounded-xl bg-yellow-500/20 border border-yellow-400/50 flex items-center gap-2">
                <FaExclamationTriangle className="text-yellow-400 text-sm sm:text-base shrink-0" aria-hidden="true" />
                <p className="text-yellow-200 text-xs sm:text-sm">OTP expired. Please request a new one.</p>
              </div>
            )}
          </div>

          {/* OTP inputs */}
          <div className="mb-6 sm:mb-8">
            <label className={`${currentTheme.textSecondary} text-xs sm:text-sm block mb-3`}>
              Enter 6-digit OTP
            </label>
            <div className="flex gap-2 sm:gap-3 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  aria-label={`OTP digit ${index + 1} of ${OTP_LENGTH}`}
                  className={[
                    'w-10 h-12 sm:w-12 sm:h-14',
                    'text-center text-xl sm:text-2xl font-bold',
                    currentTheme.inputBg,
                    'border-2 rounded-xl',
                    currentTheme.textPrimary,
                    'focus:outline-none focus:ring-2',
                    currentTheme.inputFocus,
                    'transition-all duration-200',
                    digit
                      ? theme === 'dark'
                        ? 'border-gray-400 bg-gray-500/20 ring-1 ring-gray-400/50'
                        : 'border-gray-500 bg-gray-50 ring-1 ring-gray-400/50'
                      : currentTheme.inputBorder,
                    isLoading || redirecting ? 'opacity-50 cursor-not-allowed' : '',
                  ].join(' ')}
                  disabled={isLoading || redirecting}
                  autoFocus={index === 0 && !redirecting}
                />
              ))}
            </div>
          </div>

          {/* Verify button */}
          <button
            onClick={verifyOTP}
            disabled={isLoading || verificationStatus === 'success' || redirecting}
            className={`w-full py-2.5 sm:py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${currentTheme.buttonPrimary} transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 mb-3 text-sm sm:text-base`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <FaSpinner className="animate-spin text-sm sm:text-base" aria-hidden="true" />
                Verifying...
              </span>
            ) : redirecting ? (
              <span className="flex items-center justify-center gap-2">
                <FaSpinner className="animate-spin text-sm sm:text-base" aria-hidden="true" />
                Redirecting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FaKey className="text-sm sm:text-base" aria-hidden="true" />
                Verify OTP
              </span>
            )}
          </button>

          {/* Resend button */}
          <button
            onClick={resendOTP}
            disabled={!canResend || isLoading || redirecting}
            className={`w-full py-2 rounded-xl font-medium ${currentTheme.buttonSecondary} transition-all duration-300 disabled:opacity-50 text-xs sm:text-sm`}
          >
            {canResend ? 'Resend OTP' : `Resend OTP in ${formatTime(timeLeft)}`}
          </button>

          {/* Footer tips */}
          <div className={`mt-5 sm:mt-6 text-center space-y-1 ${currentTheme.textSecondary} text-[10px] sm:text-xs opacity-60`}>
            <p>For security, this OTP expires in 5 minutes</p>
            <p>Check your spam folder if you do not see the email</p>
            <p>Maximum 5 verification attempts allowed</p>
          </div>
        </div>
      </div>
    </div>
  );
}