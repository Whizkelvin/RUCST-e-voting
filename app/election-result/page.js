// app/election-result/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { 
  FaChartBar, 
  FaVoteYea, 
  FaUserCheck, 
  FaSpinner, 
  FaTrophy, 
  FaMedal,
  FaCheckCircle,
  FaUsers,
  FaCalendarAlt,
  FaPercentage,
  FaClock,
  FaInfoCircle,
  FaDownload
} from 'react-icons/fa';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useElectionData } from '@/hooks/useElectionData';

export default function ElectionResults() {
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [resultsData, setResultsData] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
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

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#02140f] via-[#063d2e] to-[#0b2545] flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-5xl text-green-500 mx-auto mb-4" />
          <p className="text-white text-lg">Loading election results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#02140f] via-[#063d2e] to-[#0b2545] flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md">
          <FaInfoCircle className="text-5xl text-red-400 mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Unable to load results</p>
          <p className="text-white/70 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-green-600 rounded-lg text-white hover:bg-green-500 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const filteredResults = getFilteredResults();
  const positions = getPositions();
  const hasResults = Object.keys(resultsData).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02140f] via-[#063d2e] to-[#0b2545] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div data-aos="fade-up" className="text-center mb-12">
          <div className="flex justify-center gap-4 mb-4">
            <Image 
              src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png"
              width={80}
              height={80}
              alt="logo"
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Election Results
          </h1>
          <p className="text-xl text-white/80">
            Official results of the Regent University Student Elections
          </p>
          
          {votingPeriod && (
            <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-4 inline-block">
              <div className="text-white/90">
                <div className="font-semibold text-lg mb-2">
                  {votingPeriod.name || 'Student Elections'}
                  {votingPeriod.year && ` ${votingPeriod.year}`}
                </div>
                <div className="text-sm flex flex-col gap-1">
                  <div className="flex items-center justify-center gap-2">
                    <FaCalendarAlt className="text-green-400" />
                    <span>Started: {formatDate(votingPeriod.start_time)}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <FaClock className="text-green-400" />
                    <span>Ends: {formatDate(votingPeriod.end_time)}</span>
                  </div>
                  {isVotingActive && (
                    <div className="mt-2 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs inline-block">
                      Voting In Progress
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div data-aos="fade-up" data-aos-delay="100" className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Votes Cast</p>
                <p className="text-3xl font-bold text-white mt-2">{totalStats.totalVotes.toLocaleString()}</p>
              </div>
              <FaVoteYea className="text-4xl text-green-400" />
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="200" className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Registered Voters</p>
                <p className="text-3xl font-bold text-white mt-2">{totalStats.totalVoters.toLocaleString()}</p>
              </div>
              <FaUsers className="text-4xl text-blue-400" />
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="300" className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Voters Who Voted</p>
                <p className="text-3xl font-bold text-white mt-2">{totalStats.totalVotersWhoVoted.toLocaleString()}</p>
              </div>
              <FaUserCheck className="text-4xl text-purple-400" />
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="400" className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Voter Turnout</p>
                <p className="text-3xl font-bold text-white mt-2">{getVoterTurnout()}%</p>
              </div>
              <FaPercentage className="text-4xl text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Export Button */}
        {hasResults && (
          <div data-aos="fade-up" data-aos-delay="450" className="flex justify-end mb-6">
            <button
              onClick={exportResults}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
            >
              <FaDownload />
              Export Results as CSV
            </button>
          </div>
        )}

        {/* Position Filter */}
        {hasResults && (
          <div data-aos="fade-up" data-aos-delay="500" className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              {positions.map((position) => (
                <button
                  key={position}
                  onClick={() => setSelectedPosition(position)}
                  className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                    selectedPosition === position
                      ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {position === 'all' ? 'All Positions' : position}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Display */}
        {!hasResults ? (
          <div data-aos="fade-up" className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <FaChartBar className="text-6xl text-white/30 mx-auto mb-4" />
              <p className="text-white/70 text-lg">No results available yet.</p>
              <p className="text-white/50 text-sm mt-2">
                {isVotingActive 
                  ? 'Voting is in progress. Results will appear here as votes are cast.' 
                  : 'Results will be displayed after the election concludes.'}
              </p>
            </div>
          </div>
        ) : (
          Object.entries(filteredResults).map(([position, candidates], idx) => (
            <div key={position} data-aos="fade-up" data-aos-delay={600 + idx * 100} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <FaTrophy className="text-3xl text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">{position}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
                <span className="text-white/50 text-sm">{candidates.length} candidates</span>
              </div>

              <div className="space-y-4">
                {candidates.map((candidate, index) => {
                  const isWinner = index === 0;
                  const voteCount = candidate.vote_count || 0;
                  const percentage = getPercentage(voteCount);
                  const barWidth = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                  
                  return (
                    <div 
                      key={candidate.id}
                      className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02] ${
                        isWinner 
                          ? 'border-yellow-400/50 bg-gradient-to-r from-yellow-400/10 to-transparent' 
                          : 'border-white/20'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Ranking Badge */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            index === 0 ? 'bg-yellow-400 text-gray-900' :
                            index === 1 ? 'bg-gray-400 text-gray-900' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-white/20 text-white'
                          }`}>
                            {index === 0 ? <FaTrophy /> : index === 1 ? <FaMedal /> : index + 1}
                          </div>

                          {/* Candidate Image */}
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
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
                                <FaUserCheck size={32} />
                              </div>
                            )}
                          </div>

                          {/* Candidate Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-semibold text-white">{candidate.name}</h3>
                              {isWinner && (
                                <span className="px-2 py-1 bg-yellow-400/20 text-yellow-300 text-xs rounded-full flex items-center gap-1">
                                  <FaCheckCircle className="text-xs" />
                                  Winner
                                </span>
                              )}
                            </div>
                            <p className="text-white/60 text-sm">
                              {candidate.department || 'Department not specified'} 
                              {candidate.year_of_study && ` • Level ${candidate.year_of_study}`}
                            </p>
                          </div>
                        </div>

                        {/* Vote Count */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">{voteCount}</p>
                          <p className="text-white/60 text-sm">votes ({percentage}%)</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              isWinner ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      {/* Manifesto Preview (for winner) */}
                      {isWinner && candidate.manifesto && (
                        <div className="mt-4 p-4 bg-white/5 rounded-lg">
                          <p className="text-white/70 text-sm italic">"{candidate.manifesto.substring(0, 200)}..."</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Footer Info */}
        <div data-aos="fade-up" className="mt-12 text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <p className="text-white/70 text-sm">
              These results are final and certified by the Electoral Commission of Regent University.
              <br />
              Last updated: {lastUpdated.toLocaleTimeString()}
              {isVotingActive && (
                <span className="block mt-2 text-green-400 text-xs animate-pulse">
                  Live updates are active
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}