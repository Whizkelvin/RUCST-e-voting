'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { 
  FaSpinner, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaVoteYea,
  FaArrowLeft,
  FaShieldAlt,
  FaClock,
  FaUser,
  FaUsers,
  FaUserTie,
  FaFemale,
  FaInfoCircle,
  FaUniversity,
  FaRegCheckCircle,
  FaVoteYea as FaVoteIcon
} from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';
import { logVoteCast, getClientIP } from '@/utils/auditLog';

export default function VotePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voter, setVoter] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [votingPeriod, setVotingPeriod] = useState(null);
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [clientIP, setClientIP] = useState('unknown');
  const [hasVoted, setHasVoted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    AOS.init({ duration: 700, once: true, offset: 60 });
  }, []);

  useEffect(() => {
    const getIP = async () => {
      const ip = await getClientIP();
      setClientIP(ip);
    };
    getIP();
  }, []);

  const calculateTimeLeft = useCallback((startTime, endTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (now < start) {
      const diff = start - now;
      return {
        days: Math.floor(diff / (1000*60*60*24)),
        hours: Math.floor((diff % (1000*60*60*24)) / (1000*60*60)),
        minutes: Math.floor((diff % (1000*60*60)) / (1000*60)),
        seconds: Math.floor((diff % (1000*60)) / 1000),
        status: 'starts_in'
      };
    } else if (now >= start && now <= end) {
      const diff = end - now;
      return {
        hours: Math.floor(diff / (1000*60*60)),
        minutes: Math.floor((diff % (1000*60*60)) / (1000*60)),
        seconds: Math.floor((diff % (1000*60)) / 1000),
        status: 'active'
      };
    } else {
      return null;
    }
  }, []);

  const formatTimeLeft = () => {
    if (!timeLeft) return 'Voting ended';
    if (timeLeft.status === 'starts_in') return `Starts in ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`;
    return `${String(timeLeft.hours).padStart(2,'0')}:${String(timeLeft.minutes).padStart(2,'0')}:${String(timeLeft.seconds).padStart(2,'0')}`;
  };

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const userSession = localStorage.getItem('user_session');
        const userRole = localStorage.getItem('user_role');
        const voterData = localStorage.getItem('voter_data');
        if (!userSession || userRole !== 'voter' || !voterData) {
          toast.error('Please login to vote');
          router.push('/login');
          return;
        }
        const parsedVoter = JSON.parse(voterData);
        setVoter(parsedVoter);
        const { data: existingVote } = await supabase.from('votes').select('id').eq('voter_id', parsedVoter.id).maybeSingle();
        if (existingVote) {
          setHasVoted(true);
          toast.info('You have already voted.');
          setTimeout(() => router.push('/election-result'), 3000);
          return;
        }
        const { data: votingPeriodData, error: votingPeriodError } = await supabase.from('voting_periods').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (votingPeriodError || !votingPeriodData) { setLoading(false); return; }
        setVotingPeriod(votingPeriodData);
        const now = new Date();
        const startDate = new Date(votingPeriodData.start_date);
        const endDate = new Date(votingPeriodData.end_date);
        const isActive = now >= startDate && now <= endDate;
        setIsVotingActive(isActive);
        setTimeLeft(calculateTimeLeft(startDate, endDate));
        if (!isActive) { setLoading(false); return; }
        const { data: electionsData } = await supabase.from('elections').select(`*, candidates (*)`).eq('voting_period_id', votingPeriodData.id).eq('is_active', true).order('created_at', { ascending: true });
        if (!electionsData || electionsData.length === 0) { setLoading(false); return; }
        setElections(electionsData);
        const initialSelected = {};
        electionsData.forEach(e => { initialSelected[e.id] = null; });
        setSelectedCandidates(initialSelected);
      } catch (error) {
        toast.error('Failed to load voting data');
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndLoadData();
  }, [router, calculateTimeLeft]);

  useEffect(() => {
    if (!votingPeriod) return;
    const updateTimeLeft = () => {
      const startDate = new Date(votingPeriod.start_date);
      const endDate = new Date(votingPeriod.end_date);
      const newTimeLeft = calculateTimeLeft(startDate, endDate);
      setTimeLeft(newTimeLeft);
      const now = new Date();
      const isNowActive = now >= startDate && now <= endDate;
      if (isVotingActive !== isNowActive) {
        setIsVotingActive(isNowActive);
        if (!isNowActive && isVotingActive) { toast.info('Voting period has ended'); setTimeout(() => router.push('/'), 2000); }
        else if (isNowActive && !isVotingActive) { toast.success('Voting is now active!'); window.location.reload(); }
      }
    };
    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [votingPeriod, calculateTimeLeft, isVotingActive, router]);

  const handleCandidateSelect = (electionId, candidateId) => {
    if (!isVotingActive || hasVoted) { toast.warning(hasVoted ? 'You have already voted' : 'Voting is not active'); return; }
    setSelectedCandidates(prev => ({ ...prev, [electionId]: candidateId }));
    const candidate = elections.find(e => e.id === electionId)?.candidates?.find(c => c.id === candidateId);
    const electionTitle = elections.find(e => e.id === electionId)?.title;
    if (candidate) toast.success(`✓ ${candidate.name} selected for ${electionTitle}`, { position: "bottom-right", autoClose: 2000, hideProgressBar: true });
  };

  const handleSubmitVote = async () => {
    if (!isVotingActive || hasVoted) { toast.error(hasVoted ? 'You have already voted' : 'Voting is not active'); return; }
    const missingSelections = elections.filter(e => !selectedCandidates[e.id]);
    if (missingSelections.length > 0) { toast.error(`Please select candidates for: ${missingSelections.map(e => e.title).join(', ')}`); return; }
    const confirmationMessage = `Confirm your votes:\n\n${elections.map(e => { const c = e.candidates?.find(c => c.id === selectedCandidates[e.id]); return `${e.title}: ${c?.name}`; }).join('\n')}\n\nThis cannot be undone.`;
    if (!window.confirm(confirmationMessage)) return;
    setSubmitting(true);
    try {
      const votesToInsert = elections.map(election => ({ voter_id: voter.id, candidate_id: selectedCandidates[election.id], election_id: election.id, voting_period_id: votingPeriod.id, position: election.title, ip_address: clientIP || 'unknown', created_at: new Date().toISOString() }));
      const { error: voteError } = await supabase.from('votes').insert(votesToInsert).select();
      if (voteError) throw new Error(voteError.message || 'Failed to cast vote');
      await supabase.from('voters').update({ has_voted: true, voted_at: new Date().toISOString() }).eq('id', voter.id);
      await logVoteCast({ voter_id: voter.id, voter_name: voter.name, ip_address: clientIP, success: true });
      setHasVoted(true);
      const updatedVoterData = { ...voter, has_voted: true, voted_at: new Date().toISOString() };
      localStorage.setItem('voter_data', JSON.stringify(updatedVoterData));
      localStorage.setItem('has_voted', 'true');
      localStorage.setItem('voted_voter_id', voter.id);
      localStorage.removeItem('user_session');
      localStorage.removeItem('user_role');
      toast.success('Your vote has been cast successfully! Redirecting...', { position: "top-center", autoClose: 3000, style: { background: '#166534', color: 'white' } });
      setTimeout(() => router.push('/election-result'), 3000);
    } catch (error) {
      toast.error(error.message || 'Failed to cast vote. Please try again.');
      await logVoteCast({ voter_id: voter.id, voter_name: voter.name, ip_address: clientIP, success: false, error: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedCount = () => Object.values(selectedCandidates).filter(Boolean).length;

  // ── LOADING ──
  if (loading) return (
    <>
      <style jsx global>{GLOBAL_STYLES}</style>
      <div className="vp-shell vp-center">
        <div className="vp-loader-card">
          <div className="vp-spinner" />
          <p className="vp-loader-text">Preparing your ballot…</p>
        </div>
      </div>
    </>
  );

  // ── NO VOTING PERIOD ──
  if (!votingPeriod) return (
    <>
      <style jsx global>{GLOBAL_STYLES}</style>
      <div className="vp-shell vp-center">
        <div data-aos="fade-up" className="vp-gate-card">
          <div className="vp-gate-icon"><FaClock /></div>
          <h2 className="vp-gate-title">No Active Voting Period</h2>
          <p className="vp-gate-body">There is currently no active voting period. Please check back later.</p>
          <button onClick={() => router.push('/')} className="vp-btn-primary">Return to Home</button>
        </div>
      </div>
    </>
  );

  // ── NOT ACTIVE ──
  if (!isVotingActive && votingPeriod) {
    const now = new Date();
    const startDate = new Date(votingPeriod.start_date);
    const isBeforeStart = now < startDate;
    return (
      <>
        <style jsx global>{GLOBAL_STYLES}</style>
        <div className="vp-shell vp-center">
          <div data-aos="fade-up" className="vp-gate-card">
            <div className="vp-gate-icon vp-gate-icon--amber"><FaClock /></div>
            <h2 className="vp-gate-title">{isBeforeStart ? 'Voting Not Yet Open' : 'Voting Has Ended'}</h2>
            <p className="vp-gate-body">
              {isBeforeStart ? `Opens ${startDate.toLocaleDateString()} — ${new Date(votingPeriod.end_date).toLocaleDateString()}` : `Closed on ${new Date(votingPeriod.end_date).toLocaleDateString()}`}
            </p>
            {timeLeft?.status === 'starts_in' && <p className="vp-countdown-inline">{formatTimeLeft()}</p>}
            <button onClick={() => router.push('/')} className="vp-btn-primary">Return to Home</button>
          </div>
        </div>
      </>
    );
  }

  // ── NO ELECTIONS ──
  if (elections.length === 0) return (
    <>
      <style jsx global>{GLOBAL_STYLES}</style>
      <div className="vp-shell vp-center">
        <div data-aos="fade-up" className="vp-gate-card">
          <div className="vp-gate-icon"><FaUniversity /></div>
          <h2 className="vp-gate-title">No Elections Available</h2>
          <p className="vp-gate-body">No active elections for this voting period.</p>
          <button onClick={() => router.push('/')} className="vp-btn-primary">Return to Home</button>
        </div>
      </div>
    </>
  );

  const progress = (getSelectedCount() / elections.length) * 100;

  // ── MAIN INTERFACE ──
  return (
    <>
      <style jsx global>{GLOBAL_STYLES}</style>

      <div className="vp-shell">
        {/* Top bar */}
        <div className="vp-topbar" />

        {/* Header */}
        <header data-aos="fade-down" className="vp-header">
          <div className="vp-header-inner">
            <div className="vp-header-left">
              <div className="vp-logos">
                <Image src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png" width={44} height={44} alt="Regent Logo" className="vp-logo-img" />
                <Image src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png" width={44} height={44} alt="Logo" className="vp-logo-img" />
              </div>
              <div>
                <h1 className="vp-header-title">Cast Your Vote</h1>
                <p className="vp-header-sub">Welcome back, <strong>{voter?.name}</strong></p>
              </div>
            </div>

            <div className="vp-header-right">
              <div className="vp-timer-chip">
                <span className="vp-timer-dot" />
                <span className="vp-timer-value">{formatTimeLeft()}</span>
                <span className="vp-timer-label">remaining</span>
              </div>
              {hasVoted && (
                <div className="vp-voted-badge">
                  <FaCheckCircle /> Voted
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="vp-progress-bar-wrap">
            <div className="vp-progress-bar-track">
              <div className="vp-progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="vp-progress-label">{getSelectedCount()} of {elections.length} positions selected</span>
          </div>
        </header>

        <div className="vp-layout">
          {/* ── SIDEBAR ── */}
          <aside className="vp-sidebar">
            {/* Ballot status */}
            <div data-aos="fade-right" className="vp-panel">
              <div className="vp-panel-title">
                <FaInfoCircle className="vp-panel-icon" /> Ballot Status
              </div>
              <ul className="vp-checklist">
                {elections.map(election => {
                  const done = !!selectedCandidates[election.id];
                  const selected = election.candidates?.find(c => c.id === selectedCandidates[election.id]);
                  return (
                    <li key={election.id} className={`vp-checklist-item ${done ? 'vp-checklist-item--done' : ''}`}>
                      <div className={`vp-check-circle ${done ? 'vp-check-circle--done' : ''}`}>
                        {done && <FaCheckCircle />}
                      </div>
                      <div className="vp-checklist-text">
                        <span className="vp-checklist-position">{election.title}</span>
                        {done && <span className="vp-checklist-name">{selected?.name}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Instructions */}
            <div data-aos="fade-right" data-aos-delay="80" className="vp-panel">
              <div className="vp-panel-title">
                <FaShieldAlt className="vp-panel-icon" /> Instructions
              </div>
              <ul className="vp-instructions">
                <li>Select <strong>one candidate</strong> per position</li>
                <li>All positions are <strong>mandatory</strong></li>
                <li>Review before submitting</li>
                <li>Votes are <strong>final</strong> and cannot be changed</li>
              </ul>
            </div>

            {/* Security note */}
            <div data-aos="fade-right" data-aos-delay="160" className="vp-security-note">
              <FaShieldAlt />
              <span>Your vote is encrypted and fully anonymous</span>
            </div>
          </aside>

          {/* ── MAIN ── */}
          <main className="vp-main">
            {hasVoted && (
              <div className="vp-voted-banner">
                <FaCheckCircle className="vp-voted-banner-icon" />
                <div>
                  <strong>Thank you for voting!</strong>
                  <p>Your votes have been recorded securely. Redirecting to results…</p>
                </div>
              </div>
            )}

            {elections.map((election, idx) => (
              <section key={election.id} data-aos="fade-up" data-aos-delay={idx * 60} className="vp-election-section">
                {/* Position header */}
                <div className="vp-position-header">
                  <div className="vp-position-number">{String(idx + 1).padStart(2, '0')}</div>
                  <div>
                    <h2 className="vp-position-title">{election.title}</h2>
                    <p className="vp-position-sub">Select one candidate for this position</p>
                  </div>
                  {selectedCandidates[election.id] && (
                    <div className="vp-position-done-tag">
                      <FaCheckCircle /> Selected
                    </div>
                  )}
                </div>

                {/* Candidates grid */}
                <div className="vp-candidates-grid">
                  {election.candidates?.map((candidate) => {
                    const isSelected = selectedCandidates[election.id] === candidate.id;
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => !hasVoted && handleCandidateSelect(election.id, candidate.id)}
                        className={`vp-candidate-card ${isSelected ? 'vp-candidate-card--selected' : ''} ${hasVoted ? 'vp-candidate-card--disabled' : ''}`}
                      >
                        <div className="vp-candidate-img-wrap">
                          {candidate.image_url ? (
                            <img src={candidate.image_url} alt={candidate.name} className="vp-candidate-img" />
                          ) : (
                            <div className="vp-candidate-img vp-candidate-img--placeholder">
                              <FaUser />
                            </div>
                          )}
                          {isSelected && (
                            <div className="vp-candidate-tick">
                              <FaCheckCircle />
                            </div>
                          )}
                        </div>
                        <div className="vp-candidate-info">
                          <h3 className="vp-candidate-name">{candidate.name}</h3>
                          {candidate.position && <p className="vp-candidate-role">{candidate.position}</p>}
                          {candidate.bio && <p className="vp-candidate-bio">{candidate.bio}</p>}
                        </div>
                        <div className={`vp-candidate-select-bar ${isSelected ? 'vp-candidate-select-bar--active' : ''}`} />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Submit */}
            <div data-aos="fade-up" className="vp-submit-panel">
              <div className="vp-submit-summary">
                <div>
                  <h3 className="vp-submit-title">Ready to Submit?</h3>
                  <p className="vp-submit-sub">Review all your selections above before casting</p>
                </div>
                <div className="vp-submit-count">
                  <span className="vp-submit-count-num">{getSelectedCount()}</span>
                  <span className="vp-submit-count-denom">/ {elections.length}</span>
                </div>
              </div>

              {getSelectedCount() < elections.length && (
                <div className="vp-warning-strip">
                  <FaExclamationTriangle />
                  <span>Please select a candidate for all {elections.length} positions to continue</span>
                </div>
              )}

              <button
                onClick={handleSubmitVote}
                disabled={submitting || hasVoted || getSelectedCount() !== elections.length}
                className="vp-submit-btn"
              >
                {submitting ? (
                  <><FaSpinner className="vp-spin" /> Casting your vote…</>
                ) : hasVoted ? (
                  <><FaCheckCircle /> Vote already cast</>
                ) : getSelectedCount() !== elections.length ? (
                  <><FaVoteIcon /> Select all positions first</>
                ) : (
                  <><FaVoteIcon /> Cast My Vote</>
                )}
              </button>

              <p className="vp-submit-footnote">
                Votes are encrypted and anonymous. This action cannot be undone.
              </p>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

  :root {
    --green-950: #052e16;
    --green-900: #14532d;
    --green-800: #166534;
    --green-700: #15803d;
    --green-600: #16a34a;
    --green-500: #22c55e;
    --green-100: #dcfce7;
    --green-50:  #f0fdf4;
    --amber-500: #f59e0b;
    --amber-100: #fef3c7;
    --red-500:   #ef4444;
    --red-50:    #fef2f2;
    --slate-900: #0f172a;
    --slate-700: #334155;
    --slate-500: #64748b;
    --slate-400: #94a3b8;
    --slate-200: #e2e8f0;
    --slate-100: #f1f5f9;
    --slate-50:  #f8fafc;
    --white:     #ffffff;
    --radius-sm: 10px;
    --radius-md: 16px;
    --radius-lg: 22px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: var(--slate-50);
    color: var(--slate-700);
    -webkit-font-smoothing: antialiased;
  }

  /* ─── SHELL ─── */
  .vp-shell {
    min-height: 100vh;
    background:
      radial-gradient(ellipse 800px 500px at 10% -5%, rgba(22,163,74,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 600px 400px at 90% 90%, rgba(245,158,11,0.05) 0%, transparent 60%),
      var(--slate-50);
  }
  .vp-center {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  /* ─── TOP BAR ─── */
  .vp-topbar {
    height: 3px;
    background: linear-gradient(90deg, var(--green-900), var(--green-500), var(--amber-500), var(--green-600));
    position: sticky;
    top: 0;
    z-index: 50;
  }

  /* ─── HEADER ─── */
  .vp-header {
    background: var(--white);
    border-bottom: 1px solid var(--slate-200);
    padding: 1.25rem 2rem 0;
    position: sticky;
    top: 3px;
    z-index: 40;
    box-shadow: var(--shadow-sm);
  }
  .vp-header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    max-width: 1320px;
    margin: 0 auto;
    padding-bottom: 1rem;
  }
  .vp-header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .vp-logos {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .vp-logo-img {
    object-fit: contain;
    border-radius: 6px;
  }
  .vp-header-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--slate-900);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .vp-header-sub {
    font-size: 0.82rem;
    color: var(--slate-500);
    margin-top: 2px;
  }
  .vp-header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .vp-timer-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--green-50);
    border: 1px solid var(--green-100);
    border-radius: 100px;
    padding: 0.4rem 1rem;
  }
  .vp-timer-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green-500);
    animation: vpPulse 1.5s ease infinite;
  }
  @keyframes vpPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
    50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
  }
  .vp-timer-value {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--green-800);
    letter-spacing: 0.02em;
  }
  .vp-timer-label {
    font-size: 0.72rem;
    color: var(--green-700);
    font-weight: 500;
  }
  .vp-voted-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--green-600);
    color: white;
    border-radius: 100px;
    padding: 0.4rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
  }

  /* ─── PROGRESS BAR ─── */
  .vp-progress-bar-wrap {
    max-width: 1320px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-bottom: 0.85rem;
  }
  .vp-progress-bar-track {
    flex: 1;
    height: 4px;
    background: var(--slate-200);
    border-radius: 99px;
    overflow: hidden;
  }
  .vp-progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--green-600), var(--green-500));
    border-radius: 99px;
    transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .vp-progress-label {
    font-size: 0.75rem;
    color: var(--slate-400);
    white-space: nowrap;
    font-weight: 500;
  }

  /* ─── LAYOUT ─── */
  .vp-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1.75rem;
    max-width: 1320px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem;
  }
  @media (max-width: 900px) {
    .vp-layout { grid-template-columns: 1fr; }
  }

  /* ─── SIDEBAR ─── */
  .vp-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top: calc(3px + 90px);
    align-self: start;
  }
  @media (max-width: 900px) {
    .vp-sidebar { position: static; }
  }

  /* ─── PANEL ─── */
  .vp-panel {
    background: var(--white);
    border: 1px solid var(--slate-200);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    box-shadow: var(--shadow-sm);
  }
  .vp-panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--slate-700);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 1rem;
  }
  .vp-panel-icon { color: var(--green-600); font-size: 0.9rem; }

  /* ─── CHECKLIST ─── */
  .vp-checklist {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .vp-checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.5rem 0.6rem;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  .vp-checklist-item--done { background: var(--green-50); }
  .vp-check-circle {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid var(--slate-300);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
    font-size: 0.65rem;
    color: transparent;
    transition: all 0.25s;
  }
  .vp-check-circle--done {
    background: var(--green-600);
    border-color: var(--green-600);
    color: white;
  }
  .vp-checklist-text { display: flex; flex-direction: column; gap: 1px; }
  .vp-checklist-position { font-size: 0.8rem; color: var(--slate-600); font-weight: 500; }
  .vp-checklist-name { font-size: 0.75rem; color: var(--green-700); font-weight: 600; }

  /* ─── INSTRUCTIONS ─── */
  .vp-instructions {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .vp-instructions li {
    font-size: 0.8rem;
    color: var(--slate-500);
    padding-left: 1rem;
    position: relative;
    line-height: 1.4;
  }
  .vp-instructions li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--green-400);
    font-weight: 700;
  }
  .vp-instructions strong { color: var(--slate-700); }

  /* ─── SECURITY NOTE ─── */
  .vp-security-note {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--green-50);
    border: 1px solid var(--green-100);
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    color: var(--green-800);
    font-weight: 500;
  }
  .vp-security-note svg { color: var(--green-600); flex-shrink: 0; }

  /* ─── MAIN ─── */
  .vp-main {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* ─── VOTED BANNER ─── */
  .vp-voted-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    background: var(--green-50);
    border: 1px solid var(--green-100);
    border-left: 4px solid var(--green-600);
    border-radius: var(--radius-md);
    padding: 1.1rem 1.25rem;
  }
  .vp-voted-banner-icon { color: var(--green-600); font-size: 1.3rem; flex-shrink: 0; margin-top: 1px; }
  .vp-voted-banner strong { display: block; color: var(--green-900); font-size: 0.95rem; margin-bottom: 2px; }
  .vp-voted-banner p { color: var(--green-700); font-size: 0.83rem; }

  /* ─── ELECTION SECTION ─── */
  .vp-election-section {
    background: var(--white);
    border: 1px solid var(--slate-200);
    border-radius: var(--radius-lg);
    padding: 1.75rem;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.3s;
  }
  .vp-election-section:hover { box-shadow: var(--shadow-md); }

  /* ─── POSITION HEADER ─── */
  .vp-position-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .vp-position-number {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2rem;
    font-weight: 700;
    color: var(--green-100);
    line-height: 1;
    min-width: 44px;
    user-select: none;
  }
  .vp-position-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--slate-900);
    letter-spacing: -0.01em;
  }
  .vp-position-sub {
    font-size: 0.78rem;
    color: var(--slate-400);
    margin-top: 2px;
  }
  .vp-position-done-tag {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--green-100);
    color: var(--green-800);
    border-radius: 100px;
    padding: 0.3rem 0.85rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* ─── CANDIDATE CARD ─── */
  .vp-candidates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 1rem;
  }
  .vp-candidate-card {
    position: relative;
    border: 2px solid var(--slate-200);
    border-radius: var(--radius-md);
    padding: 1.25rem 1rem 1rem;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    background: var(--white);
    text-align: center;
    overflow: hidden;
  }
  .vp-candidate-card:hover:not(.vp-candidate-card--disabled) {
    border-color: var(--green-400);
    box-shadow: 0 4px 20px rgba(22,163,74,0.12);
    transform: translateY(-2px);
  }
  .vp-candidate-card--selected {
    border-color: var(--green-600) !important;
    background: linear-gradient(160deg, var(--green-50) 0%, var(--white) 100%);
    box-shadow: 0 0 0 3px rgba(22,163,74,0.12), var(--shadow-md) !important;
    transform: translateY(-2px) !important;
  }
  .vp-candidate-card--disabled { opacity: 0.55; cursor: not-allowed; }

  .vp-candidate-img-wrap {
    position: relative;
    display: inline-block;
    margin-bottom: 0.75rem;
  }
  .vp-candidate-img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--slate-200);
    display: block;
  }
  .vp-candidate-img--placeholder {
    display: flex !important;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--green-100), var(--green-50));
    color: var(--green-600);
    font-size: 1.5rem;
  }
  .vp-candidate-tick {
    position: absolute;
    top: 0;
    right: 0;
    width: 22px;
    height: 22px;
    background: var(--green-600);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    color: white;
    box-shadow: 0 2px 6px rgba(22,163,74,0.4);
    animation: vpTickPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes vpTickPop {
    from { transform: scale(0); }
    to   { transform: scale(1); }
  }
  .vp-candidate-name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--slate-800);
  }
  .vp-candidate-role {
    font-size: 0.73rem;
    color: var(--green-700);
    font-weight: 500;
    margin-top: 2px;
  }
  .vp-candidate-bio {
    font-size: 0.72rem;
    color: var(--slate-400);
    margin-top: 5px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .vp-candidate-select-bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: var(--green-600);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
  }
  .vp-candidate-select-bar--active { transform: scaleX(1); }

  /* ─── SUBMIT PANEL ─── */
  .vp-submit-panel {
    background: var(--white);
    border: 1px solid var(--slate-200);
    border-radius: var(--radius-lg);
    padding: 2rem;
    box-shadow: var(--shadow-md);
  }
  .vp-submit-summary {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .vp-submit-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--slate-900);
  }
  .vp-submit-sub {
    font-size: 0.82rem;
    color: var(--slate-400);
    margin-top: 3px;
  }
  .vp-submit-count {
    text-align: right;
    white-space: nowrap;
  }
  .vp-submit-count-num {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--green-600);
    line-height: 1;
  }
  .vp-submit-count-denom {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--slate-300);
  }

  /* ─── WARNING STRIP ─── */
  .vp-warning-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--amber-100);
    border: 1px solid #fde68a;
    border-radius: var(--radius-sm);
    padding: 0.75rem 1rem;
    font-size: 0.82rem;
    color: #92400e;
    font-weight: 500;
    margin-bottom: 1.25rem;
  }

  /* ─── SUBMIT BUTTON ─── */
  .vp-submit-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, var(--green-800), var(--green-600));
    color: white;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(22,163,74,0.35);
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s;
    letter-spacing: 0.01em;
  }
  .vp-submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(22,163,74,0.4);
  }
  .vp-submit-btn:active:not(:disabled) { transform: translateY(0); }
  .vp-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
  .vp-submit-footnote {
    text-align: center;
    font-size: 0.73rem;
    color: var(--slate-400);
    margin-top: 0.85rem;
  }

  /* ─── GATE CARD ─── */
  .vp-gate-card {
    background: var(--white);
    border: 1px solid var(--slate-200);
    border-radius: var(--radius-lg);
    padding: 2.5rem 2rem;
    max-width: 420px;
    width: 100%;
    text-align: center;
    box-shadow: var(--shadow-lg);
  }
  .vp-gate-icon {
    width: 64px; height: 64px;
    border-radius: 20px;
    background: var(--green-50);
    color: var(--green-600);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    margin: 0 auto 1.25rem;
  }
  .vp-gate-icon--amber { background: var(--amber-100); color: var(--amber-500); }
  .vp-gate-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--slate-900);
    margin-bottom: 0.5rem;
  }
  .vp-gate-body {
    font-size: 0.875rem;
    color: var(--slate-500);
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }
  .vp-countdown-inline {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--green-600);
    margin-bottom: 1.5rem;
  }

  /* ─── BUTTONS ─── */
  .vp-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 2rem;
    background: linear-gradient(135deg, var(--green-800), var(--green-600));
    color: white;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(22,163,74,0.3);
    transition: transform 0.2s, box-shadow 0.2s;
    width: 100%;
  }
  .vp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(22,163,74,0.35); }

  /* ─── LOADER ─── */
  .vp-loader-card {
    text-align: center;
    padding: 3rem 2rem;
  }
  .vp-spinner {
    width: 40px; height: 40px;
    border: 3px solid var(--green-100);
    border-top-color: var(--green-600);
    border-radius: 50%;
    animation: vpSpin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }
  @keyframes vpSpin { to { transform: rotate(360deg); } }
  .vp-loader-text {
    font-size: 0.9rem;
    color: var(--slate-400);
  }

  /* ─── SPIN UTILITY ─── */
  .vp-spin { animation: vpSpin 0.8s linear infinite; }
`;