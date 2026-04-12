'use client';

import { useState, useEffect } from 'react';
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
  FaHome, FaEye, FaEyeSlash, FaChartLine
} from 'react-icons/fa';
import { useElectionData } from '@/hooks/useElectionData';

export default function ElectionResults() {
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [resultsData, setResultsData] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true); // Toggle state for statistics
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

  // Theme management
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Load saved preference for showing statistics
    const savedShowStats = localStorage.getItem('show_election_statistics');
    if (savedShowStats !== null) {
      setShowStatistics(savedShowStats === 'true');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    toast.success(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`);
  };

  // Toggle statistics visibility
  const toggleStatistics = () => {
    const newValue = !showStatistics;
    setShowStatistics(newValue);
    localStorage.setItem('show_election_statistics', newValue.toString());
    toast.success(newValue ? 'Statistics summary shown' : 'Statistics summary hidden');
  };

  // Theme styles
  const themeStyles = {
    dark: {
      background: 'from-[#02140f] via-[#063d2e] to-[#0b2545]',
      cardBg: 'bg-white/10 backdrop-blur-lg',
      cardBorder: 'border-white/20',
      textPrimary: 'text-white',
      textSecondary: 'text-white/80',
      textMuted: 'text-white/70',
      textLight: 'text-white/60',
      buttonHover: 'hover:bg-white/20',
      statBg: 'bg-white/10 backdrop-blur-lg',
      winnerBg: 'bg-gradient-to-r from-yellow-400/10 to-transparent',
      winnerBorder: 'border-yellow-400/50',
      progressBg: 'bg-white/20',
      progressWinner: 'bg-gradient-to-r from-yellow-400 to-amber-500',
      progressNormal: 'bg-green-500',
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
      winnerBg: 'bg-gradient-to-r from-yellow-100/50 to-transparent',
      winnerBorder: 'border-yellow-400',
      progressBg: 'bg-gray-200',
      progressWinner: 'bg-gradient-to-r from-yellow-500 to-amber-600',
      progressNormal: 'bg-emerald-500',
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

  useEffect(() => {
    // Process votingProgress into results format
    if (votingProgress && votingProgress.length > 0) {
      const results = {};
      let total = 0;
      
      votingProgress.forEach(position => {
        if (position.candidates && position.candidates.length > 0) {
          // Sort candidates by vote count
          const sortedCandidates = [...position.candidates].sort((a, b) => 
            (b.vote_count || 0) - (a.vote_count || 0)
          );
          
          results[position.name] = sortedCandidates;
          
          // Calculate total votes across all positions
          position.candidates.forEach(candidate => {
            total += (candidate.vote_count || 0);
          });
        }
      });
      
      setResultsData(results);
      setTotalVotes(total);
    }
  }, [votingProgress]);

  const getPositions = () => {
    return ['all', ...Object.keys(resultsData)];
  };

  const getFilteredResults = () => {
    if (selectedPosition === 'all') {
      return resultsData;
    }
    return { [selectedPosition]: resultsData[selectedPosition] || [] };
  };

  const getPercentage = (voteCount) => {
    if (totalVotes === 0) return 0;
    return ((voteCount / totalVotes) * 100).toFixed(1);
  };

  const getVoterTurnout = () => {
    if (totalStats.totalVoters === 0) return 0;
    return ((totalStats.totalVotersWhoVoted / totalStats.totalVoters) * 100).toFixed(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportResults = () => {
    // Create CSV data
    const headers = ['Position', 'Candidate Name', 'Department', 'Year', 'Votes', 'Percentage'];
    const rows = [];
    
    Object.entries(resultsData).forEach(([position, candidates]) => {
      candidates.forEach(candidate => {
        rows.push([
          position,
          candidate.name,
          candidate.department || 'N/A',
          candidate.year_of_study || 'N/A',
          candidate.vote_count || 0,
          `${getPercentage(candidate.vote_count || 0)}%`
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
    toast.success('Results exported successfully!');
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
            <FaSpinner className="animate-spin text-5xl text-green-500 mx-auto mb-4" />
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
            <FaInfoCircle className="text-5xl text-red-400 mx-auto mb-4" />
            <p className={`${currentTheme.textPrimary} text-lg mb-2`}>Unable to load results</p>
            <p className={`${currentTheme.textMuted} text-sm`}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-green-600 rounded-lg text-white hover:bg-green-500 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  const filteredResults = getFilteredResults();
  const positions = getPositions();
  const hasResults = Object.keys(resultsData).length > 0;

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

      {/* Home Button - Top Left */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:scale-110 transition-all duration-300 group"
        aria-label="Go to Home"
      >
        <FaHome className={`text-xl ${theme === 'dark' ? 'text-white/80 group-hover:text-green-400' : 'text-gray-700 group-hover:text-green-500'} transition`} />
      </Link>
      
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} pt-20 sm:pt-24 pb-8 sm:pb-12 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div data-aos="fade-down" data-aos-duration="1000" className="text-center mb-8 sm:mb-12">
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
              Election Results
            </h1>
            <p className={`text-base sm:text-lg md:text-xl ${currentTheme.textSecondary} max-w-2xl mx-auto`}>
              Official results of the Regent University Student Elections
            </p>
            
            {votingPeriod && (
              <div data-aos="fade-up" data-aos-delay="100" className="mt-6">
                <div className={`${currentTheme.cardBg} rounded-2xl p-4 inline-block border ${currentTheme.cardBorder}`}>
                  <div className={`${currentTheme.textSecondary}`}>
                    <div className="font-semibold text-base sm:text-lg mb-2">
                      {votingPeriod.name || 'Student Elections'}
                      {votingPeriod.year && ` ${votingPeriod.year}`}
                    </div>
                    <div className="text-xs sm:text-sm flex flex-col gap-1">
                      <div className="flex items-center justify-center gap-2">
                        <FaCalendarAlt className="text-green-400" />
                        <span>Started: {formatDate(votingPeriod.start_time)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <FaClock className="text-green-400" />
                        <span>Ends: {formatDate(votingPeriod.end_time)}</span>
                      </div>
                      {isVotingActive && (
                        <div className="mt-2 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs inline-block animate-pulse">
                          Voting In Progress
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Row - Export & Toggle Statistics */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            {/* Export Button */}
            {hasResults && (
              <button
                onClick={exportResults}
                className={`flex items-center gap-2 px-4 py-2 ${currentTheme.statBg} ${currentTheme.buttonHover} rounded-lg ${currentTheme.textPrimary} transition text-sm sm:text-base`}
              >
                <FaDownload />
                Export Results as CSV
              </button>
            )}
            
           
          </div>

          {/* Position Filter */}
          {hasResults && (
            <div data-aos="fade-up" data-aos-delay="150" className="mb-8">
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                {positions.map((position, idx) => (
                  <button
                    key={position}
                    onClick={() => setSelectedPosition(position)}
                    data-aos="zoom-in"
                    data-aos-delay={500 + idx * 50}
                    className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-semibold transition-all duration-300 text-xs sm:text-sm ${
                      selectedPosition === position
                        ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg'
                        : `${currentTheme.statBg} ${currentTheme.textMuted} ${currentTheme.buttonHover}`
                    }`}
                  >
                    {position === 'all' ? 'All Positions' : position}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Display - COMES FIRST */}
          {!hasResults ? (
            <div data-aos="fade-up" className="text-center py-12">
              <div className={`${currentTheme.cardBg} rounded-2xl p-8 border ${currentTheme.cardBorder}`}>
                <FaChartBar className="text-5xl sm:text-6xl text-white/30 mx-auto mb-4" />
                <p className={`${currentTheme.textMuted} text-base sm:text-lg`}>No results available yet.</p>
                <p className={`${currentTheme.textLight} text-xs sm:text-sm mt-2`}>
                  {isVotingActive 
                    ? 'Voting is in progress. Results will appear here as votes are cast.' 
                    : 'Results will be displayed after the election concludes.'}
                </p>
              </div>
            </div>
          ) : (
            Object.entries(filteredResults).map(([position, candidates], idx) => (
              <div key={position} data-aos="fade-up" data-aos-delay={200 + idx * 100} className="mb-10 sm:mb-12">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <FaTrophy className="text-2xl sm:text-3xl text-yellow-400" />
                  <h2 className={`text-xl sm:text-2xl font-bold ${currentTheme.textPrimary}`}>{position}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
                  <span className={`${currentTheme.textLight} text-xs sm:text-sm`}>{candidates.length} candidates</span>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {candidates.map((candidate, index) => {
                    const isWinner = index === 0;
                    const voteCount = candidate.vote_count || 0;
                    const percentage = getPercentage(voteCount);
                    const barWidth = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                    
                    return (
                      <div 
                        key={candidate.id}
                        data-aos="fade-right"
                        data-aos-delay={200 + idx * 100 + index * 50}
                        className={`${currentTheme.cardBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] ${
                          isWinner 
                            ? `${currentTheme.winnerBorder} ${currentTheme.winnerBg}`
                            : currentTheme.cardBorder
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1">
                            {/* Ranking Badge */}
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 ${
                              index === 0 ? 'bg-yellow-400 text-gray-900' :
                              index === 1 ? 'bg-gray-400 text-gray-900' :
                              index === 2 ? 'bg-amber-600 text-white' :
                              'bg-white/20 text-white'
                            }`}>
                              {index === 0 ? <FaTrophy className="text-sm sm:text-base" /> : index === 1 ? <FaMedal className="text-sm sm:text-base" /> : index + 1}
                            </div>

                            {/* Candidate Image */}
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                              {candidate.image_url ? (
                                <Image 
                                  src={candidate.image_url}
                                  alt={candidate.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/50">
                                  <FaUserCheck size={24} className="sm:text-3xl" />
                                </div>
                              )}
                            </div>

                            {/* Candidate Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className={`text-base sm:text-xl font-semibold ${currentTheme.textPrimary} truncate`}>{candidate.name}</h3>
                                {isWinner && (
                                  <span className="px-2 py-0.5 sm:py-1 bg-yellow-400/20 text-yellow-300 text-[10px] sm:text-xs rounded-full flex items-center gap-1 whitespace-nowrap">
                                    <FaCheckCircle className="text-[8px] sm:text-xs" />
                                    Winner
                                  </span>
                                )}
                              </div>
                              <p className={`${currentTheme.textLight} text-xs sm:text-sm truncate`}>
                                {candidate.department || 'Department not specified'} 
                                {candidate.year_of_study && ` • Level ${candidate.year_of_study}`}
                              </p>
                            </div>
                          </div>

                          {/* Vote Count */}
                          <div className="text-left sm:text-right">
                            <p className={`text-xl sm:text-2xl font-bold ${currentTheme.textPrimary}`}>{voteCount}</p>
                            <p className={`${currentTheme.textLight} text-xs sm:text-sm`}>votes ({percentage}%)</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 sm:mt-4">
                          <div className={`h-1.5 sm:h-2 ${currentTheme.progressBg} rounded-full overflow-hidden`}>
                            <div 
                              className={`h-full transition-all duration-1000 ${
                                isWinner ? currentTheme.progressWinner : currentTheme.progressNormal
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>

                        {/* Manifesto Preview (for winner) */}
                        {isWinner && candidate.manifesto && (
                          <div className={`mt-3 sm:mt-4 p-3 sm:p-4 ${currentTheme.modalBg} rounded-lg`}>
                            <p className={`${currentTheme.textLight} text-xs sm:text-sm italic line-clamp-2`}>
                              "{candidate.manifesto.substring(0, 150)}..."
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

           {/* Toggle Statistics Button */}
            <button
              onClick={toggleStatistics}
              className={`flex items-center gap-2 px-4 py-2 ${currentTheme.toggleButton} rounded-lg ${currentTheme.textPrimary} transition-all duration-300 hover:scale-105 text-sm sm:text-base`}
            >
              {showStatistics ? (
                <>
                  <FaEyeSlash />
                  Hide Statistics Summary
                </>
              ) : (
                <>
                  <FaEye />
                  Show Statistics Summary
                </>
              )}
            </button>

          {/* ========== STATISTICS SUMMARY - OPTIONAL TOGGLE ========== */}
          {showStatistics && hasResults && (
            <div data-aos="fade-up" data-aos-delay="300" className="mt-10 sm:mt-12">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <FaChartLine className="text-2xl text-green-400" />
                  <h2 className={`text-2xl sm:text-3xl font-bold ${currentTheme.textPrimary}`}>
                    Election Statistics Summary
                  </h2>
                </div>
                <div className="w-20 h-1 bg-gradient-to-r from-green-500 to-emerald-500 mx-auto rounded-full"></div>
                <p className={`${currentTheme.textLight} text-xs mt-2`}>
                  Click the "Hide Statistics" button above to collapse this section
                </p>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div data-aos="fade-up" data-aos-delay="350" className={`${currentTheme.statBg} rounded-2xl p-4 sm:p-6 border ${currentTheme.cardBorder} transition-all duration-300 hover:scale-105`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`${currentTheme.textMuted} text-xs sm:text-sm`}>Total Votes Cast</p>
                      <p className={`text-2xl sm:text-3xl font-bold ${currentTheme.textPrimary} mt-2`}>{totalStats.totalVotes.toLocaleString()}</p>
                    </div>
                    <FaVoteYea className="text-3xl sm:text-4xl text-green-400" />
                  </div>
                </div>

                <div data-aos="fade-up" data-aos-delay="400" className={`${currentTheme.statBg} rounded-2xl p-4 sm:p-6 border ${currentTheme.cardBorder} transition-all duration-300 hover:scale-105`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`${currentTheme.textMuted} text-xs sm:text-sm`}>Registered Voters</p>
                      <p className={`text-2xl sm:text-3xl font-bold ${currentTheme.textPrimary} mt-2`}>{totalStats.totalVoters.toLocaleString()}</p>
                    </div>
                    <FaUsers className="text-3xl sm:text-4xl text-blue-400" />
                  </div>
                </div>

               

                <div data-aos="fade-up" data-aos-delay="500" className={`${currentTheme.statBg} rounded-2xl p-4 sm:p-6 border ${currentTheme.cardBorder} transition-all duration-300 hover:scale-105`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`${currentTheme.textMuted} text-xs sm:text-sm`}>Voter Turnout</p>
                      <p className={`text-2xl sm:text-3xl font-bold ${currentTheme.textPrimary} mt-2`}>{getVoterTurnout()}%</p>
                    </div>
                    <FaPercentage className="text-3xl sm:text-4xl text-yellow-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div data-aos="fade-up" className="mt-6 sm:mt-8 text-center">
            <div className={`${currentTheme.cardBg} rounded-2xl p-4 sm:p-6 border ${currentTheme.cardBorder}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <FaShieldAlt className="text-green-400 text-sm sm:text-base" />
                <p className={`${currentTheme.textLight} text-xs sm:text-sm`}>
                  These results are final and certified by the Electoral Commission of Regent University.
                </p>
              </div>
              <p className={`${currentTheme.textLight} text-xs sm:text-sm`}>
                Last updated: {lastUpdated?.toLocaleTimeString() || 'Just now'}
                {isVotingActive && (
                  <span className="block mt-2 text-green-400 text-[10px] sm:text-xs animate-pulse">
                    Live updates are active
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
