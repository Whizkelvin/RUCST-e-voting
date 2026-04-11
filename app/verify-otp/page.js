// app/verify-otp/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { OTPHash } from '@/utils/otpHash';
import { toast } from 'sonner';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaArrowLeft } from 'react-icons/fa';

export default function VerifyOTPPage() {
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(900);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [voterInfo, setVoterInfo] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const voterId = localStorage.getItem('temp_voter_id');
    const voterEmail = localStorage.getItem('temp_voter_email');
    const voterName = localStorage.getItem('temp_voter_name');
    const expiryTime = localStorage.getItem('temp_otp_expiry');
    
    if (!voterId || !voterEmail) {
      toast.error('Session expired. Please login again.');
      router.push('/login');
      return;
    }
    
    setVoterInfo({ id: voterId, email: voterEmail, name: voterName });
    
    // Get OTP attempts info from database
    const getOTPInfo = async () => {
      const { data: otpRecord } = await supabase
        .from('otp_codes')
        .select('attempts, max_attempts')
        .eq('voter_id', voterId)
        .eq('email', voterEmail)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (otpRecord) {
        setAttempts(otpRecord.attempts || 0);
        setMaxAttempts(otpRecord.max_attempts || 3);
      }
    };
    
    getOTPInfo();
    
    // Timer countdown
    if (expiryTime) {
      const remaining = Math.max(0, Math.floor((parseInt(expiryTime) - Date.now()) / 1000));
      setTimeRemaining(remaining);
    }
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error('OTP expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    if (attempts >= maxAttempts) {
      toast.error('Too many failed attempts. Please request a new OTP.');
      return;
    }
    
    setLoading(true);
    
    try {
      const voterId = localStorage.getItem('temp_voter_id');
      const voterEmail = localStorage.getItem('temp_voter_email');
      
      // Get the stored hash from database
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('voter_id', voterId)
        .eq('email', voterEmail)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (otpError || !otpRecord) {
        toast.error('No valid OTP found. Please request a new one.');
        router.push('/login');
        return;
      }
      
      // ✅ VERIFY: Hash the entered OTP and compare with stored hash
      const isValid = await OTPHash.verify(otpCode, otpRecord.code_hash);
      
      if (!isValid) {
        // Increment failed attempts
        const newAttempts = (otpRecord.attempts || 0) + 1;
        await supabase
          .from('otp_codes')
          .update({ attempts: newAttempts })
          .eq('id', otpRecord.id);
        
        setAttempts(newAttempts);
        const remaining = maxAttempts - newAttempts;
        
        if (remaining > 0) {
          toast.error(`Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
        } else {
          toast.error('Too many failed attempts. Please request a new OTP.');
          // Invalidate this OTP
          await supabase
            .from('otp_codes')
            .update({ used: true })
            .eq('id', otpRecord.id);
        }
        
        setLoading(false);
        return;
      }
      
      // ✅ SUCCESS: OTP is valid
      console.log('✅ OTP verified successfully!');
      
      // Mark OTP as used
      await supabase
        .from('otp_codes')
        .update({ 
          used: true,
          verified_at: new Date().toISOString()
        })
        .eq('id', otpRecord.id);
      
      // Mark voter as authenticated
      localStorage.setItem('voter_authenticated', 'true');
      localStorage.setItem('voter_id', voterId);
      localStorage.removeItem('temp_otp_expiry');
      
      toast.success('✅ OTP verified! Redirecting to voting...');
      
      // Redirect to voting page
      setTimeout(() => {
        router.push('/vote/cast');
      }, 1500);
      
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const voterEmail = localStorage.getItem('temp_voter_email');
    const voterSchoolId = localStorage.getItem('temp_voter_school_id');
    
    if (!voterEmail || !voterSchoolId) {
      toast.error('Session expired. Please login again.');
      router.push('/login');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: voterEmail,
          schoolId: voterSchoolId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('New OTP sent to your email');
        setTimeRemaining(900);
        setAttempts(0);
        localStorage.setItem('temp_otp_expiry', (Date.now() + 15 * 60 * 1000).toString());
      } else {
        toast.error(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  if (!voterInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <FaCheckCircle className="text-3xl text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Verify Your Identity</h2>
          <p className="text-gray-300 mt-2">
            Enter the 6-digit code sent to<br />
            <span className="font-semibold text-green-400">{voterInfo.email}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2 text-sm">OTP Code</label>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white text-center text-2xl tracking-widest focus:outline-none focus:border-green-500"
              placeholder="000000"
              autoFocus
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Time remaining:</span>
            <span className={`font-mono font-bold ${timeRemaining < 60 ? 'text-red-400' : 'text-green-400'}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>

          {attempts > 0 && (
            <div className="text-center text-sm">
              <span className="text-yellow-400">
                Attempts: {attempts} of {maxAttempts}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || timeRemaining === 0 || attempts >= maxAttempts}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <FaSpinner className="animate-spin" />
                Verifying...
              </div>
            ) : (
              'Verify & Continue'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={loading || timeRemaining > 800}
              className="text-gray-400 hover:text-green-400 text-sm transition disabled:opacity-50"
            >
              Didn't receive code? Resend OTP
            </button>
          </div>

          <div className="text-center pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition"
            >
              <FaArrowLeft className="text-xs" />
              Back to Login
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>🔒 Your OTP is encrypted and securely stored</p>
          <p className="mt-1">Code expires in 15 minutes for security</p>
        </div>
      </div>
    </div>
  );
}