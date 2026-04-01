// app/login/page.js - Simplified version that works with the auth hook
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { FaEnvelope, FaIdCard, FaSpinner, FaCheckCircle, FaUserGraduate } from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';
import { logOtpGeneration, getClientIP } from '@/utils/auditLog';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [clientIP, setClientIP] = useState('unknown');
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [isVoter, setIsVoter] = useState(false);
  const router = useRouter();
  const { login: adminLogin, isAuthenticated } = useAdminAuth();

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

  // Check if user is a voter (for display only, not authentication)
  useEffect(() => {
    const checkIfVoter = async () => {
      if (watchedEmail && watchedSchoolId) {
        try {
          const cleanEmail = watchedEmail.toLowerCase().trim();
          const cleanSchoolId = watchedSchoolId.trim().padStart(8, '0');
          
          const { data: voter, error } = await supabase
            .from('voters')
            .select('has_voted')
            .eq('email', cleanEmail)
            .eq('school_id', cleanSchoolId)
            .maybeSingle();
          
          if (voter && !error) {
            setIsVoter(true);
            setAlreadyVoted(voter.has_voted || false);
          } else {
            setIsVoter(false);
            setAlreadyVoted(false);
          }
        } catch (error) {
          setIsVoter(false);
        }
      } else {
        setIsVoter(false);
        setAlreadyVoted(false);
      }
    };
    
    const timeoutId = setTimeout(checkIfVoter, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedEmail, watchedSchoolId]);

  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleVoterLogin = async (email, schoolId) => {
    setIsLoading(true);
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
        toast.error('Voter not found. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      // Check if voter has already voted
      if (voter.has_voted === true) {
        toast.error('❌ You have already cast your vote.');
        setTimeout(() => {
          router.push('/election-result');
        }, 3000);
        setIsLoading(false);
        return;
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
        
        toast.error('❌ You have already cast your vote.');
        setTimeout(() => {
          router.push('/election-result');
        }, 3000);
        setIsLoading(false);
        return;
      }

      // Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await hashCode(otpCode);
      
      // Delete any existing OTP
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

      // Send OTP
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

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.info(`🔑 Test OTP: ${otpCode}`);
        } else {
          toast.success(`✅ OTP sent to ${email}. Check your inbox.`);
        }
      } catch (emailError) {
        toast.info(`🔑 Test OTP: ${otpCode}`);
      }

      // Store voter info
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
      toast.error(error.message || 'Error during login');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (formData) => {
    setIsLoading(true);
    const { email, schoolId } = formData;

    try {
      // Check if user is a voter first
      const cleanEmail = email.toLowerCase().trim();
      const cleanSchoolId = schoolId.trim().padStart(8, '0');
      
      const { data: voter } = await supabase
        .from('voters')
        .select('id')
        .eq('email', cleanEmail)
        .eq('school_id', cleanSchoolId)
        .maybeSingle();
      
      if (voter) {
        // Voter login flow
        await handleVoterLogin(email, schoolId);
      } else {
        // Admin/Staff login flow - use the adminLogin function
        const result = await adminLogin(email, schoolId);
        
        if (result.success) {
          toast.success('Login successful! Redirecting...');
          setTimeout(() => {
            // The adminLogin function will handle the redirect based on role
            // Check localStorage for role to determine redirect
            const userRole = localStorage.getItem('user_role');
            
            switch (userRole) {
              case 'dean':
                router.push('/admin/dean-dashboard');
                break;
              case 'electoral_commission':
              case 'ec':
                router.push('/admin/electoral-commission-dashboard');
                break;
              case 'it_admin':
                router.push('/admin/it-admin-dashboard');
                break;
              case 'hod':
                router.push('/admin/hod-dashboard');
                break;
              default:
                router.push('/admin/manage-voters');
            }
          }, 1500);
        } else {
          toast.error(result.error || 'Invalid credentials');
        }
      }
      
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.message || "Error processing request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02140f] via-[#063d2e] to-[#0b2545] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-green-600 opacity-20 blur-3xl rounded-full"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-yellow-500 opacity-20 blur-3xl rounded-full"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div 
          data-aos="fade-up"
          className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8"
        >
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

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Regent E-Voting Portal</h1>
            <p className="text-sm text-white/70 mt-1">Secure access to cast your vote</p>
          </div>

          {isVoter && alreadyVoted && (
            <div className="mb-4 p-3 bg-amber-500/20 border border-amber-400/50 rounded-xl">
              <p className="text-amber-200 text-sm">⚠️ You have already voted. Redirecting to results...</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="relative group">
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
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="relative group">
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
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              />
              {errors.schoolId && <p className="text-red-400 text-xs mt-1">{errors.schoolId.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading || (isVoter && alreadyVoted)}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin" />
                  Verifying...
                </div>
              ) : isVoter && alreadyVoted ? (
                <div className="flex items-center justify-center gap-2">
                  <FaCheckCircle /> Already Voted
                </div>
              ) : isVoter ? (
                "Send OTP"
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-6 text-xs text-white/60 text-center">
            <p>🔐 Enter your email and school ID to login</p>
            <p className="text-yellow-400/60 mt-1">⚠️ Admin/Staff: Use your School ID as password</p>
          </div>
        </div>
      </div>
    </div>
  );
}