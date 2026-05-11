'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Toaster, toast } from 'sonner';
import AOS from 'aos';
import 'aos/dist/aos.css';
import Link from 'next/link';
import { 
  FaChartBar, FaVoteYea, FaUserCheck, FaSpinner, FaTrophy, 
  FaMedal, FaCheckCircle, FaUsers, FaCalendarAlt, FaPercentage,
  FaClock, FaInfoCircle, FaDownload, FaSun, FaMoon, FaShieldAlt,
  FaHome, FaEye, FaEyeSlash, FaChartLine, FaLock
} from 'react-icons/fa';
import { useElectionData } from '@/hooks/useElectionData';

export default function ElectionResults() {
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [resultsData, setResultsData] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [canViewResults, setCanViewResults] = useState(false);
  const [timeUntilResults, setTimeUntilResults] = useState(null);
  const router = useRouter();
  
  const { 
    loading, 
    error, 
    votingProgress, 
    isVotingActive, 
    votingPeriod,
    totalStats,
    lastUpdated 
  } = useElectionData();

  // Get icon color based on theme
  const getIconColor = () => {
    return theme === 'light' ? 'text-gray-700' : 'text-gray-300';
  };

  // Theme management
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const savedShowStats = localStorage.getItem('show_election_statistics');
    if (savedShowStats !== null) {
      setShowStatistics(savedShowStats === 'true');
    }
  }, []);

  // Function to calculate if results can be viewed - using same logic as CountdownTimer
  const calculateResultsAvailability = useCallback(() => {
    // If voting period doesn't exist
    if (!votingPeriod || !votingPeriod.start_time || !votingPeriod.end_time) {
      return {
        canView: false,
        timeRemaining: null,
        message: 'Voting schedule not configured'
      };
    }

    const now = new Date();
    const start = new Date(votingPeriod.start_time);
    const end = new Date(votingPeriod.end_time);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        canView: false,
        timeRemaining: null,
        message: 'Invalid date format'
      };
    }

    // Results can only be viewed AFTER voting has ended
    if (now > end) {
      // Voting has ended - show results
      return {
        canView: true,
        timeRemaining: null,
        message: 'Results Available'
      };
    } else if (now >= start && now <= end) {
      // Voting is active - show lock screen
      const timeRemaining = end - now;
      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      
      return {
        canView: false,
        timeRemaining: { hours, minutes, seconds, endDate: end },
        message: 'Voting in progress'
      };
    } else if (now < start) {
      // Voting hasn't started yet - show lock screen with countdown to start
      const timeToStart = start - now;
      const days = Math.floor(timeToStart / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeToStart % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeToStart % (1000 * 60)) / 1000);
      
      return {
        canView: false,
        timeRemaining: { days, hours, minutes, seconds, startDate: start },
        message: 'Voting not yet started'
      };
    } else {
      return {
        canView: false,
        timeRemaining: null,
        message: 'Results unavailable'
      };
    }
  }, [votingPeriod]);

  // Check results availability on mount and when votingPeriod changes
  useEffect(() => {
    if (!votingPeriod) return;

    const checkAvailability = () => {
      const availability = calculateResultsAvailability();
      setCanViewResults(availability.canView);
      
      if (!availability.canView && availability.timeRemaining) {
        setTimeUntilResults(availability.timeRemaining);
      } else {
        setTimeUntilResults(null);
      }
    };

    checkAvailability();
    
    // Update every second like the CountdownTimer
    const timer = setInterval(checkAvailability, 1000);
    return () => clearInterval(timer);
  }, [votingPeriod, calculateResultsAvailability]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    toast.success(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`);
  };

  const toggleStatistics = () => {
    const newValue = !showStatistics;
    setShowStatistics(newValue);
    localStorage.setItem('show_election_statistics', newValue.toString());
    toast.success(newValue ? 'Statistics summary shown' : 'Statistics summary hidden');
  };

  // Theme styles - Grayscale
  const themeStyles = {
    dark: {
      background: 'from-gray-900 via-gray-800 to-gray-900',
      cardBg: 'bg-white/10 backdrop-blur-lg',
      cardBorder: 'border-white/20',
      textPrimary: 'text-white',
      textSecondary: 'text-white/80',
      textMuted: 'text-white/70',
      textLight: 'text-white/60',
      buttonHover: 'hover:bg-white/20',
      statBg: 'bg-white/10 backdrop-blur-lg',
      winnerBg: 'bg-gradient-to-r from-gray-500/10 to-transparent',
      winnerBorder: 'border-gray-400/50',
      progressBg: 'bg-white/20',
      progressWinner: 'bg-gray-400',
      progressNormal: 'bg-gray-500',
      modalBg: 'bg-white/10 backdrop-blur-lg',
      toggleButton: 'bg-white/10 hover:bg-white/20',
    },
    light: {
      background: 'from-gray-50 via-white to-gray-100',
      cardBg: 'bg-white/80 backdrop-blur-lg',
      cardBorder: 'border-gray-200',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-800',
      textMuted: 'text-gray-700',
      textLight: 'text-gray-600',
      buttonHover: 'hover:bg-gray-200',
      statBg: 'bg-white/80 backdrop-blur-lg',
      winnerBg: 'bg-gradient-to-r from-gray-200/50 to-transparent',
      winnerBorder: 'border-gray-400',
      progressBg: 'bg-gray-200',
      progressWinner: 'bg-gray-700',
      progressNormal: 'bg-gray-500',
      modalBg: 'bg-white/80 backdrop-blur-lg',
      toggleButton: 'bg-gray-100 hover:bg-gray-200',
    }
  };

  const currentTheme = themeStyles[theme];

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
      easing: 'ease-in-out',
    });
  }, []);

  // Process results only when viewing is allowed
  useEffect(() => {
    if (!canViewResults) return;
    
    if (votingProgress && votingProgress.length > 0) {
      const results = {};
      let total = 0;
      
      votingProgress.forEach(position => {
        if (position.candidates && position.candidates.length > 0) {
          const sortedCandidates = [...position.candidates].sort((a, b) => 
            (b.vote_count || 0) - (a.vote_count || 0)
          );
          
          results[position.name] = sortedCandidates;
          
          position.candidates.forEach(candidate => {
            total += (candidate.vote_count || 0);
          });
        }
      });
      
      setResultsData(results);
      setTotalVotes(total);
    }
  }, [votingProgress, canViewResults]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const exportResults = () => {
    if (!canViewResults) {
      toast.error('Results are not yet available for export');
      return;
    }
    
    try {
      const headers = ['Position', 'Candidate Name', 'Department', 'Year', 'Votes', 'Percentage'];
      const rows = [];
      const total = totalVotes;
      
      Object.entries(resultsData).forEach(([position, candidates]) => {
        candidates.forEach(candidate => {
          const percentage = total > 0 ? ((candidate.vote_count || 0) / total * 100).toFixed(1) : 0;
          rows.push([
            position,
            candidate.name,
            candidate.department || 'N/A',
            candidate.year_of_study || 'N/A',
            candidate.vote_count || 0,
            `${percentage}%`
          ]);
        });
      });
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `election_results_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Results exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export results');
    }
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center`}>
          <div className="text-center">
            <FaSpinner className={`animate-spin text-5xl ${getIconColor()} mx-auto mb-4`} />
            <p className={`${currentTheme.textPrimary} text-lg`}>Loading election results...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center p-4`}>
          <div className={`${currentTheme.cardBg} rounded-2xl p-8 max-w-md text-center border ${currentTheme.cardBorder}`}>
            <FaInfoCircle className={`text-5xl ${getIconColor()} mx-auto mb-4`} />
            <p className={`${currentTheme.textPrimary} text-lg mb-2`}>Unable to load results</p>
            <p className={`${currentTheme.textMuted} text-sm`}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-500 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  // ========== RESULTS NOT AVAILABLE YET - SHOW LOCK SCREEN ==========
  if (!canViewResults) {
    return (
      <>
        <Toaster position="top-center" richColors closeButton />
        
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

        <Link
          href="/"
          className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300 group"
          aria-label="Go to Home"
        >
          <FaHome className={`text-xl ${getIconColor()} transition`} />
        </Link>
        
        <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} pt-20 sm:pt-24 pb-8 sm:pb-12 transition-all duration-300 flex items-center justify-center`}>
          <div className="max-w-md mx-auto px-4">
            <div data-aos="fade-up" className={`${currentTheme.cardBg} rounded-2xl p-6 sm:p-8 text-center border ${currentTheme.cardBorder}`}>
              
              
              <h2 className={`text-xl sm:text-2xl font-bold ${currentTheme.textPrimary} mb-3`}>
                Results Not Yet Available
              </h2>
              
              <p className={`${currentTheme.textMuted} text-sm mb-4`}>
                Election results will be displayed here after the voting period has ended.
              </p>
              
              {timeUntilResults && (
                <div className={`${currentTheme.modalBg} rounded-xl p-4 mb-6`}>
                  <p className={`${currentTheme.textLight} text-xs mb-2`}>
                    Results will be available in:
                  </p>
                  <div className="flex justify-center gap-3 sm:gap-4">
                    {/* Show days if available (for voting not started yet) */}
                    {timeUntilResults.days !== undefined && (
                      <>
                        <div className="text-center">
                          <p className={`text-2xl sm:text-3xl font-bold ${currentTheme.textPrimary}`}>
                            {String(Math.max(0, timeUntilResults.days)).padStart(2, '0')}
                          </p>
                          <p className={`${currentTheme.textLight} text-xs`}>Days</p>
                        </div>
                        <div className="text-2xl text-gray-500">:</div>
                      </>
                    )}
                    
                    <div className="text-center">
                      <p className={`text-2xl sm:text-3xl font-bold ${currentTheme.textPrimary}`}>
                        {String(Math.max(0, timeUntilResults.hours || 0)).padStart(2, '0')}
                      </p>
                      <p className={`${currentTheme.textLight} text-xs`}>Hours</p>
                    </div>
                    <div className="text-2xl text-gray-500">:</div>
                    <div className="text-center">
                      <p className={`text-2xl sm:text-3xl font-bold ${currentTheme.textPrimary}`}>
                        {String(Math.max(0, timeUntilResults.minutes || 0)).padStart(2, '0')}
                      </p>
                      <p className={`${currentTheme.textLight} text-xs`}>Minutes</p>
                    </div>
                    <div className="text-2xl text-gray-500">:</div>
                    <div className="text-center">
                      <p className={`text-2xl sm:text-3xl font-bold ${currentTheme.textPrimary}`}>
                        {String(Math.max(0, timeUntilResults.seconds || 0)).padStart(2, '0')}
                      </p>
                      <p className={`${currentTheme.textLight} text-xs`}>Seconds</p>
                    </div>
                  </div>
                  
                  {timeUntilResults.endDate && (
                    <p className={`${currentTheme.textLight} text-xs mt-3`}>
                      Voting ends on: {formatDate(timeUntilResults.endDate)}
                    </p>
                  )}
                  {timeUntilResults.startDate && (
                    <p className={`${currentTheme.textLight} text-xs mt-3`}>
                      Voting starts on: {formatDate(timeUntilResults.startDate)}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl text-white font-semibold transition"
                >
                  Return to Home
                </button>
                
                {isVotingActive && (
                  <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-3 bg-green-800 hover:bg-green-700 rounded-xl text-white font-semibold transition"
                  >
                    Cast Your Vote
                  </button>
                )}
              </div>
              
              <p className={`${currentTheme.textLight} text-xs mt-6`}>
                The Electoral Commission is committed to fair and transparent elections.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ========== RESULTS AVAILABLE - SHOW FULL RESULTS ==========
  const hasResults = Object.keys(resultsData).length > 0;
  const getPercentage = (voteCount) => {
    if (totalVotes === 0) return 0;
    return ((voteCount / totalVotes) * 100).toFixed(1);
  };

  const getVoterTurnout = () => {
    if (totalStats.totalVoters === 0) return 0;
    return ((totalStats.totalVotersWhoVoted / totalStats.totalVoters) * 100).toFixed(1);
  };

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <FaSun className="text-yellow-400 text-xl" /> : <FaMoon className="text-gray-700 text-xl" />}
      </button>

      <Link href="/" className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300">
        <FaHome className={`text-xl ${getIconColor()} transition`} />
      </Link>
      
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} pt-20 sm:pt-24 pb-8 sm:pb-12 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div data-aos="fade-down" className="text-center mb-8 sm:mb-12">
            <div className="flex justify-center gap-4 mb-4">
              <Image 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png"
                width={70}
                height={70}
                alt="Regent Logo"
                className="object-contain sm:w-20 sm:h-20"
              />
              <Image 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png"
                width={70}
                height={70}
                alt="E-Voting Logo"
                className="object-contain sm:w-20 sm:h-20"
              />
            </div>
            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold ${currentTheme.textPrimary} mb-3 sm:mb-4`}>
              Official Election Results
            </h1>
            <p className={`text-base sm:text-lg md:text-xl ${currentTheme.textSecondary} max-w-2xl mx-auto`}>
              Results of the Regent University Student Elections
            </p>
            
            {votingPeriod && (
              <div data-aos="fade-up" className="mt-6">
                <div className={`${currentTheme.cardBg} rounded-2xl p-4 inline-block border ${currentTheme.cardBorder}`}>
                  <div className="flex items-center gap-2 text-green-500">
                    <FaCheckCircle />
                    <span className={`${currentTheme.textPrimary} text-sm`}>
                      Voting has concluded - Official Results
                    </span>
                  </div>
                  {votingPeriod.end_time && (
                    <p className={`${currentTheme.textLight} text-xs mt-2`}>
                      Results finalized on: {formatDate(votingPeriod.end_time)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Display */}
          {!hasResults ? (
            <div data-aos="fade-up" className="text-center py-12">
              <div className={`${currentTheme.cardBg} rounded-2xl p-8 border ${currentTheme.cardBorder}`}>
                <FaChartBar className="text-5xl sm:text-6xl text-white/30 mx-auto mb-4" />
                <p className={`${currentTheme.textMuted} text-base sm:text-lg`}>No results available for this election.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Position Filter */}
              <div data-aos="fade-up" className="mb-8">
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                  <button
                    onClick={() => setSelectedPosition('all')}
                    className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-semibold transition text-xs sm:text-sm ${
                      selectedPosition === 'all'
                        ? 'bg-gradient-to-r from-gray-700 to-gray-600 text-white shadow-lg'
                        : `${currentTheme.statBg} ${currentTheme.textMuted} ${currentTheme.buttonHover}`
                    }`}
                  >
                    All Positions
                  </button>
                  {Object.keys(resultsData).map((position) => (
                    <button
                      key={position}
                      onClick={() => setSelectedPosition(position)}
                      className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-semibold transition text-xs sm:text-sm ${
                        selectedPosition === position
                          ? 'bg-gradient-to-r from-gray-700 to-gray-600 text-white shadow-lg'
                          : `${currentTheme.statBg} ${currentTheme.textMuted} ${currentTheme.buttonHover}`
                      }`}
                    >
                      {position}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results List */}
              {Object.entries(selectedPosition === 'all' ? resultsData : { [selectedPosition]: resultsData[selectedPosition] || [] }).map(([position, candidates], idx) => (
                <div key={position} data-aos="fade-up" data-aos-delay={idx * 100} className="mb-10 sm:mb-12">
                  <h2 className={`text-xl sm:text-2xl font-bold ${currentTheme.textPrimary} mb-4 sm:mb-6`}>{position}</h2>
                  <div className="space-y-3 sm:space-y-4">
                    {candidates.map((candidate, index) => {
                      const isWinner = index === 0;
                      const voteCount = candidate.vote_count || 0;
                      const percentage = getPercentage(voteCount);
                      const barWidth = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                      
                      return (
                        <div key={candidate.id} className={`${currentTheme.cardBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-all duration-300 ${
                          isWinner ? `${currentTheme.winnerBorder} ${currentTheme.winnerBg}` : currentTheme.cardBorder
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                {candidate.image_url ? (
                                  <Image src={candidate.image_url} alt={candidate.name} width={64} height={64} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FaUserCheck size={24} className="text-white/50" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className={`text-base sm:text-xl font-semibold ${currentTheme.textPrimary}`}>{candidate.name}</h3>
                                  {isWinner && (
                                    <span className="px-2 py-0.5 bg-gray-600 text-white text-[10px] rounded-full flex items-center gap-1">
                                      <FaTrophy className="text-[8px]" /> Winner
                                    </span>
                                  )}
                                </div>
                                <p className={`${currentTheme.textLight} text-xs`}>
                                  {candidate.department || 'Department not specified'}
                                  {candidate.year_of_study && ` • Level ${candidate.year_of_study}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className={`text-xl sm:text-2xl font-bold ${currentTheme.textPrimary}`}>{voteCount}</p>
                              <p className={`${currentTheme.textLight} text-xs`}>votes ({percentage}%)</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className={`h-1.5 sm:h-2 ${currentTheme.progressBg} rounded-full overflow-hidden`}>
                              <div className={`h-full transition-all duration-1000 ${isWinner ? currentTheme.progressWinner : currentTheme.progressNormal}`} style={{ width: `${barWidth}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Export Button */}
              <div className="flex justify-center mb-6">
                <button onClick={exportResults} className={`flex items-center gap-2 px-4 py-2 ${currentTheme.toggleButton} rounded-lg ${currentTheme.textPrimary} transition text-sm`}>
                  <FaDownload /> Download Results as CSV
                </button>
              </div>

              {/* Statistics Summary */}
              <div data-aos="fade-up" className="mt-10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`${currentTheme.statBg} rounded-2xl p-4 text-center border ${currentTheme.cardBorder}`}>
                    <p className={`${currentTheme.textMuted} text-xs`}>Total Votes Cast</p>
                    <p className={`text-2xl font-bold ${currentTheme.textPrimary}`}>{totalStats.totalVotes.toLocaleString()}</p>
                  </div>
                  <div className={`${currentTheme.statBg} rounded-2xl p-4 text-center border ${currentTheme.cardBorder}`}>
                    <p className={`${currentTheme.textMuted} text-xs`}>Registered Voters</p>
                    <p className={`text-2xl font-bold ${currentTheme.textPrimary}`}>{totalStats.totalVoters.toLocaleString()}</p>
                  </div>
                  <div className={`${currentTheme.statBg} rounded-2xl p-4 text-center border ${currentTheme.cardBorder}`}>
                    <p className={`${currentTheme.textMuted} text-xs`}>Voter Turnout</p>
                    <p className={`text-2xl font-bold ${currentTheme.textPrimary}`}>{getVoterTurnout()}%</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div data-aos="fade-up" className="mt-8 text-center">
            <div className={`${currentTheme.cardBg} rounded-2xl p-4 border ${currentTheme.cardBorder}`}>
              <p className={`${currentTheme.textLight} text-xs`}>
                These results are final and certified by the Electoral Commission of Regent University.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}