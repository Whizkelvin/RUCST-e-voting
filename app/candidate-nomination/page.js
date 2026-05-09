// app/candidate-nomination/page.js
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { 
  FaUser, FaEnvelope, FaIdCard, FaKey, FaSpinner, 
  FaCheckCircle, FaFileAlt, FaGraduationCap, FaBuilding
} from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';

export default function CandidateNomination() {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeValid, setCodeValid] = useState(false);
  const [codeData, setCodeData] = useState(null);
  const [voterExists, setVoterExists] = useState(false);
  const [voterData, setVoterData] = useState(null);
  const [existingNomination, setExistingNomination] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const {
    register, handleSubmit,
    formState: { errors },
    watch, setValue, getValues
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      secretCode: '', email: '', schoolId: '', name: '',
      position: '', department: '', yearOfStudy: '', manifesto: ''
    }
  });

  const watchedSecretCode = watch('secretCode');
  const manifestoLength = watch('manifesto')?.length || 0;

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

  // Get icon color based on theme
  const getIconColor = () => {
    return theme === 'light' ? 'text-gray-700' : 'text-gray-300';
  };

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  const getClientIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip;
    } catch { return 'unknown'; }
  };

  const verifySecretCode = async () => {
    if (!watchedSecretCode || watchedSecretCode.length < 6) {
      toast.warning('Please enter a valid secret code');
      return;
    }
    setIsVerifying(true);
    try {
      const { data: code, error } = await supabase
        .from('nomination_codes')
        .select('*')
        .eq('code', watchedSecretCode.toUpperCase().trim())
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;
      if (!code) {
        toast.error('Invalid or expired secret code. Please contact the Electoral Commission.');
        setCodeValid(false); setCodeData(null); return;
      }

      setCodeValid(true); setCodeData(code);
      setValue('email', code.candidate_email);
      setValue('name', code.candidate_name);
      setValue('position', code.position);
      if (code.department) setValue('department', code.department);
      if (code.year_of_study) setValue('yearOfStudy', code.year_of_study.toString());
      toast.success('Secret code verified. Please complete your nomination details.');
      checkVoterExists(code.candidate_email);
    } catch (error) {
      toast.error('Error verifying code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const checkVoterExists = async (email) => {
    try {
      const { data: voter, error } = await supabase
        .from('voters')
        .select('id, name, email, school_id, department, year_of_study, has_voted')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (voter && !error) {
        setVoterExists(true); setVoterData(voter);
        if (voter.school_id) setValue('schoolId', voter.school_id);
        if (voter.department && !getValues('department')) setValue('department', voter.department);
        if (voter.year_of_study && !getValues('yearOfStudy')) setValue('yearOfStudy', voter.year_of_study.toString());

        const { data: existingCandidate } = await supabase
          .from('candidates')
          .select('id, position, status, is_approved, rejection_reason')
          .eq('candidate_email', email.toLowerCase().trim())
          .maybeSingle();

        if (existingCandidate) {
          setExistingNomination(existingCandidate);
          const msg = existingCandidate.is_approved === true
            ? `You are already an approved candidate for ${existingCandidate.position}.`
            : existingCandidate.is_approved === false && existingCandidate.rejection_reason
            ? `Your nomination for ${existingCandidate.position} was rejected. Reason: ${existingCandidate.rejection_reason}`
            : `You already have a pending nomination for ${existingCandidate.position}.`;
          toast.warning(msg);
          setCodeValid(false);
        }
      } else {
        setVoterExists(false); setVoterData(null);
        toast.info('Please ensure your details match your student records.');
      }
    } catch { setVoterExists(false); }
  };

  const onSubmit = async (formData) => {
    if (!codeValid || !codeData) { toast.error('Please verify your secret code first'); return; }
    if (existingNomination) { toast.error('You already have an existing nomination.'); return; }
    setIsLoading(true);
    try {
      const { data: codeCheck, error: codeError } = await supabase
        .from('nomination_codes')
        .select('is_used, expires_at')
        .eq('code', codeData.code)
        .maybeSingle();

      if (codeError || !codeCheck) throw new Error('Nomination code not found');
      if (codeCheck.is_used) throw new Error('This nomination code has already been used');
      if (new Date(codeCheck.expires_at) < new Date()) throw new Error('This nomination code has expired');

      const { data: existingCandidate } = await supabase
        .from('candidates').select('id')
        .eq('candidate_email', formData.email.toLowerCase().trim()).maybeSingle();
      if (existingCandidate) throw new Error('A nomination has already been submitted with this email');

      const { data: activeElection } = await supabase
        .from('elections').select('id').eq('status', 'active').maybeSingle();

      const candidateData = {
        name: formData.name, position: formData.position, department: formData.department,
        manifesto: formData.manifesto, status: 'pending',
        candidate_email: formData.email.toLowerCase().trim(),
        candidate_school_id: formData.schoolId,
        year_of_study: parseInt(formData.yearOfStudy),
        nomination_code_id: codeData.id, is_approved: false,
        nomination_submitted_at: new Date().toISOString()
      };
      if (activeElection) candidateData.election_id = activeElection.id;

      const { data: candidate, error: candidateError } = await supabase
        .from('candidates').insert(candidateData).select().single();
      if (candidateError) throw candidateError;

      await supabase.from('nomination_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', codeData.id);

      const ip = await getClientIP();
      await supabase.from('nomination_audit_logs').insert({
        nomination_code_id: codeData.id, candidate_id: candidate.id, action: 'SUBMITTED',
        action_details: { position: formData.position, code: codeData.code, timestamp: new Date().toISOString(), voter_exists: voterExists },
        ip_address: ip, performed_by: formData.email.toLowerCase().trim()
      });

      toast.success('Nomination submitted successfully. Your application will be reviewed by the Electoral Commission.');
      setTimeout(() => router.push('/nomination-success'), 2000);
    } catch (error) {
      toast.error(error.message || 'Failed to submit nomination. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Theme styles - Grayscale
  const themeStyles = {
    dark: {
      background: 'from-gray-900 via-gray-800 to-gray-900',
      cardBg: 'bg-white/6 backdrop-blur-2xl',
      cardBorder: 'border-white/10',
      textPrimary: 'text-white',
      textSecondary: 'text-white/50',
      textMuted: 'text-white/40',
      inputBg: 'bg-white/5',
      inputBorder: 'border-white/10',
      inputFocus: 'focus:ring-gray-400 focus:border-gray-400/50',
      placeholder: 'placeholder-white/30',
      buttonPrimary: 'from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500',
      verifiedBg: 'bg-gray-500/10 border-gray-400/30',
      accentBar: 'from-gray-500 via-gray-400 to-gray-600',
    },
    light: {
      background: 'from-gray-50 via-white to-gray-100',
      cardBg: 'bg-white/80 backdrop-blur-2xl',
      cardBorder: 'border-gray-200',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-500',
      inputBg: 'bg-white',
      inputBorder: 'border-gray-300',
      inputFocus: 'focus:ring-gray-500 focus:border-gray-500',
      placeholder: 'placeholder-gray-400',
      buttonPrimary: 'from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500',
      verifiedBg: 'bg-gray-100 border-gray-300',
      accentBar: 'from-gray-500 via-gray-400 to-gray-600',
    }
  };

  const currentTheme = themeStyles[theme];

  // Input classes based on theme
  const inputBase = `w-full pl-10 pr-4 py-3 ${currentTheme.inputBg} border ${currentTheme.inputBorder} rounded-xl ${currentTheme.textPrimary} ${currentTheme.placeholder} focus:outline-none focus:ring-2 ${currentTheme.inputFocus} transition-all duration-200 text-sm`;

  if (!mounted) return null;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300`}>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <div>🌞</div>
        ) : (
          <div>🌙</div>
        )}
      </button>

      {/* Ambient blobs - Grayscale */}
      <div className="absolute -top-28 -right-20 w-96 h-96 bg-gray-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 w-80 h-80 bg-gray-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gray-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl" data-aos="fade-up">

        {/* Card */}
        <div className={`${currentTheme.cardBg} backdrop-blur-2xl border ${currentTheme.cardBorder} rounded-3xl shadow-2xl overflow-hidden`}>

          {/* Top accent - Grayscale */}
          <div className={`h-1 bg-gradient-to-r ${currentTheme.accentBar}`} />

          <div className="p-7 sm:p-8">

            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center gap-3 mb-4">
                <Image
                  src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png"
                  width={56} height={56} alt="Logo"
                  className="object-contain rounded-lg"
                />
                <Image
                  src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png"
                  width={56} height={56} alt="E-Voting Logo"
                  className="object-contain rounded-lg"
                />
              </div>
              <h1 className={`text-2xl font-bold ${currentTheme.textPrimary} tracking-tight`}>Candidate Nomination</h1>
              <p className={`${currentTheme.textSecondary} text-sm mt-1.5`}>Submit your candidacy for the upcoming election</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* SECRET CODE */}
              <div
                data-aos="fade-up" data-aos-delay="60"
                className={`p-4 rounded-2xl border transition-all duration-300 ${codeValid ? currentTheme.verifiedBg : `${currentTheme.inputBg} border ${currentTheme.cardBorder}`}`}
              >
                <p className={`text-xs font-semibold uppercase tracking-widest ${currentTheme.textMuted} mb-3`}>Step 1 — Verify Secret Code</p>
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <FaKey className={`absolute left-3 top-1/2 -translate-y-1/2 ${getIconColor()} transition text-xs`} />
                    <input
                      {...register('secretCode', { required: 'Secret code is required', minLength: { value: 6, message: 'Code must be at least 6 characters' } })}
                      type="text"
                      placeholder="Enter EC secret code"
                      className={inputBase}
                      disabled={codeValid}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={verifySecretCode}
                    disabled={isVerifying || codeValid}
                    className="px-5 py-3 bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                  >
                    {isVerifying
                      ? <FaSpinner className="animate-spin" />
                      : codeValid
                      ? <><FaCheckCircle className={getIconColor()} /> Verified</>
                      : 'Verify'}
                  </button>
                </div>
                {errors.secretCode && <p className="text-red-400 text-xs mt-2">{errors.secretCode.message}</p>}
                {codeValid && (
                  <p className={`text-gray-400 text-xs mt-2.5 flex items-center gap-1.5`}>
                    <FaCheckCircle /> Verified for <strong>{codeData?.position}</strong> position
                  </p>
                )}
              </div>

              {/* PERSONAL INFO */}
              <div className={`space-y-4 transition-opacity duration-300 ${!codeValid ? 'opacity-40 pointer-events-none select-none' : 'opacity-100'}`}>

                {/* Section label */}
                <div className="flex items-center gap-3" data-aos="fade-up" data-aos-delay="100">
                  <p className={`text-xs font-semibold uppercase tracking-widest ${currentTheme.textMuted}`}>Step 2 — Personal Information</p>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Email */}
                <div data-aos="fade-up" data-aos-delay="120" className="relative group">
                  <FaEnvelope className={`absolute left-3 top-1/2 -translate-y-1/2 ${getIconColor()} transition text-xs`} />
                  <input
                    {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@regent\.edu\.gh$/i, message: 'Only @regent.edu.gh emails allowed' } })}
                    type="email" placeholder="University email"
                    className={inputBase}
                    readOnly={codeValid && !!codeData?.candidate_email}
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>

                {/* Name */}
                <div data-aos="fade-up" data-aos-delay="140" className="relative group">
                  <FaUser className={`absolute left-3 top-1/2 -translate-y-1/2 ${getIconColor()} transition text-xs`} />
                  <input
                    {...register('name', { required: 'Full name is required' })}
                    type="text" placeholder="Full name"
                    className={inputBase}
                    readOnly={codeValid && !!codeData?.candidate_name}
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>

                {/* School ID */}
                <div data-aos="fade-up" data-aos-delay="160" className="relative group">
                  <FaIdCard className={`absolute left-3 top-1/2 -translate-y-1/2 ${getIconColor()} transition text-xs`} />
                  <input
                    {...register('schoolId', { required: 'School ID is required', pattern: { value: /^[0-9]{8}$/, message: 'Must be 8 digits' } })}
                    type="text" placeholder="School ID (8 digits)"
                    className={inputBase}
                  />
                  {errors.schoolId && <p className="text-red-400 text-xs mt-1">{errors.schoolId.message}</p>}
                </div>

                {/* Position */}
                <div data-aos="fade-up" data-aos-delay="180" className="relative group">
                  <FaGraduationCap className={`absolute left-3 top-1/2 -translate-y-1/2 ${getIconColor()} transition text-xs`} />
                  <input
                    {...register('position', { required: 'Position is required' })}
                    type="text" placeholder="Position running for"
                    className={inputBase}
                    readOnly={codeValid && !!codeData?.position}
                  />
                  {errors.position && <p className="text-red-400 text-xs mt-1">{errors.position.message}</p>}
                </div>

                {/* Department + Year — side by side */}
                <div className="grid grid-cols-2 gap-3" data-aos="fade-up" data-aos-delay="200">
                  <div className="relative group">
                    <FaBuilding className={`absolute left-3 top-1/2 -translate-y-1/2 ${getIconColor()} transition text-xs`} />
                    <input
                      {...register('department', { required: 'Department is required' })}
                      type="text" placeholder="Department"
                      className={inputBase}
                    />
                    {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department.message}</p>}
                  </div>
                  <div className="relative group">
                    <FaGraduationCap className={`absolute left-3 top-1/2 -translate-y-1/2 ${getIconColor()} transition text-xs`} />
                    <select
                      {...register('yearOfStudy', { required: 'Year of study is required' })}
                      className={`${inputBase} appearance-none`}
                    >
                      <option value="" className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>Year of study</option>
                      <option value="100" className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>100 Level</option>
                      <option value="200" className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>200 Level</option>
                      <option value="300" className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>300 Level</option>
                      <option value="400" className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>400 Level</option>
                    </select>
                    {errors.yearOfStudy && <p className="text-red-400 text-xs mt-1">{errors.yearOfStudy.message}</p>}
                  </div>
                </div>

                {/* Manifesto */}
                <div data-aos="fade-up" data-aos-delay="220" className="relative group">
                  <FaFileAlt className={`absolute left-3 top-4 ${getIconColor()} transition text-xs`} />
                  <textarea
                    {...register('manifesto', {
                      required: 'Manifesto is required',
                      minLength: { value: 100, message: 'Manifesto must be at least 100 characters' },
                      maxLength: { value: 2000, message: 'Manifesto cannot exceed 2000 characters' }
                    })}
                    rows={5}
                    placeholder="Write your manifesto here… (minimum 100 characters)"
                    className={`${inputBase} resize-none`}
                  />
                  {errors.manifesto && <p className="text-red-400 text-xs mt-1">{errors.manifesto.message}</p>}
                  {/* Character count */}
                  <div className="flex justify-between items-center mt-1.5 px-0.5">
                    <span className={`text-xs ${manifestoLength < 100 ? 'text-amber-400/70' : 'text-gray-400'}`}>
                      {manifestoLength < 100 ? `${100 - manifestoLength} more characters needed` : 'Minimum met'}
                    </span>
                    <span className={`text-xs ${currentTheme.textMuted}`}>{manifestoLength}/2000</span>
                  </div>
                </div>
              </div>

              {/* SUBMIT */}
              <div data-aos="fade-up" data-aos-delay="260">
                <button
                  type="submit"
                  disabled={isLoading || !codeValid || !!existingNomination}
                  className={`w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r ${currentTheme.buttonPrimary} text-white font-semibold rounded-xl shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200`}
                >
                  {isLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting Nomination…</>
                  ) : existingNomination ? (
                    'Nomination Already Submitted'
                  ) : (
                    'Submit Nomination'
                  )}
                </button>
              </div>

            </form>

            {/* Info footer - No emojis */}
            <div data-aos="fade-up" data-aos-delay="300" className="mt-6 pt-5 border-t border-white/8">
              <div className="flex flex-col gap-1.5 text-center">
                <p className={`text-xs ${currentTheme.textMuted} flex items-center justify-center gap-1.5`}>
                  Nomination requires a valid EC secret code
                </p>
                <p className={`text-xs ${currentTheme.textMuted} flex items-center justify-center gap-1.5`}>
                  Manifesto must be at least 100 characters
                </p>
                <p className={`text-xs ${currentTheme.textMuted} flex items-center justify-center gap-1.5`}>
                  Nominations will be reviewed by the Electoral Commission
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}