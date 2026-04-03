'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Toaster, toast } from 'sonner';
import { 
  FaSpinner, FaCheckCircle, FaExclamationTriangle, FaVoteYea,
  FaShieldAlt, FaClock, FaUser, FaInfoCircle, FaUniversity,
  FaArrowLeft, FaSearch, FaTimes, FaRegClock, FaBell,
  FaCalendarAlt, FaUserCheck
} from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { supabase } from '@/lib/supabaseClient';
import { logVoteCast, getClientIP } from '@/utils/auditLog';

export default function VotePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voter, setVoter] = useState(null);
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [votingPeriod, setVotingPeriod] = useState(null);
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [clientIP, setClientIP] = useState('unknown');
  const [hasVoted, setHasVoted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [timeWarningShown, setTimeWarningShown] = useState(false);
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
      const minutesLeft = Math.floor(diff / (1000*60));
      if (minutesLeft <= 5 && !timeWarningShown && diff > 0) {
        setTimeWarningShown(true);
        toast.warning('⚠️ Less than 5 minutes remaining to cast your vote!', {
          duration: 10000,
        });
      }
      return {
        hours: Math.floor(diff / (1000*60*60)),
        minutes: minutesLeft,
        seconds: Math.floor((diff % (1000*60)) / 1000),
        status: 'active'
      };
    } else {
      return null;
    }
  }, [timeWarningShown]);

  const formatTimeLeft = () => {
    if (!timeLeft) return 'Voting ended';
    if (timeLeft.status === 'starts_in') return `Starts in ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`;
    const timeString = `${String(timeLeft.hours).padStart(2,'0')}:${String(timeLeft.minutes).padStart(2,'0')}:${String(timeLeft.seconds).padStart(2,'0')}`;
    return timeString;
  };

  const getTimeColor = () => {
    if (!timeLeft || timeLeft.status !== 'active') return 'text-green-600';
    if (timeLeft.minutes <= 5) return 'text-red-600';
    if (timeLeft.minutes <= 10) return 'text-orange-500';
    return 'text-green-600';
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
        
        // Get active voting period
        const { data: votingPeriodData, error: votingPeriodError } = await supabase
          .from('voting_periods')
          .select('*')
          .eq('is_active', true)
          .single();
        
        if (votingPeriodError || !votingPeriodData) { 
          setLoading(false);
          toast.info('No active voting period found');
          return; 
        }
        
        setVotingPeriod(votingPeriodData);
        const now = new Date();
        const startDate = new Date(votingPeriodData.start_date);
        const endDate = new Date(votingPeriodData.end_date);
        const isActive = now >= startDate && now <= endDate;
        setIsVotingActive(isActive);
        setTimeLeft(calculateTimeLeft(startDate, endDate));
        
        if (!isActive) { 
          setLoading(false); 
          return; 
        }
        
        // Get the active election for this voting period
        const { data: electionData, error: electionError } = await supabase
          .from('elections')
          .select(`
            id,
            title,
            description,
            election_year,
            voting_period_id,
            start_time,
            end_time,
            is_active
          `)
          .eq('voting_period_id', votingPeriodData.id)
          .eq('is_active', true)
          .single();
        
        if (electionError) {
          console.error('Error loading election:', electionError);
          setLoading(false);
          toast.info('No active election found for this voting period');
          return;
        }
        
        // Get positions for this election with their candidates
        const { data: positionsData, error: positionsError } = await supabase
          .from('positions')
          .select(`
            id,
            title,
            description,
            order_number,
            max_votes,
            candidates (
              id,
              name,
              image_url,
              department,
              year_of_study,
              manifesto,
              position_id,
              is_approved
            )
          `)
          .eq('election_id', electionData.id)
          .order('order_number', { ascending: true });
        
        if (positionsError) {
          console.error('Error loading positions:', positionsError);
          setLoading(false);
          return;
        }
        
        // Filter only positions with approved candidates
        const filteredPositions = (positionsData || [])
          .map(position => ({
            ...position,
            candidates: (position.candidates || []).filter(c => c.is_approved === true)
          }))
          .filter(position => position.candidates.length > 0);
        
        if (filteredPositions.length === 0) {
          toast.warning('No candidates available for voting yet');
        }
        
        setElection(electionData);
        setPositions(filteredPositions);
        
        // Initialize selections
        const initialSelected = {};
        filteredPositions.forEach(pos => {
          initialSelected[pos.id] = null;
        });
        setSelectedCandidates(initialSelected);
        
        // Check if voter has already voted in this election
        const { data: existingVotes, error: voteCheckError } = await supabase
          .from('votes')
          .select('id')
          .eq('voter_id', parsedVoter.id)
          .eq('election_id', electionData.id);
        
        if (existingVotes && existingVotes.length > 0) {
          setHasVoted(true);
          toast.info('You have already voted in this election.');
          setTimeout(() => router.push('/'), 3000);
        }
        
      } catch (error) {
        console.error('Failed to load voting data:', error);
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
        if (!isNowActive && isVotingActive) { 
          toast.info('Voting period has ended'); 
          setTimeout(() => router.push('/'), 2000); 
        } else if (isNowActive && !isVotingActive) { 
          toast.success('Voting is now active!'); 
          window.location.reload(); 
        }
      }
    };
    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [votingPeriod, calculateTimeLeft, isVotingActive, router]);

  const handleCandidateSelect = (positionId, candidateId) => {
    if (!isVotingActive || hasVoted) { 
      toast.warning(hasVoted ? 'You have already voted' : 'Voting is not active'); 
      return; 
    }
    setSelectedCandidates(prev => ({ ...prev, [positionId]: candidateId }));
    const position = positions.find(p => p.id === positionId);
    const candidate = position?.candidates?.find(c => c.id === candidateId);
    if (candidate) toast.success(`✓ ${candidate.name} selected for ${position.title}`);
  };

  const clearSelection = (positionId) => {
    if (!isVotingActive || hasVoted) return;
    setSelectedCandidates(prev => ({ ...prev, [positionId]: null }));
    const position = positions.find(p => p.id === positionId);
    toast.info(`Selection cleared for ${position?.title}`);
  };

  const openConfirmModal = () => {
    const missingSelections = positions.filter(pos => !selectedCandidates[pos.id]);
    if (missingSelections.length > 0) { 
      toast.error(`Please select candidates for: ${missingSelections.map(p => p.title).join(', ')}`); 
      return; 
    }
    setShowConfirmModal(true);
  };

const handleSubmitVote = async () => {
  setShowConfirmModal(false);
  setSubmitting(true);
  
  try {
    // Prepare votes with position title
    const votesToInsert = positions.map(position => ({ 
      voter_id: voter.id, 
      candidate_id: selectedCandidates[position.id],
      position_id: position.id,
      position: position.title,  // ← ADD THIS LINE (the column that's causing the error)
      election_id: election.id, 
      voting_period_id: votingPeriod.id, 
      ip_address: clientIP || 'unknown', 
      created_at: new Date().toISOString() 
    }));
    
    const { error: voteError } = await supabase
      .from('votes')
      .insert(votesToInsert);
    
    if (voteError) throw new Error(voteError.message || 'Failed to cast vote');
    
    // ... rest of your code
  } catch (error) {
    console.error('Submit vote error:', error);
    toast.error(error.message || 'Failed to cast vote. Please try again.');
  }
};

  const getSelectedCount = () => Object.values(selectedCandidates).filter(Boolean).length;

  const getFilteredCandidates = (candidates) => {
    if (!searchTerm) return candidates;
    return candidates.filter(candidate => 
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Loading Skeleton
  if (loading) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div className="h-64 bg-gray-200 rounded-xl"></div>
                  <div className="h-48 bg-gray-200 rounded-xl"></div>
                </div>
                <div className="lg:col-span-3 space-y-6">
                  <div className="h-96 bg-gray-200 rounded-xl"></div>
                  <div className="h-64 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // No Voting Period
  if (!votingPeriod) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center" data-aos="fade-up">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaClock className="text-green-600 text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Active Voting Period</h2>
            <p className="text-gray-500 mb-6">There is currently no active voting period. Please check back later.</p>
            <button onClick={() => router.push('/')} className="px-6 py-3 bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
              Return to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  // Not Active
  if (!isVotingActive && votingPeriod) {
    const now = new Date();
    const startDate = new Date(votingPeriod.start_date);
    const isBeforeStart = now < startDate;
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center" data-aos="fade-up">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaClock className="text-amber-500 text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{isBeforeStart ? 'Voting Not Yet Open' : 'Voting Has Ended'}</h2>
            <p className="text-gray-500 mb-6">
              {isBeforeStart 
                ? `Opens ${startDate.toLocaleDateString()} — ${new Date(votingPeriod.end_date).toLocaleDateString()}` 
                : `Closed on ${new Date(votingPeriod.end_date).toLocaleDateString()}`}
            </p>
            {timeLeft?.status === 'starts_in' && (
              <p className="text-2xl font-bold text-green-600 mb-6">{formatTimeLeft()}</p>
            )}
            <button onClick={() => router.push('/')} className="px-6 py-3 bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
              Return to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  // No Election
  if (!election) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center" data-aos="fade-up">
            <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaUniversity className="text-yellow-600 text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Active Election</h2>
            <p className="text-gray-500 mb-6">No active election has been set up for this voting period.</p>
            <button onClick={() => router.push('/')} className="px-6 py-3 bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
              Return to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  // No Positions
  if (positions.length === 0) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center" data-aos="fade-up">
            <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaInfoCircle className="text-yellow-600 text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Positions Available</h2>
            <p className="text-gray-500 mb-6">No positions or candidates have been set up for this election yet.</p>
            <button onClick={() => router.push('/')} className="px-6 py-3 bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
              Return to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  const progress = (getSelectedCount() / positions.length) * 100;

  // Main Interface
  return (
    <>
      <Toaster 
        position="top-center" 
        richColors 
        closeButton
        toastOptions={{
          duration: 3000,
          className: 'text-sm font-medium',
        }}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6" data-aos="zoom-in">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaVoteYea className="text-green-600 text-2xl" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Confirm Your Vote</h2>
              <p className="text-gray-500 text-sm mt-2">Please review your selections before casting your vote.</p>
            </div>
            
            <div className="max-h-96 overflow-y-auto mb-6 space-y-3">
              {positions.map(position => {
                const selectedCandidate = position.candidates?.find(c => c.id === selectedCandidates[position.id]);
                return (
                  <div key={position.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="font-semibold text-gray-700 text-sm">{position.title}</p>
                    <p className="text-green-600 text-sm">{selectedCandidate?.name}</p>
                  </div>
                );
              })}
            </div>
            
            <p className="text-center text-amber-600 text-sm mb-4 flex items-center justify-center gap-2">
              <FaExclamationTriangle />
              This action cannot be undone
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitVote}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 rounded-lg text-white font-semibold transition"
              >
                {submitting ? <FaSpinner className="animate-spin mx-auto" /> : 'Confirm Vote'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
        {/* Top bar */}
        <div className="h-1 bg-gradient-to-r from-green-900 via-green-500 to-amber-500 sticky top-0 z-50" />

        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-1 z-40 shadow-sm" data-aos="fade-down">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                  title="Back to Home"
                >
                  <FaArrowLeft className="text-gray-500" />
                </button>
                <div className="flex items-center gap-2">
                  <Image 
                    src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png" 
                    width={44} 
                    height={44} 
                    alt="Regent Logo" 
                    className="object-contain"
                  />
                  <Image 
                    src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png" 
                    width={44} 
                    height={44} 
                    alt="Logo" 
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{election?.title}</h1>
                  <p className="text-sm text-gray-500">Welcome back, <strong className="text-gray-700">{voter?.name}</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${
                  timeLeft?.minutes <= 5 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-100'
                }`}>
                  <FaRegClock className={getTimeColor()} />
                  <span className={`font-mono font-semibold ${getTimeColor()}`}>{formatTimeLeft()}</span>
                  <span className={`text-xs ${getTimeColor()}`}>remaining</span>
                </div>
                {hasVoted && (
                  <div className="flex items-center gap-2 bg-green-600 text-white rounded-full px-4 py-2 text-sm font-semibold">
                    <FaCheckCircle /> Voted
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {getSelectedCount()} of {positions.length} positions filled
              </span>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-4">
              {/* Election Info Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" data-aos="fade-right">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                  <FaCalendarAlt className="text-green-600" /> Election Info
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    <strong className="text-gray-800">Year:</strong> {election?.election_year}
                  </p>
                  {election?.description && (
                    <p className="text-gray-600">
                      <strong className="text-gray-800">About:</strong> {election.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm" data-aos="fade-right">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Ballot Status */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" data-aos="fade-right">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                  <FaInfoCircle className="text-green-600" /> Your Ballot
                </div>
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {positions.map(position => {
                    const done = !!selectedCandidates[position.id];
                    const selected = position.candidates?.find(c => c.id === selectedCandidates[position.id]);
                    return (
                      <li key={position.id} className={`flex items-start gap-2 p-2 rounded-lg ${done ? 'bg-green-50' : ''}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${done ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'}`}>
                          {done && <FaCheckCircle className="text-[10px]" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">{position.title}</p>
                          {done && <p className="text-xs text-green-700">{selected?.name}</p>}
                        </div>
                        {done && (
                          <button
                            onClick={() => clearSelection(position.id)}
                            className="text-gray-400 hover:text-red-500 transition text-xs"
                            title="Clear selection"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Instructions */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm" data-aos="fade-right" data-aos-delay="80">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                  <FaShieldAlt className="text-green-600" /> Instructions
                </div>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-start gap-2">— Select <strong className="text-gray-700">one candidate</strong> per position</li>
                  <li className="flex items-start gap-2">— All positions are <strong className="text-gray-700">mandatory</strong></li>
                  <li className="flex items-start gap-2">— Review before submitting</li>
                  <li className="flex items-start gap-2">— Votes are <strong className="text-gray-700">final</strong> and cannot be changed</li>
                </ul>
              </div>

              {/* Security Note */}
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3" data-aos="fade-right" data-aos-delay="160">
                <FaShieldAlt className="text-green-600 flex-shrink-0" />
                <span className="text-xs text-green-800 font-medium">Your vote is encrypted and fully anonymous</span>
              </div>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3 space-y-6">
              {hasVoted && (
                <div className="bg-green-50 border-l-4 border-green-600 rounded-lg p-4 flex items-start gap-3" data-aos="fade-up">
                  <FaCheckCircle className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-green-900 block">Thank you for voting!</strong>
                    <p className="text-green-700 text-sm">Your votes have been recorded securely. Redirecting...</p>
                  </div>
                </div>
              )}

              {!hasVoted && timeLeft?.minutes <= 5 && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3" data-aos="fade-up">
                  <FaBell className="text-red-500 text-xl flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-red-800 block">Time is running out!</strong>
                    <p className="text-red-700 text-sm">Less than 5 minutes remaining to cast your vote. Please complete your selections quickly.</p>
                  </div>
                </div>
              )}

              {positions.map((position, idx) => {
                const filteredCandidates = getFilteredCandidates(position.candidates || []);
                const hasSearchResults = searchTerm && filteredCandidates.length === 0;
                
                return (
                  <section key={position.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow" data-aos="fade-up" data-aos-delay={idx * 60}>
                    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl font-bold text-green-100">{(idx + 1).toString().padStart(2, '0')}</span>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">{position.title}</h2>
                          {position.description && <p className="text-xs text-gray-400 mt-1">{position.description}</p>}
                        </div>
                      </div>
                      {selectedCandidates[position.id] && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-semibold">
                            <FaCheckCircle /> Selected
                          </div>
                          <button
                            onClick={() => clearSelection(position.id)}
                            className="text-gray-400 hover:text-red-500 transition text-sm"
                            title="Clear selection"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      )}
                    </div>

                    {hasSearchResults ? (
                      <div className="text-center py-8 text-gray-500">
                        No candidates match your search for this position
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCandidates.map((candidate) => {
                          const isSelected = selectedCandidates[position.id] === candidate.id;
                          return (
                            <div
                              key={candidate.id}
                              onClick={() => !hasVoted && handleCandidateSelect(position.id, candidate.id)}
                              className={`relative border-2 rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'border-green-600 bg-green-50 shadow-md -translate-y-1' 
                                  : hasVoted 
                                    ? 'border-gray-200 opacity-55 cursor-not-allowed' 
                                    : 'border-gray-200 hover:border-green-400 hover:shadow-md hover:-translate-y-1'
                              }`}
                            >
                              <div className="relative inline-block mb-3">
                                {candidate.image_url ? (
                                  <img src={candidate.image_url} alt={candidate.name} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                                ) : (
                                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center border-2 border-gray-200">
                                    <FaUser className="text-green-600 text-2xl" />
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                                    <FaCheckCircle className="text-white text-sm" />
                                  </div>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-800">{candidate.name}</h3>
                              {candidate.department && <p className="text-xs text-gray-500 mt-1">{candidate.department}</p>}
                              {candidate.year_of_study && <p className="text-xs text-gray-400">Level {candidate.year_of_study}</p>}
                              {candidate.manifesto && (
                                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{candidate.manifesto.substring(0, 80)}...</p>
                              )}
                              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-green-600 rounded-b-xl transition-transform duration-300 origin-left ${isSelected ? 'scale-x-100' : 'scale-x-0'}`} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Submit Panel */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md" data-aos="fade-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Ready to Submit?</h3>
                    <p className="text-sm text-gray-500">Review all your selections above before casting</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold text-green-600">{getSelectedCount()}</span>
                    <span className="text-xl text-gray-300">/{positions.length}</span>
                  </div>
                </div>

                {getSelectedCount() < positions.length && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                    <FaExclamationTriangle className="text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-amber-800">Please select a candidate for all {positions.length} positions to continue</span>
                  </div>
                )}

                <button
                  onClick={openConfirmModal}
                  disabled={submitting || hasVoted || getSelectedCount() !== positions.length}
                  className="w-full py-4 bg-gradient-to-r from-green-800 to-green-600 hover:from-green-700 hover:to-green-500 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><FaSpinner className="animate-spin" /> Casting your vote...</>
                  ) : hasVoted ? (
                    <><FaCheckCircle /> Vote already cast</>
                  ) : getSelectedCount() !== positions.length ? (
                    <><FaVoteYea /> Select all positions first</>
                  ) : (
                    <><FaVoteYea /> Review & Cast Vote</>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 mt-4">
                  Votes are encrypted and anonymous. This action cannot be undone.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}