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
      toast.success('Secret code verified! Please complete your nomination details.');
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

      toast.success('Nomination submitted successfully! Your application will be reviewed by the Electoral Commission.');
      setTimeout(() => router.push('/nomination-success'), 2000);
    } catch (error) {
      toast.error(error.message || 'Failed to submit nomination. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Input base classes
  const inputBase = "w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/50 focus:bg-white/8 transition-all duration-200 text-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="absolute -top-28 -right-20 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-teal-400/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl" data-aos="fade-up">

        {/* Card */}
        <div className="bg-white/6 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

          <div className="p-7 sm:p-8">

            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center gap-3 mb-4">
                <Image
                  src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png"
                  width={56} height={56} alt="Logo"
                  className="object-contain rounded-lg"
                />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Candidate Nomination</h1>
              <p className="text-white/50 text-sm mt-1.5">Submit your candidacy for the upcoming election</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* ── SECRET CODE ── */}
              <div
                data-aos="fade-up" data-aos-delay="60"
                className={`p-4 rounded-2xl border transition-all duration-300 ${codeValid ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-white/4 border-white/10'}`}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Step 1 — Verify Secret Code</p>
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <FaKey className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition text-xs" />
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
                    className="px-5 py-3 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                  >
                    {isVerifying
                      ? <FaSpinner className="animate-spin" />
                      : codeValid
                      ? <><FaCheckCircle className="text-emerald-300" /> Verified</>
                      : 'Verify'}
                  </button>
                </div>
                {errors.secretCode && <p className="text-red-400 text-xs mt-2">{errors.secretCode.message}</p>}
                {codeValid && (
                  <p className="text-emerald-300 text-xs mt-2.5 flex items-center gap-1.5">
                    <FaCheckCircle /> Verified for <strong>{codeData?.position}</strong> position
                  </p>
                )}
              </div>

              {/* ── PERSONAL INFO ── */}
              <div className={`space-y-4 transition-opacity duration-300 ${!codeValid ? 'opacity-40 pointer-events-none select-none' : 'opacity-100'}`}>

                {/* Section label */}
                <div className="flex items-center gap-3" data-aos="fade-up" data-aos-delay="100">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Step 2 — Personal Information</p>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Email */}
                <div data-aos="fade-up" data-aos-delay="120" className="relative group">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition text-xs" />
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
                  <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition text-xs" />
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
                  <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition text-xs" />
                  <input
                    {...register('schoolId', { required: 'School ID is required', pattern: { value: /^[0-9]{8}$/, message: 'Must be 8 digits' } })}
                    type="text" placeholder="School ID (8 digits)"
                    className={inputBase}
                  />
                  {errors.schoolId && <p className="text-red-400 text-xs mt-1">{errors.schoolId.message}</p>}
                </div>

                {/* Position */}
                <div data-aos="fade-up" data-aos-delay="180" className="relative group">
                  <FaGraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition text-xs" />
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
                    <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition text-xs" />
                    <input
                      {...register('department', { required: 'Department is required' })}
                      type="text" placeholder="Department"
                      className={inputBase}
                    />
                    {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department.message}</p>}
                  </div>
                  <div className="relative group">
                    <FaGraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition text-xs" />
                    <select
                      {...register('yearOfStudy', { required: 'Year of study is required' })}
                      className={`${inputBase} appearance-none`}
                    >
                      <option value="" className="bg-slate-800">Year of study</option>
                      <option value="100" className="bg-slate-800">100 Level</option>
                      <option value="200" className="bg-slate-800">200 Level</option>
                      <option value="300" className="bg-slate-800">300 Level</option>
                      <option value="400" className="bg-slate-800">400 Level</option>
                    </select>
                    {errors.yearOfStudy && <p className="text-red-400 text-xs mt-1">{errors.yearOfStudy.message}</p>}
                  </div>
                </div>

                {/* Manifesto */}
                <div data-aos="fade-up" data-aos-delay="220" className="relative group">
                  <FaFileAlt className="absolute left-3 top-4 text-white/30 group-focus-within:text-emerald-400 transition text-xs" />
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
                    <span className={`text-xs ${manifestoLength < 100 ? 'text-amber-400/70' : 'text-emerald-400/70'}`}>
                      {manifestoLength < 100 ? `${100 - manifestoLength} more characters needed` : 'Minimum met ✓'}
                    </span>
                    <span className="text-xs text-white/25">{manifestoLength}/2000</span>
                  </div>
                </div>
              </div>

              {/* ── SUBMIT ── */}
              <div data-aos="fade-up" data-aos-delay="260">
                <button
                  type="submit"
                  disabled={isLoading || !codeValid || !!existingNomination}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
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

            {/* Info footer */}
            <div data-aos="fade-up" data-aos-delay="300" className="mt-6 pt-5 border-t border-white/8">
              <div className="flex flex-col gap-1.5 text-center">
                {[
                  { icon: '🔐', text: 'Nomination requires a valid EC secret code' },
                  { icon: '📝', text: 'Manifesto must be at least 100 characters' },
                  { icon: '⏳', text: 'Nominations will be reviewed by the Electoral Commission' },
                ].map(({ icon, text }) => (
                  <p key={text} className="text-xs text-white/35 flex items-center justify-center gap-1.5">
                    <span>{icon}</span> {text}
                  </p>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}