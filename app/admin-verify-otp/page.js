// app/admin/admin-verify-otp/page.js
'use client';

import { useState, useEffect } from 'react';
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
  FaMoon
} from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';

export default function AdminVerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();

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

  // Theme styles
  const themeStyles = {
    dark: {
      background: 'from-[#02140f] via-[#063d2e] to-[#0b2545]',
      cardBg: 'bg-white/10 backdrop-blur-2xl',
      cardBorder: 'border-white/20',
      textPrimary: 'text-white',
      textSecondary: 'text-white/70',
      inputBg: 'bg-white/10',
      inputBorder: 'border-white/20',
      inputFocus: 'focus:ring-purple-400 focus:border-transparent',
      buttonPrimary: 'from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500',
      buttonSecondary: 'text-purple-300 hover:text-purple-200',
      accent: 'purple',
      infoCardBg: 'bg-white/5',
      infoCardBorder: 'border-white/10'
    },
    light: {
      background: 'from-purple-50 via-white to-blue-50',
      cardBg: 'bg-white/90 backdrop-blur-2xl',
      cardBorder: 'border-gray-200',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-600',
      inputBg: 'bg-white',
      inputBorder: 'border-gray-300',
      inputFocus: 'focus:ring-purple-500 focus:border-transparent',
      buttonPrimary: 'from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400',
      buttonSecondary: 'text-purple-600 hover:text-purple-700',
      accent: 'purple',
      infoCardBg: 'bg-gray-50',
      infoCardBorder: 'border-gray-200'
    }
  };

  const currentTheme = themeStyles[theme];

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start countdown timer
  const startTimer = (initialSeconds = 300) => {
    if (timerInterval) clearInterval(timerInterval);
    
    setTimeLeft(initialSeconds);
    setCanResend(false);
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimerInterval(interval);
  };

  // Complete login and redirect
  const completeLogin = async () => {
    const authId = localStorage.getItem('temp_admin_auth_id');
    const adminEmail = localStorage.getItem('temp_admin_email');
    const adminRole = localStorage.getItem('temp_admin_role');
    const adminName = localStorage.getItem('temp_admin_name');
    
    // Store session data
    localStorage.setItem('is_authenticated', 'true');
    localStorage.setItem('user_role', adminRole);
    localStorage.setItem('user_email', adminEmail);
    localStorage.setItem('user_name', adminName);
    localStorage.setItem('user_id', authId);
    localStorage.setItem('last_activity', Date.now().toString());
    
    // Set cookies for middleware
    const maxAge = 30 * 60;
    const cookieOptions = `path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `is_authenticated=true; ${cookieOptions}`;
    document.cookie = `user_role=${adminRole}; ${cookieOptions}`;
    document.cookie = `user_email=${encodeURIComponent(adminEmail)}; ${cookieOptions}`;
    if (authId) document.cookie = `user_id=${authId}; ${cookieOptions}`;
    
    // Clear temporary data
    localStorage.removeItem('temp_admin_id');
    localStorage.removeItem('temp_admin_email');
    localStorage.removeItem('temp_admin_name');
    localStorage.removeItem('temp_admin_role');
    localStorage.removeItem('temp_admin_auth_id');
    
    toast.success('✅ Verification successful! Redirecting to dashboard...');
    
    setTimeout(() => {
      router.push('/admin/manage-voters');
    }, 2000);
  };

  // Check OTP status from database
  const checkOTPStatus = async (adminId) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('otp_expires_at, otp_verified')
        .eq('id', adminId)
        .single();
      
      if (error) throw error;
      
      if (data.otp_verified) {
        toast.info('Already verified! Redirecting...');
        completeLogin();
        return true;
      }
      
      if (data.otp_expires_at) {
        const expiryTime = new Date(data.otp_expires_at).getTime();
        const currentTime = Date.now();
        const remaining = Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
        
        if (remaining > 0) {
          startTimer(remaining);
        } else {
          setCanResend(true);
          toast.warning('OTP has expired. Please request a new one.');
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking OTP status:', error);
      return false;
    }
  };

  useEffect(() => {
    // Get admin info from localStorage
    const adminId = localStorage.getItem('temp_admin_id');
    const adminEmail = localStorage.getItem('temp_admin_email');
    const adminName = localStorage.getItem('temp_admin_name');
    const adminRole = localStorage.getItem('temp_admin_role');
    
    if (!adminId || !adminEmail) {
      toast.error('Session expired. Please login again.');
      router.push('/login');
      return;
    }
    
    setAdminData({
      id: adminId,
      email: adminEmail,
      name: adminName || 'Admin User',
      role: adminRole || 'admin'
    });
    
    // Check OTP status from database
    checkOTPStatus(adminId);
    
    // Cleanup timer on unmount
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(0, 1);
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }
    
    setIsLoading(true);
    setVerificationStatus('verifying');
    
    try {
      const adminId = localStorage.getItem('temp_admin_id');
      
      // Get admin data from database
      const { data: admin, error: fetchError } = await supabase
        .from('admins')
        .select('otp_code, otp_expires_at, otp_attempts, otp_verified')
        .eq('id', adminId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Check if already verified
      if (admin.otp_verified) {
        toast.warning('OTP already verified! Redirecting...');
        completeLogin();
        return;
      }
      
      // Check if OTP expired
      if (new Date(admin.otp_expires_at) < new Date()) {
        setVerificationStatus('expired');
        toast.error('OTP has expired. Please request a new one.');
        setIsLoading(false);
        return;
      }
      
      // Check OTP attempts (max 5 attempts)
      if (admin.otp_attempts >= 5) {
        setVerificationStatus('failed');
        toast.error('Too many failed attempts. Please request a new OTP.');
        setIsLoading(false);
        return;
      }
      
      // Verify OTP
      if (admin.otp_code === otpCode) {
        // Update database: mark as verified
        const { error: updateError } = await supabase
          .from('admins')
          .update({
            otp_verified: true,
            otp_attempts: 0,
            otp_code: null,
            otp_expires_at: null
          })
          .eq('id', adminId);
        
        if (updateError) throw updateError;
        
        setVerificationStatus('success');
        completeLogin();
        
      } else {
        // Increment failed attempts
        const newAttempts = (admin.otp_attempts || 0) + 1;
        const { error: updateError } = await supabase
          .from('admins')
          .update({
            otp_attempts: newAttempts
          })
          .eq('id', adminId);
        
        if (updateError) throw updateError;
        
        setVerificationStatus('failed');
        const remainingAttempts = 5 - newAttempts;
        toast.error(`Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`);
        
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
      }
      
    } catch (error) {
      console.error('OTP verification error:', error);
      setVerificationStatus('failed');
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!canResend) {
      toast.warning(`Please wait ${formatTime(timeLeft)} before requesting another OTP`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const adminId = localStorage.getItem('temp_admin_id');
      const adminEmail = localStorage.getItem('temp_admin_email');
      const adminName = localStorage.getItem('temp_admin_name');
      const adminRole = localStorage.getItem('temp_admin_role');
      
      // Generate new OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const newExpiry = new Date(Date.now() + 5 * 60 * 1000);
      
      // Update database with new OTP
      const { error: updateError } = await supabase
        .from('admins')
        .update({
          otp_code: newOtp,
          otp_expires_at: newExpiry.toISOString(),
          otp_verified: false,
          last_otp_sent_at: new Date().toISOString(),
          otp_attempts: 0
        })
        .eq('id', adminId);
      
      if (updateError) throw updateError;
      
      // Send new OTP via email
      const response = await fetch('/api/send-admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          otp: newOtp,
          name: adminName || 'Admin User',
          role: adminRole || 'admin',
          expiresIn: 5
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('✅ New OTP sent to your email!');
        
        // Reset timer
        startTimer(300);
        setOtp(['', '', '', '', '', '']);
        setVerificationStatus(null);
        document.getElementById('otp-0')?.focus();
        
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
      
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error('Error sending OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToLogin = () => {
    // Clear all temporary data
    localStorage.removeItem('temp_admin_id');
    localStorage.removeItem('temp_admin_email');
    localStorage.removeItem('temp_admin_name');
    localStorage.removeItem('temp_admin_role');
    localStorage.removeItem('temp_admin_auth_id');
    
    if (timerInterval) clearInterval(timerInterval);
    router.push('/login');
  };

  if (!mounted) {
    return null;
  }

  if (!adminData) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center`}>
        <Toaster position="top-center" richColors />
        <FaSpinner className={`animate-spin text-4xl ${currentTheme.textPrimary}`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300`}>
      <Toaster position="top-center" richColors closeButton />
      
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
      
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className={`absolute top-[-100px] right-[-100px] w-[300px] h-[300px] ${theme === 'dark' ? 'bg-purple-600' : 'bg-purple-400'} opacity-20 blur-3xl rounded-full animate-pulse`}></div>
        <div className={`absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-400'} opacity-20 blur-3xl rounded-full animate-pulse delay-1000`}></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className={`${currentTheme.cardBg} border ${currentTheme.cardBorder} rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-6 sm:p-8 transition-all duration-300`}>
          
          {/* Back Button */}
          <button
            onClick={goBackToLogin}
            className="absolute top-4 left-4 text-white/70 hover:text-white transition-colors"
          >
            <FaArrowLeft className="text-lg sm:text-xl" />
          </button>

          {/* Logos */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Image 
              src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png"
              width={50}
              height={50}
              alt="Regent University Logo"
              className="h-12 w-12 sm:h-[60px] sm:w-[60px] object-contain"
            />
            <Image 
              src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png"
              width={50}
              height={50}
              alt="E-Voting Logo"
              className="h-12 w-12 sm:h-[60px] sm:w-[60px] object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-5 sm:mb-6">
            <div className="flex justify-center mb-3">
              <div className={`p-3 ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'} rounded-full`}>
                <FaShieldAlt className={`${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} text-2xl sm:text-3xl`} />
              </div>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold ${currentTheme.textPrimary}`}>Admin Verification</h1>
            <p className={`${currentTheme.textSecondary} text-xs sm:text-sm mt-1`}>
              Enter the OTP sent to your email
            </p>
          </div>

          {/* Admin Info Card */}
          <div className={`mb-5 sm:mb-6 p-3 sm:p-4 rounded-xl ${theme === 'dark' ? 'bg-purple-500/20 border border-purple-400/50' : 'bg-purple-50 border border-purple-200'}`}>
            <div className="flex items-center gap-3">
              <FaUserShield className={`${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} text-lg sm:text-xl`} />
              <div className="flex-1 min-w-0">
                <p className={`${currentTheme.textPrimary} font-medium text-sm sm:text-base truncate`}>{adminData.name}</p>
                <p className={`${currentTheme.textSecondary} text-xs sm:text-sm truncate`}>{adminData.email}</p>
                <p className={`${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'} text-xs mt-0.5`}>Role: {adminData.role}</p>
              </div>
            </div>
          </div>

          {/* Timer Display */}
          <div className="mb-5 sm:mb-6 text-center">
            <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full ${currentTheme.infoCardBg} border ${currentTheme.infoCardBorder}`}>
              <FaClock className="text-yellow-400 text-sm sm:text-base" />
              <span className={`${currentTheme.textPrimary} font-mono text-base sm:text-lg`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            {!canResend && timeLeft > 0 && (
              <p className={`${currentTheme.textSecondary} text-xs mt-2 opacity-60`}>
                OTP expires in {formatTime(timeLeft)}
              </p>
            )}
            {canResend && (
              <p className="text-yellow-400 text-xs mt-2">
                OTP expired. Click "Resend OTP" to get a new code.
              </p>
            )}
          </div>

          {/* Verification Status */}
          {verificationStatus === 'verifying' && (
            <div className="mb-4 p-3 rounded-xl bg-blue-500/20 border border-blue-400/50">
              <div className="flex items-center gap-2">
                <FaSpinner className="animate-spin text-blue-400 text-sm sm:text-base" />
                <p className="text-blue-200 text-xs sm:text-sm">Verifying OTP...</p>
              </div>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/20 border border-green-400/50">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-400 text-sm sm:text-base" />
                <p className="text-green-200 text-xs sm:text-sm">Verification successful! Redirecting...</p>
              </div>
            </div>
          )}

          {verificationStatus === 'failed' && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/50">
              <div className="flex items-center gap-2">
                <FaTimesCircle className="text-red-400 text-sm sm:text-base" />
                <p className="text-red-200 text-xs sm:text-sm">Invalid OTP. Please try again.</p>
              </div>
            </div>
          )}

          {verificationStatus === 'expired' && (
            <div className="mb-4 p-3 rounded-xl bg-yellow-500/20 border border-yellow-400/50">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-yellow-400 text-sm sm:text-base" />
                <p className="text-yellow-200 text-xs sm:text-sm">OTP expired. Please request a new one.</p>
              </div>
            </div>
          )}

          {/* OTP Input Fields */}
          <div className="mb-6 sm:mb-8">
            <label className={`${currentTheme.textSecondary} text-xs sm:text-sm block mb-3`}>
              Enter 6-digit OTP
            </label>
            <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`
                    w-10 h-12 sm:w-12 sm:h-14 
                    text-center text-xl sm:text-2xl font-bold 
                    ${currentTheme.inputBg} border-2 
                    rounded-xl ${currentTheme.textPrimary}
                    focus:outline-none focus:ring-2 ${currentTheme.inputFocus}
                    transition-all duration-200
                    ${digit 
                      ? `${theme === 'dark' ? 'border-purple-400 bg-purple-500/20' : 'border-purple-500 bg-purple-50'} ring-1 ring-purple-400/50` 
                      : currentTheme.inputBorder
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  disabled={isLoading}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          {/* Verify Button */}
          <button
            onClick={verifyOTP}
            disabled={isLoading || verificationStatus === 'success'}
            className={`w-full py-2.5 sm:py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${currentTheme.buttonPrimary} transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 mb-3 text-sm sm:text-base`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <FaSpinner className="animate-spin text-sm sm:text-base" />
                <span>Verifying...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <FaKey className="text-sm sm:text-base" /> Verify OTP
              </div>
            )}
          </button>

          {/* Resend Button */}
          <button
            onClick={resendOTP}
            disabled={!canResend || isLoading}
            className={`w-full py-2 rounded-xl font-medium ${currentTheme.buttonSecondary} transition-all duration-300 disabled:opacity-50 text-xs sm:text-sm`}
          >
            {canResend ? 'Resend OTP' : `Resend OTP in ${formatTime(timeLeft)}`}
          </button>

          {/* Info Footer */}
          <div className={`mt-5 sm:mt-6 text-center space-y-1 ${currentTheme.textSecondary} text-[10px] sm:text-xs opacity-60`}>
            <p>🔐 For security, this OTP expires in 5 minutes</p>
            <p>📧 Check your spam folder if you don't see the email</p>
            <p>👑 Maximum 5 verification attempts allowed</p>
          </div>
        </div>
      </div>
    </div>
  );
}