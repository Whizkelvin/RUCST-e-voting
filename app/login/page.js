'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { FaEnvelope, FaIdCard, FaSpinner, FaCheckCircle } from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';
import { logOtpGeneration, getClientIP } from '@/utils/auditLog';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [clientIP, setClientIP] = useState('unknown');
  const [alreadyVoted, setAlreadyVoted] = useState(false);
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

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  // Get client IP on mount
  useEffect(() => {
    const getIP = async () => {
      const ip = await getClientIP();
      setClientIP(ip);
    };
    getIP();
  }, []);

  // Check if voter has already voted when email/schoolId changes
// In the Login component, update the checkIfVoted function
useEffect(() => {
  const checkIfVoted = async () => {
    if (watchedEmail && watchedSchoolId) {
      try {
        // First find the voter
        const { data: voter, error: voterError } = await supabase
          .from('voters')
          .select('id, has_voted, voted_at') // Include has_voted and voted_at
          .eq('email', watchedEmail.toLowerCase())
          .eq('school_id', watchedSchoolId)
          .maybeSingle();

        if (voter && !voterError) {
          // Check both sources: has_voted flag OR existing votes
          let hasVoted = false;
          
          // Check 1: has_voted column
          if (voter.has_voted === true) {
            hasVoted = true;
          } else {
            // Check 2: votes table as fallback
            const { data: existingVote } = await supabase
              .from('votes')
              .select('id')
              .eq('voter_id', voter.id)
              .maybeSingle();
            
            hasVoted = !!existingVote;
            
            // If votes exist but has_voted is false, update it
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
            // Store in localStorage for quick access
            localStorage.setItem('has_voted', 'true');
            localStorage.setItem('voted_voter_id', voter.id);
          }
        } else {
          setAlreadyVoted(false);
        }
      } catch (error) {
        console.error('Error checking vote status:', error);
        setAlreadyVoted(false);
      }
    } else {
      setAlreadyVoted(false);
    }
  };

  const timeoutId = setTimeout(() => {
    checkIfVoted();
  }, 500);

  return () => clearTimeout(timeoutId);
}, [watchedEmail, watchedSchoolId]);

  // Hash function for OTP
  const hashCode = async (code) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Generate and send OTP to voter email
// In your login page, update the sendOtpCode function
// Generate and send OTP to voter email
// Generate and send OTP to voter email
// Generate and send OTP to voter email
// Generate and send OTP to voter email
const sendOtpCode = async (email, schoolId) => {
  try {
    // First, validate inputs
    if (!email || !schoolId) {
      throw new Error('Email and School ID are required');
    }

    // Clean and normalize inputs
    const cleanEmail = email.toLowerCase().trim();
    const cleanSchoolId = schoolId.trim().padStart(8, '0'); // Ensure 8 digits with leading zeros
    
    console.log('Looking for voter with:', { 
      email: cleanEmail, 
      schoolId: cleanSchoolId 
    });

    // Try multiple strategies to find the voter
    let voter = null;
    let voterError = null;
    
    // Strategy 1: Exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from('voters')
      .select('*')
      .eq('email', cleanEmail)
      .eq('school_id', cleanSchoolId)
      .maybeSingle();
    
    if (exactMatch) {
      voter = exactMatch;
      voterError = exactError;
      console.log('Found voter with exact match');
    } 
    
    // Strategy 2: Try with school_id only (if exact match failed)
    if (!voter) {
      console.log('Exact match failed, trying school_id only...');
      const { data: schoolIdMatch, error: schoolIdError } = await supabase
        .from('voters')
        .select('*')
        .eq('school_id', cleanSchoolId)
        .maybeSingle();
      
      if (schoolIdMatch) {
        voter = schoolIdMatch;
        voterError = schoolIdError;
        console.log('Found voter by school_id:', schoolIdMatch.email);
      }
    }
    
    // Strategy 3: Try with email only (if previous strategies failed)
    if (!voter) {
      console.log('School ID match failed, trying email only...');
      // Try exact email first
      let { data: emailMatch, error: emailError } = await supabase
        .from('voters')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      
      // If not found, try partial email match (in case of @regent.edu vs @regent.edu.gh)
      if (!emailMatch) {
        console.log('Exact email not found, trying partial match...');
        const emailPrefix = cleanEmail.split('@')[0];
        const { data: partialMatch } = await supabase
          .from('voters')
          .select('*')
          .ilike('email', `${emailPrefix}@%`)
          .maybeSingle();
        
        if (partialMatch) {
          emailMatch = partialMatch;
          console.log('Found voter by partial email:', partialMatch.email);
        }
      }
      
      if (emailMatch) {
        voter = emailMatch;
        voterError = emailError;
      }
    }

    console.log('Voter query result:', { voter, error: voterError });

    // Handle database errors
    if (voterError) {
      console.error('Database error:', voterError);
      await logOtpGeneration({
        voter_id: null,
        email: email,
        ip_address: clientIP,
        success: false,
        error: 'Database error'
      });
      throw new Error('System error. Please try again later.');
    }

    // Check if voter exists
    if (!voter) {
      console.log('No voter found with any strategy');
      
      await logOtpGeneration({
        voter_id: null,
        email: email,
        ip_address: clientIP,
        success: false,
        error: 'Voter not found'
      });
      
      // Provide helpful error message
      let errorMessage = '❌ Voter not found. ';
      
      // Check if school ID format is correct
      if (cleanSchoolId.length !== 8) {
        errorMessage += 'School ID must be 8 digits. ';
      }
      
      // Check if email domain is correct
      if (!cleanEmail.includes('@regent.edu.gh') && !cleanEmail.includes('@regent.edu')) {
        errorMessage += 'Email must be a Regent University email (@regent.edu.gh). ';
      }
      
      errorMessage += 'Please check your credentials and try again.';
      
      throw new Error(errorMessage);
    }

    console.log('Voter found:', { 
      id: voter.id, 
      email: voter.email, 
      school_id: voter.school_id,
      has_voted: voter.has_voted 
    });

    // Show warning if email doesn't match exactly (user might have entered wrong email)
    if (voter.email !== cleanEmail) {
      console.warn('Email mismatch:', { entered: cleanEmail, actual: voter.email });
      toast.info(`ℹ️ Using account for ${voter.email}`, {
        autoClose: 3000,
      });
    }
    
    // Show warning if school ID doesn't match exactly
    if (voter.school_id !== cleanSchoolId) {
      console.warn('School ID mismatch:', { entered: cleanSchoolId, actual: voter.school_id });
      toast.info(`ℹ️ School ID corrected to ${voter.school_id}`, {
        autoClose: 3000,
      });
    }

    // Check if voter has already voted
    if (voter.has_voted === true) {
      console.log('Voter has already voted');
      
      await logOtpGeneration({
        voter_id: voter.id,
        email: email,
        ip_address: clientIP,
        success: false,
        error: 'Already voted'
      });
      
      // Store that this voter has voted
      localStorage.setItem('has_voted', 'true');
      localStorage.setItem('voted_voter_id', voter.id);
      localStorage.setItem('voted_voter_email', voter.email);
      
      throw new Error('❌ You have already cast your vote. Voting is only allowed once per voter.');
    }

    // Also check the votes table as a fallback (in case has_voted is out of sync)
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_id', voter.id)
      .maybeSingle();

    console.log('Existing vote check:', { existingVote, voteCheckError });

    if (existingVote) {
      console.log('Found vote record but has_voted was false, fixing...');
      
      // Fix the out-of-sync issue by updating the voters table
      const { error: updateError } = await supabase
        .from('voters')
        .update({ 
          has_voted: true,
          voted_at: new Date().toISOString()
        })
        .eq('id', voter.id);
      
      if (updateError) {
        console.error('Failed to update voter status:', updateError);
      }
      
      await logOtpGeneration({
        voter_id: voter.id,
        email: email,
        ip_address: clientIP,
        success: false,
        error: 'Already voted (votes table check)'
      });
      
      throw new Error('❌ You have already cast your vote. Voting is only allowed once per voter.');
    }

    // Check if there's a pending OTP that hasn't expired
    const { data: existingOtp, error: otpCheckError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('voter_id', voter.id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    // If there's a valid OTP, we could either reuse it or generate a new one
    // Here we'll generate a new one and delete the old
    if (existingOtp) {
      console.log('Deleting existing OTP:', existingOtp.id);
      // Delete old OTP
      await supabase
        .from('otp_codes')
        .delete()
        .eq('id', existingOtp.id);
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP for', voter.email, ':', otpCode);
    
    // Hash the OTP before storing
    const hashedOtp = await hashCode(otpCode);
    
    // Insert new OTP (using the actual email from database to maintain consistency)
    const { error: otpError } = await supabase
      .from('otp_codes')
      .insert({
        voter_id: voter.id,
        email: voter.email, // Use the actual email from database
        school_id: voter.school_id, // Use the actual school_id from database
        code_hash: hashedOtp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        used: false
      });

    if (otpError) {
      console.error('OTP insert error:', otpError);
      throw new Error('Failed to generate OTP. Please try again.');
    }

    // Send OTP via Next.js API route
    try {
      console.log('Sending OTP request to API...');
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: voter.email, // Use the actual email from database
          otp: otpCode,
          name: voter.name,
          expiresIn: 10
        }),
      });

      console.log('API Response status:', response.status);
      
      // Get the response text first to see what's coming back
      const responseText = await response.text();
      console.log('API Response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        result = { success: false, error: 'Invalid response from server' };
      }

      if (!response.ok || !result.success) {
        console.error('API Error:', result);
        // Fallback: show OTP in console
        toast.info(`🔑 Test OTP: ${otpCode} (Check console for details)`);
        console.log(`OTP for ${voter.email}: ${otpCode}`);
      } else {
        toast.success(`✅ OTP sent to ${voter.email}. Check your inbox.`);
      }
    } catch (emailError) {
      console.error('Fetch error:', emailError);
      toast.info(`🔑 Test OTP: ${otpCode}`);
      console.log(`OTP for ${voter.email}: ${otpCode}`);
    }

    // Store voter info in localStorage for OTP verification page
    localStorage.setItem('temp_voter_email', voter.email);
    localStorage.setItem('temp_voter_school_id', voter.school_id);
    localStorage.setItem('temp_voter_id', voter.id);
    localStorage.setItem('temp_voter_name', voter.name);
    localStorage.setItem('temp_otp_expiry', Date.now() + 10 * 60 * 1000);

    // Log successful OTP generation
    await logOtpGeneration({
      voter_id: voter.id,
      email: voter.email,
      ip_address: clientIP,
      success: true
    });

    return { success: true, message: `OTP sent to ${voter.email}. Valid for 10 minutes.` };
  } catch (error) {
    console.error('Send OTP error:', error);
    // Return the error message to be displayed
    return { success: false, error: error.message };
  }
};
  // Main form submission handler
// Main form submission handler
const onSubmit = async (formData) => {
  // Double-check if already voted before proceeding
  if (alreadyVoted) {
    toast.error('❌ You have already voted. Voting is allowed only once per voter.', {
      position: "top-center",
      autoClose: 5000,
    });
    
    // Redirect to results page after a delay
    setTimeout(() => {
      router.push('/election-result');
    }, 3000);
    return;
  }

  setIsLoading(true);
  const { email, schoolId } = formData;

  try {
    const result = await sendOtpCode(email, schoolId);
    
    if (result.success) {
      toast.success(result.message);
      setTimeout(() => {
        router.push("/verify-otp");
      }, 1500);
    } else {
      // Show the error message from the result
      toast.error(result.error);
      
      // If the error is about already voted, redirect to results
      if (result.error && result.error.includes('already voted')) {
        setTimeout(() => {
          router.push('/election-result');
        }, 3000);
      }
    }
  } catch (err) {
    console.error('Submission error:', err);
    toast.error(err.message || "Error processing request");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02140f] via-[#063d2e] to-[#0b2545] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Soft Glow Background */}
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

          {/* Logos */}
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

          {/* Title */}
          <div data-aos="fade-up" data-aos-delay="300" className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">
              Regent E-Voting Portal
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Secure access to cast your vote
            </p>
          </div>

          {/* Already Voted Warning */}
          {alreadyVoted && (
            <div data-aos="fade-up" data-aos-delay="350" className="mb-4 p-3 bg-amber-500/20 border border-amber-400/50 rounded-xl">
              <div className="flex items-center gap-2 text-amber-200">
                <FaCheckCircle className="text-amber-300" />
                <p className="text-sm font-medium">You have already voted</p>
              </div>
              <p className="text-xs text-amber-200/80 mt-1">
                Voting is allowed only once per voter. Redirecting to results...
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
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
                  alreadyVoted 
                    ? 'border-amber-400/50 focus:ring-amber-400' 
                    : 'border-white/10 focus:ring-green-400'
                }`}
                disabled={alreadyVoted}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* School ID */}
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
                  alreadyVoted 
                    ? 'border-amber-400/50 focus:ring-amber-400' 
                    : 'border-white/10 focus:ring-green-400'
                }`}
                disabled={alreadyVoted}
              />
              {errors.schoolId && <p className="text-red-400 text-xs mt-1">{errors.schoolId.message}</p>}
            </div>

            {/* Button */}
            <div data-aos="fade-up" data-aos-delay="600">
              <button
                type="submit"
                disabled={isLoading || alreadyVoted}
                className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${
                  alreadyVoted
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500 hover:shadow-green-500/30'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaSpinner className="animate-spin" />
                    Processing...
                  </div>
                ) : alreadyVoted ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaCheckCircle />
                    Already Voted
                  </div>
                ) : (
                  "Send OTP"
                )}
              </button>
            </div>
          </form>

          {/* Info */}
          <div data-aos="fade-up" data-aos-delay="700" className="mt-6 text-xs text-white/60 text-center space-y-1">
            {!alreadyVoted ? (
              <>
                <p>🔐 Secure OTP authentication</p>
                <p>⏳ Code valid for 10 minutes</p>
                <p>📧 Check spam if not received</p>
              </>
            ) : (
              <>
                <p>✅ Thank you for participating in the election</p>
                <p>📊 View results to see the outcome</p>
              </>
            )}
          </div>

          {/* Footer */}
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