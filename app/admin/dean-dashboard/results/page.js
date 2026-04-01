// app/admin/dean-dashboard/results/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-toastify';
import { 
  FaSpinner, 
  FaChartBar, 
  FaDownload, 
  FaTrophy, 
  FaUserGraduate,
  FaVoteYea,
  FaMedal,
  FaChartPie,
  FaFilter
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function ElectionResults() {
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({
    totalVotes: 0,
    totalCandidates: 0,
    voterTurnout: 0
  });

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setElections(data || []);
      
      if (data && data.length > 0) {
        setSelectedElection(data[0]);
        fetchResults(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching elections:', error);
      toast.error('Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (electionId) => {
    try {
      setLoading(true);
      
      // Fetch candidates with their vote counts
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select(`
          *,
          profiles:user_id (
            full_name,
            student_id,
            department,
            year_level
          )
        `)
        .eq('election_id', electionId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (candidatesError) throw candidatesError;
      
      // Fetch vote counts for each candidate
      const candidatesWithVotes = await Promise.all(
        (candidates || []).map(async (candidate) => {
          const { count, error: voteError } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('candidate_id', candidate.id);
          
          if (voteError) console.error('Error fetching votes:', voteError);
          
          return {
            ...candidate,
            voteCount: count || 0
          };
        })
      );
      
      // Sort by vote count descending
      const sortedResults = candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount);
      setResults(sortedResults);
      
      // Calculate stats
      const totalVotes = sortedResults.reduce((sum, c) => sum + c.voteCount, 0);
      const totalCandidates = sortedResults.length;
      
      // Calculate voter turnout (assuming total registered students)
      const { count: totalStudents, error: studentError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      
      const turnout = totalStudents ? ((totalVotes / totalStudents) * 100).toFixed(1) : 0;
      
      setStats({
        totalVotes,
        totalCandidates,
        voterTurnout: turnout
      });
      
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load election results');
    } finally {
      setLoading(false);
    }
  };

  const handleElectionChange = (electionId) => {
    const election = elections.find(e => e.id === electionId);
    setSelectedElection(election);
    fetchResults(electionId);
  };

  const exportToExcel = () => {
    const exportData = results.map((candidate, index) => ({
      'Rank': index + 1,
      'Candidate Name': candidate.profiles?.full_name,
      'Student ID': candidate.profiles?.student_id,
      'Department': candidate.profiles?.department,
      'Position': candidate.position || 'N/A',
      'Votes Received': candidate.voteCount,
      'Percentage': `${((candidate.voteCount / stats.totalVotes) * 100).toFixed(1)}%`
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Election Results');
    XLSX.writeFile(wb, `election_results_${selectedElection?.title}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Results exported successfully!');
  };

  const getWinnerBadge = (index) => {
    if (index === 0) return { color: 'text-yellow-400', icon: FaTrophy, label: 'Winner' };
    if (index === 1) return { color: 'text-gray-400', icon: FaMedal, label: '1st Runner Up' };
    if (index === 2) return { color: 'text-amber-600', icon: FaMedal, label: '2nd Runner Up' };
    return null;
  };

  if (loading && results.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Election Results</h1>
          <p className="text-gray-300 mt-2">
            View real-time voting results and statistics
          </p>
        </div>
        
        <div className="flex gap-3">
          <select
            value={selectedElection?.id || ''}
            onChange={(e) => handleElectionChange(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
          >
            {elections.map(election => (
              <option key={election.id} value={election.id}>
                {election.title} ({election.election_year})
              </option>
            ))}
          </select>
          
          <button
            onClick={exportToExcel}
            disabled={results.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition disabled:opacity-50"
          >
            <FaDownload className="inline mr-2" /> Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Votes Cast</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalVotes}</p>
            </div>
            <FaVoteYea className="text-3xl text-purple-400" />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Candidates</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalCandidates}</p>
            </div>
            <FaUserGraduate className="text-3xl text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Voter Turnout</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.voterTurnout}%</p>
            </div>
            <FaChartPie className="text-3xl text-green-400" />
          </div>
        </div>
      </div>

      {/* Results Table */}
      {results.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
          <FaChartBar className="text-6xl text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Results Available</h3>
          <p className="text-gray-400">No candidates or votes recorded for this election yet</p>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Votes</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Percentage</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {results.map((candidate, index) => {
                  const percentage = stats.totalVotes > 0 
                    ? ((candidate.voteCount / stats.totalVotes) * 100).toFixed(1)
                    : 0;
                  const winnerBadge = getWinnerBadge(index);
                  const WinnerIcon = winnerBadge?.icon;
                  
                  return (
                    <tr key={candidate.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${winnerBadge?.color || 'text-gray-400'}`}>
                            #{index + 1}
                          </span>
                          {winnerBadge && (
                            <span className="flex items-center gap-1 text-xs">
                              <WinnerIcon className={`${winnerBadge.color} text-sm`} />
                              <span className={winnerBadge.color}>{winnerBadge.label}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{candidate.profiles?.full_name}</div>
                          <div className="text-gray-400 text-xs">{candidate.profiles?.student_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300">{candidate.position || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300">{candidate.profiles?.department}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-semibold">{candidate.voteCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[100px]">
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-gray-300 text-sm">{percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {index === 0 && stats.totalVotes > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            <FaTrophy /> Leading
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}