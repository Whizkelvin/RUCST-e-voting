// app/components/PublicElectionResults.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { 
  FaSpinner, 
  FaChartBar, 
  FaVoteYea, 
  FaUsers, 
  FaTrophy,
  FaPercentage,
  FaUserCheck,
  FaCalendarAlt,
  FaUniversity,
  FaEye,
  FaRegUserCircle
} from 'react-icons/fa';

export default function PublicElectionResults() {
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [results, setResults] = useState({});
  const [stats, setStats] = useState({
    totalVoters: 0,
    totalVotes: 0,
    participationRate: 0,
    votersWhoVoted: 0
  });

  // Helper function to get public URL for candidate image
  const getCandidateImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Get public URL from Supabase storage bucket
    const { data } = supabase.storage
      .from('candidate-photos')
      .getPublicUrl(imagePath);
    
    return data.publicUrl;
  };

  useEffect(() => {
    fetchCompletedElections();
  }, []);

  const fetchCompletedElections = async () => {
    try {
      setLoading(true);
      
      // Fetch only completed elections (not active) for public viewing
      const { data: electionsData, error: electionsError } = await supabase
        .from('elections')
        .select('*')
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (electionsError) throw electionsError;

      // Filter out test elections
      const validElections = (electionsData || []).filter(e => 
        e.title && 
        e.title !== 'src2026' && 
        e.title !== 'sorth' &&
        !e.title.includes('src')
      );
      
      setElections(validElections);
      
      if (validElections && validElections.length > 0) {
        setSelectedElection(validElections[0]);
        await fetchPublicResults(validElections[0].id);
      }
      
    } catch (error) {
      console.error('Error fetching elections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicResults = async (electionId) => {
    try {
      setLoading(true);
      
      // Fetch candidates with their image URLs
      let { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .eq('election_id', electionId);

      if (!candidates || candidates.length === 0) {
        const { data: allCandidates, error: allError } = await supabase
          .from('candidates')
          .select('*');
        
        if (!allError && allCandidates) {
          candidates = allCandidates;
        }
      }

      if (!candidates || candidates.length === 0) {
        setResults({});
        setLoading(false);
        return;
      }

      // Get vote counts for each candidate and process images
      const candidatesWithVotes = await Promise.all(
        candidates.map(async (candidate) => {
          const { count, error: voteError } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('candidate_id', candidate.id);

          if (voteError) {
            console.error('Vote count error:', voteError);
          }
          
          return {
            ...candidate,
            voteCount: count || 0,
            image_url: getCandidateImageUrl(candidate.image_url)
          };
        })
      );

      // Group by position
      const resultsByPosition = {};
      let totalVotes = 0;
      
      candidatesWithVotes.forEach(candidate => {
        totalVotes += candidate.voteCount;
        const position = candidate.position || 'General';
        if (!resultsByPosition[position]) {
          resultsByPosition[position] = [];
        }
        resultsByPosition[position].push(candidate);
      });
      
      // Sort each position by vote count
      Object.keys(resultsByPosition).forEach(position => {
        resultsByPosition[position].sort((a, b) => b.voteCount - a.voteCount);
      });
      
      setResults(resultsByPosition);

      // Get voting statistics
      const { count: votesCast, error: votesError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', electionId);

      // Get unique voters who voted
      const { data: uniqueVoters, error: uniqueError } = await supabase
        .from('votes')
        .select('voter_id')
        .eq('election_id', electionId)
        .not('voter_id', 'is', null);

      const uniqueVoterIds = [...new Set((uniqueVoters || []).map(v => v.voter_id))];
      const votersWhoVoted = uniqueVoterIds.length;

      // Get total registered voters
      const { count: totalVotersCount, error: voterError } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalVoters: totalVotersCount || 0,
        totalVotes: votesCast || 0,
        votersWhoVoted: votersWhoVoted,
        participationRate: totalVotersCount > 0 ? (votersWhoVoted / totalVotersCount) * 100 : 0
      });
      
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleElectionChange = async (electionId) => {
    const election = elections.find(e => e.id === electionId);
    setSelectedElection(election);
    await fetchPublicResults(electionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading election results...</p>
        </div>
      </div>
    );
  }

  if (elections.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm">
        <FaChartBar className="text-4xl text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Past Elections</h3>
        <p className="text-gray-500 dark:text-gray-400">
          There are no completed elections to display at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Election Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1">
            <label className="text-gray-700 dark:text-gray-300 text-sm mb-2 block font-medium">
              Select Election to View Results
            </label>
            <select
              value={selectedElection?.id || ''}
              onChange={(e) => handleElectionChange(e.target.value)}
              className="w-full sm:w-96 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {elections.map(election => (
                <option key={election.id} value={election.id}>
                  {election.title} {election.election_year ? `(${election.election_year})` : ''}
                  {election.end_time && ` - Ended: ${new Date(election.end_time).toLocaleDateString()}`}
                </option>
              ))}
            </select>
          </div>
          
          {selectedElection && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <FaCalendarAlt className="text-emerald-500" />
              <span>
                {selectedElection.start_time && new Date(selectedElection.start_time).toLocaleDateString()} - 
                {selectedElection.end_time && new Date(selectedElection.end_time).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Registered Voters</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalVoters.toLocaleString()}</p>
            </div>
            <FaUsers className="text-2xl text-emerald-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Votes Cast</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.totalVotes.toLocaleString()}</p>
            </div>
            <FaVoteYea className="text-2xl text-emerald-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Voter Turnout</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.participationRate.toFixed(1)}%</p>
            </div>
            <FaPercentage className="text-2xl text-emerald-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Voters Participated</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.votersWhoVoted.toLocaleString()}</p>
            </div>
            <FaUserCheck className="text-2xl text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Results Display with Images */}
      {Object.keys(results).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm">
          <FaChartBar className="text-4xl text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No results available for this election</p>
        </div>
      ) : (
        Object.entries(results).map(([position, candidates]) => (
          <div key={position} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <FaTrophy className="text-xl text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{position}</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent"></div>
            </div>
            
            <div className="space-y-3">
              {candidates.map((candidate, index) => {
                const percentage = stats.totalVotes > 0 
                  ? ((candidate.voteCount / stats.totalVotes) * 100).toFixed(1)
                  : 0;
                const barWidth = stats.totalVotes > 0 
                  ? (candidate.voteCount / stats.totalVotes) * 100 
                  : 0;
                
                const isWinner = index === 0;
                
                return (
                  <div 
                    key={candidate.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition ${
                      isWinner 
                        ? 'border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10' 
                        : 'border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Candidate Image */}
                        <div className="flex-shrink-0">
                          {candidate.image_url ? (
                            <div className="w-12 h-12 relative rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                              <Image
                                src={candidate.image_url}
                                alt={candidate.name}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  e.target.src = '/default-avatar.png';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <FaRegUserCircle className="text-2xl text-gray-500 dark:text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isWinner ? 'bg-emerald-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                              {index + 1}
                            </div>
                            <p className={`font-medium text-gray-900 dark:text-white ${isWinner ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                              {candidate.name}
                            </p>
                            {isWinner && (
                              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                Winner
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            {candidate.department || 'Department not specified'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold text-gray-900 dark:text-white ${isWinner ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                          {candidate.voteCount}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          votes ({percentage}%)
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all rounded-full ${
                            isWinner ? 'bg-emerald-500' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}