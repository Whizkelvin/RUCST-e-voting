// app/admin/election-results/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Toaster, toast } from 'sonner';
import { 
  FaSpinner, 
  FaChartBar, 
  FaVoteYea, 
  FaUsers, 
  FaTrophy, 
  FaMedal,
  FaCalendarAlt,
  FaDownload,
  FaEye,
  FaFileExcel,
  FaCheckCircle,
  FaTimesCircle,
  FaUserCheck,
  FaPercentage,
  FaList,
  FaUserGraduate,
  FaFileAlt,
  FaFileInvoice,
  FaSun,
  FaMoon,
  FaShieldAlt
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function AdminElectionResults() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [results, setResults] = useState({});
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);
  const [totalStats, setTotalStats] = useState({
    totalVoters: 0,
    totalVotes: 0,
    participationRate: 0,
    votersWhoVoted: 0,
    remainingVoters: 0
  });
  const [votersList, setVotersList] = useState([]);
  const [allVoters, setAllVoters] = useState([]);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const router = useRouter();

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
    toast.success(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`);
  };

  // Theme styles
  const themeStyles = {
    dark: {
      background: 'from-gray-900 to-gray-800',
      cardBg: 'bg-white/10 backdrop-blur-lg',
      cardBorder: 'border-white/20',
      textPrimary: 'text-white',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-400',
      buttonHover: 'hover:bg-opacity-30',
      selectBg: 'bg-gray-700',
      selectBorder: 'border-gray-600',
      iconColor: 'text-emerald-400',
      winnerBg: 'bg-gradient-to-r from-emerald-400/10 to-transparent',
      winnerBorder: 'border-emerald-400/50',
      progressBg: 'bg-white/20',
      progressWinner: 'bg-gradient-to-r from-emerald-400 to-teal-500',
      progressNormal: 'bg-emerald-500',
    },
    light: {
      background: 'from-gray-50 to-gray-100',
      cardBg: 'bg-white/80 backdrop-blur-lg',
      cardBorder: 'border-gray-200',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-700',
      textMuted: 'text-gray-500',
      buttonHover: 'hover:bg-opacity-20',
      selectBg: 'bg-white',
      selectBorder: 'border-gray-300',
      iconColor: 'text-emerald-600',
      winnerBg: 'bg-gradient-to-r from-emerald-100/50 to-transparent',
      winnerBorder: 'border-emerald-500',
      progressBg: 'bg-gray-200',
      progressWinner: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      progressNormal: 'bg-emerald-500',
    }
  };

  const currentTheme = themeStyles[theme];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/');
    } else if (isAuthenticated) {
      fetchElections();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchElections = async () => {
    try {
      setLoading(true);
      const { data: electionsData, error: electionsError } = await supabase
        .from('elections')
        .select('*')
        .order('created_at', { ascending: false });

      if (electionsError) throw electionsError;

      const validElections = (electionsData || []).filter(e => 
        e.title && 
        e.title !== 'src2026' && 
        e.title !== 'sorth' &&
        !e.title.includes('src')
      );
      
      setElections(validElections);
      
      if (validElections && validElections.length > 0) {
        setSelectedElection(validElections[0]);
        await Promise.all([
          fetchResults(validElections[0].id),
          fetchVotersList(validElections[0].id),
          fetchAllVoters()
        ]);
      } else {
        await fetchAllCandidates();
        await fetchAllVoters();
      }
      
    } catch (error) {
      console.error('Error fetching elections:', error);
      toast.error('Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCandidates = async () => {
    try {
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('*');

      if (candidatesError) throw candidatesError;

      if (candidates && candidates.length > 0) {
        const candidatesWithVotes = await Promise.all(
          candidates.map(async (candidate) => {
            const { count, error: voteError } = await supabase
              .from('votes')
              .select('*', { count: 'exact', head: true })
              .eq('candidate_id', candidate.id);
            
            return {
              ...candidate,
              voteCount: count || 0
            };
          })
        );

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
        
        Object.keys(resultsByPosition).forEach(position => {
          resultsByPosition[position].sort((a, b) => b.voteCount - a.voteCount);
        });
        
        setResults(resultsByPosition);
        
        const { count: votesCast, error: votesError } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true });
        
        const { data: uniqueVoters, error: uniqueError } = await supabase
          .from('votes')
          .select('voter_id')
          .not('voter_id', 'is', null);
        
        const uniqueVoterIds = [...new Set((uniqueVoters || []).map(v => v.voter_id))];
        const votersWhoVoted = uniqueVoterIds.length;
        
        const { count: totalVotersCount, error: voterError } = await supabase
          .from('voters')
          .select('*', { count: 'exact', head: true });
        
        setTotalStats({
          totalVoters: totalVotersCount || 0,
          totalVotes: votesCast || 0,
          votersWhoVoted: votersWhoVoted,
          remainingVoters: (totalVotersCount || 0) - votersWhoVoted,
          participationRate: totalVotersCount > 0 ? (votersWhoVoted / totalVotersCount) * 100 : 0
        });
      }
    } catch (error) {
      console.error('Error fetching all candidates:', error);
    }
  };

  const fetchAllVoters = async () => {
    try {
      const { data, error } = await supabase
        .from('voters')
        .select('id, name, email, school_id, department, year_of_study, has_voted, voted_at')
        .order('name', { ascending: true });

      if (error) throw error;
      setAllVoters(data || []);
    } catch (error) {
      console.error('Error fetching all voters:', error);
    }
  };

  const fetchResults = async (electionId) => {
    try {
      setLoading(true);
      
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

      const candidatesWithVotes = await Promise.all(
        candidates.map(async (candidate) => {
          const { count, error: voteError } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('candidate_id', candidate.id);
          
          return {
            ...candidate,
            voteCount: count || 0
          };
        })
      );

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
      
      Object.keys(resultsByPosition).forEach(position => {
        resultsByPosition[position].sort((a, b) => b.voteCount - a.voteCount);
      });
      
      setResults(resultsByPosition);
      
      const { count: votesCast, error: votesError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', electionId);
      
      const { data: uniqueVoters, error: uniqueError } = await supabase
        .from('votes')
        .select('voter_id')
        .eq('election_id', electionId)
        .not('voter_id', 'is', null);
      
      const uniqueVoterIds = [...new Set((uniqueVoters || []).map(v => v.voter_id))];
      const votersWhoVoted = uniqueVoterIds.length;
      
      const { count: totalVotersCount, error: voterError } = await supabase
        .from('voters')
        .select('*', { count: 'exact', head: true });
      
      setTotalStats({
        totalVoters: totalVotersCount || 0,
        totalVotes: votesCast || 0,
        votersWhoVoted: votersWhoVoted,
        remainingVoters: (totalVotersCount || 0) - votersWhoVoted,
        participationRate: totalVotersCount > 0 ? (votersWhoVoted / totalVotersCount) * 100 : 0
      });
      
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const fetchVotersList = async (electionId) => {
    try {
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('voter_id')
        .eq('election_id', electionId)
        .not('voter_id', 'is', null);

      if (votesError) throw votesError;

      const voterIds = [...new Set(votes?.map(v => v.voter_id) || [])];
      
      if (voterIds.length === 0) {
        setVotersList([]);
        return;
      }
      
      const { data: voters, error: votersError } = await supabase
        .from('voters')
        .select('id, name, email, school_id, department, year_of_study, has_voted, voted_at')
        .in('id', voterIds)
        .order('name', { ascending: true });

      if (votersError) throw votersError;
      
      setVotersList(voters || []);
      
    } catch (error) {
      console.error('Error fetching voters list:', error);
      setVotersList([]);
    }
  };

  const handleElectionChange = async (electionId) => {
    const election = elections.find(e => e.id === electionId);
    setSelectedElection(election);
    await Promise.all([
      fetchResults(electionId),
      fetchVotersList(electionId)
    ]);
  };

  const downloadFullReport = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      const summaryData = [
        ['ELECTION SUMMARY REPORT'],
        [''],
        ['Election Title:', selectedElection?.title || 'All Candidates (No Election Selected)'],
        ['Election Year:', selectedElection?.election_year || 'N/A'],
        ['Start Date:', selectedElection?.start_time ? new Date(selectedElection.start_time).toLocaleString() : 'N/A'],
        ['End Date:', selectedElection?.end_time ? new Date(selectedElection.end_time).toLocaleString() : 'N/A'],
        ['Status:', selectedElection?.is_active ? 'Active' : 'Completed'],
        [''],
        ['VOTING STATISTICS'],
        ['Total Registered Voters:', totalStats.totalVoters],
        ['Total Votes Cast:', totalStats.totalVotes],
        ['Voters Who Voted:', totalStats.votersWhoVoted],
        ['Voters Who Did Not Vote:', totalStats.remainingVoters],
        ['Participation Rate:', `${totalStats.participationRate.toFixed(2)}%`],
        [''],
        ['GENERATED ON:', new Date().toLocaleString()],
        ['Generated By:', admin?.email || 'System']
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Election Summary');
      
      const resultsData = [['Position', 'Candidate Name', 'Department', 'Year', 'Votes Received', 'Percentage', 'Status']];
      
      if (Object.keys(results).length > 0) {
        Object.entries(results).forEach(([position, candidates]) => {
          candidates.forEach((candidate, index) => {
            const percentage = totalStats.totalVotes > 0 
              ? ((candidate.voteCount / totalStats.totalVotes) * 100).toFixed(2)
              : 0;
            resultsData.push([
              position,
              candidate.name,
              candidate.department || 'N/A',
              candidate.year_of_study || 'N/A',
              candidate.voteCount,
              `${percentage}%`,
              index === 0 ? 'WINNER' : ''
            ]);
          });
          resultsData.push(['', '', '', '', '', '', '']);
        });
      } else {
        resultsData.push(['No candidates found', '', '', '', '', '', '']);
      }
      
      const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);
      XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Results by Position');
      
      const allVotersData = [['Name', 'Email', 'School ID', 'Department', 'Year', 'Has Voted', 'Voted At']];
      
      allVoters.forEach(voter => {
        allVotersData.push([
          voter.name,
          voter.email,
          voter.school_id,
          voter.department || 'N/A',
          voter.year_of_study || 'N/A',
          voter.has_voted ? 'Yes' : 'No',
          voter.voted_at ? new Date(voter.voted_at).toLocaleString() : 'Not voted'
        ]);
      });
      
      const allVotersSheet = XLSX.utils.aoa_to_sheet(allVotersData);
      XLSX.utils.book_append_sheet(workbook, allVotersSheet, 'All Voters');
      
      const votersWhoVotedData = [['Name', 'Email', 'School ID', 'Department', 'Year', 'Voted At']];
      
      votersList.forEach(voter => {
        votersWhoVotedData.push([
          voter.name,
          voter.email,
          voter.school_id,
          voter.department || 'N/A',
          voter.year_of_study || 'N/A',
          voter.voted_at ? new Date(voter.voted_at).toLocaleString() : 'N/A'
        ]);
      });
      
      const votersSheet = XLSX.utils.aoa_to_sheet(votersWhoVotedData);
      XLSX.utils.book_append_sheet(workbook, votersSheet, 'Voters Who Voted');
      
      const votersWhoDidNotVote = allVoters.filter(voter => !votersList.some(v => v.id === voter.id));
      const notVotedData = [['Name', 'Email', 'School ID', 'Department', 'Year']];
      
      votersWhoDidNotVote.forEach(voter => {
        notVotedData.push([
          voter.name,
          voter.email,
          voter.school_id,
          voter.department || 'N/A',
          voter.year_of_study || 'N/A'
        ]);
      });
      
      const notVotedSheet = XLSX.utils.aoa_to_sheet(notVotedData);
      XLSX.utils.book_append_sheet(workbook, notVotedSheet, 'Voters Who Did Not Vote');
      
      const fileName = `election_report_${(selectedElection?.title || 'all_candidates').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Full report downloaded successfully!');
      
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const downloadCompleteVotersList = () => {
    const votersData = [
      ['COMPLETE VOTERS LIST'],
      [''],
      ['Generated:', new Date().toLocaleString()],
      ['Total Voters:', allVoters.length],
      [''],
      ['Name', 'Email', 'School ID', 'Department', 'Year', 'Has Voted', 'Voted At']
    ];
    
    allVoters.forEach(voter => {
      votersData.push([
        voter.name,
        voter.email,
        voter.school_id,
        voter.department || 'N/A',
        voter.year_of_study || 'N/A',
        voter.has_voted ? 'Yes' : 'No',
        voter.voted_at ? new Date(voter.voted_at).toLocaleString() : 'Not voted'
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(votersData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Complete Voters List');
    XLSX.writeFile(wb, `complete_voters_list_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Complete voters list downloaded!');
  };

  const downloadVotersWhoVoted = () => {
    const votersData = [
      ['VOTERS WHO VOTED'],
      [''],
      ['Election:', selectedElection?.title || 'All Elections'],
      ['Total Voters Who Voted:', votersList.length],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Name', 'Email', 'School ID', 'Department', 'Year', 'Voted At']
    ];
    
    votersList.forEach(voter => {
      votersData.push([
        voter.name,
        voter.email,
        voter.school_id,
        voter.department || 'N/A',
        voter.year_of_study || 'N/A',
        voter.voted_at ? new Date(voter.voted_at).toLocaleString() : 'N/A'
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(votersData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voters Who Voted');
    XLSX.writeFile(wb, `voters_who_voted_${(selectedElection?.title || 'all').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Voters who voted list downloaded!');
  };

  const downloadCandidatesResults = () => {
    const resultsData = [
      ['CANDIDATE RESULTS'],
      [''],
      ['Election:', selectedElection?.title || 'All Elections'],
      ['Total Votes Cast:', totalStats.totalVotes],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Position', 'Candidate Name', 'Department', 'Year', 'Votes Received', 'Percentage', 'Status']
    ];
    
    if (Object.keys(results).length > 0) {
      Object.entries(results).forEach(([position, candidates]) => {
        candidates.forEach((candidate, index) => {
          const percentage = totalStats.totalVotes > 0 
            ? ((candidate.voteCount / totalStats.totalVotes) * 100).toFixed(2)
            : 0;
          resultsData.push([
            position,
            candidate.name,
            candidate.department || 'N/A',
            candidate.year_of_study || 'N/A',
            candidate.voteCount,
            `${percentage}%`,
            index === 0 ? 'WINNER' : ''
          ]);
        });
        resultsData.push(['', '', '', '', '', '', '']);
      });
    } else {
      resultsData.push(['No candidate data available', '', '', '', '', '', '']);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(resultsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates Results');
    XLSX.writeFile(wb, `candidates_results_${(selectedElection?.title || 'all').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Candidates results downloaded!');
  };

  const downloadSummary = () => {
    const summaryData = [
      ['ELECTION RESULTS SUMMARY'],
      [''],
      ['Election Information'],
      ['Title:', selectedElection?.title || 'All Elections'],
      ['Year:', selectedElection?.election_year || 'N/A'],
      ['Period:', selectedElection?.start_time && selectedElection?.end_time 
        ? `${new Date(selectedElection.start_time).toLocaleDateString()} - ${new Date(selectedElection.end_time).toLocaleDateString()}`
        : 'N/A'],
      [''],
      ['Voting Statistics'],
      ['Total Registered Voters:', totalStats.totalVoters],
      ['Total Votes Cast:', totalStats.totalVotes],
      ['Voters Who Voted:', totalStats.votersWhoVoted],
      ['Voters Who Did Not Vote:', totalStats.remainingVoters],
      ['Voter Turnout:', `${totalStats.participationRate.toFixed(2)}%`],
      [''],
      ['Results Summary'],
    ];
    
    if (Object.keys(results).length > 0) {
      Object.entries(results).forEach(([position, candidates]) => {
        summaryData.push([position]);
        summaryData.push(['Candidate', 'Votes', 'Percentage', 'Result']);
        candidates.forEach(c => {
          summaryData.push([
            c.name,
            c.voteCount,
            `${((c.voteCount / totalStats.totalVotes) * 100).toFixed(2)}%`,
            candidates.indexOf(c) === 0 ? 'WINNER' : ''
          ]);
        });
        summaryData.push(['']);
      });
    } else {
      summaryData.push(['No results available for this election']);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `election_summary_${(selectedElection?.title || 'all').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Summary downloaded!');
  };

  if (!mounted) {
    return null;
  }

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} flex items-center justify-center`}>
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-emerald-500 mx-auto mb-4" />
          <p className={currentTheme.textPrimary}>Loading election results...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background} transition-all duration-300`}>
      <Toaster position="top-center" richColors closeButton />
      
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${currentTheme.textPrimary}`}>Election Results</h1>
          <p className={`${currentTheme.textSecondary} mt-2`}>
            View and download comprehensive election results
          </p>
          <p className="text-emerald-400 text-sm mt-1">
            Logged in as: {admin?.email}
          </p>
        </div>

        {/* Election Selector */}
        {elections.length > 0 && (
          <div className={`${currentTheme.cardBg} rounded-xl p-4 sm:p-6 border ${currentTheme.cardBorder} mb-6`}>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1">
                <label className={`${currentTheme.textSecondary} text-sm mb-2 block`}>Select Election</label>
                <select
                  value={selectedElection?.id || ''}
                  onChange={(e) => handleElectionChange(e.target.value)}
                  className={`w-full sm:w-96 px-4 py-2 ${currentTheme.selectBg} border ${currentTheme.selectBorder} rounded-lg ${currentTheme.textPrimary} focus:outline-none focus:border-emerald-500`}
                >
                  {elections.map(election => (
                    <option key={election.id} value={election.id}>
                      {election.title} {election.election_year ? `(${election.election_year})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={downloadFullReport}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition"
                >
                  <FaFileExcel /> Full Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards - All icons now use consistent emerald color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`${currentTheme.cardBg} rounded-xl p-4 border ${currentTheme.cardBorder}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${currentTheme.textMuted} text-xs`}>Registered Voters</p>
                <p className={`text-2xl font-bold ${currentTheme.textPrimary} mt-1`}>{totalStats.totalVoters.toLocaleString()}</p>
              </div>
              <FaUsers className="text-2xl text-emerald-400" />
            </div>
          </div>
          
          <div className={`${currentTheme.cardBg} rounded-xl p-4 border ${currentTheme.cardBorder}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${currentTheme.textMuted} text-xs`}>Votes Cast</p>
                <p className={`text-2xl font-bold text-emerald-400 mt-1`}>{totalStats.totalVotes.toLocaleString()}</p>
              </div>
              <FaVoteYea className="text-2xl text-emerald-400" />
            </div>
          </div>
          
          <div className={`${currentTheme.cardBg} rounded-xl p-4 border ${currentTheme.cardBorder}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${currentTheme.textMuted} text-xs`}>Voter Turnout</p>
                <p className={`text-2xl font-bold text-emerald-400 mt-1`}>{totalStats.participationRate.toFixed(1)}%</p>
              </div>
              <FaPercentage className="text-2xl text-emerald-400" />
            </div>
          </div>
          
          <div className={`${currentTheme.cardBg} rounded-xl p-4 border ${currentTheme.cardBorder}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${currentTheme.textMuted} text-xs`}>Voters Who Voted</p>
                <p className={`text-2xl font-bold text-emerald-400 mt-1`}>{totalStats.votersWhoVoted.toLocaleString()}</p>
              </div>
              <FaUserCheck className="text-2xl text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Download Buttons Section - All icons consistent */}
        <div className={`${currentTheme.cardBg} rounded-xl p-6 border ${currentTheme.cardBorder} mb-8`}>
          <h2 className={`text-lg font-semibold ${currentTheme.textPrimary} mb-4`}>Download Reports</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              onClick={downloadFullReport}
              className="flex flex-col items-center gap-2 p-4 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-xl transition group"
            >
              <FaFileExcel className="text-2xl text-emerald-400 group-hover:scale-110 transition" />
              <span className={`text-xs ${currentTheme.textSecondary} text-center`}>Full Report</span>
            </button>
            
            <button
              onClick={downloadCompleteVotersList}
              className="flex flex-col items-center gap-2 p-4 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-xl transition group"
            >
              <FaUsers className="text-2xl text-emerald-400 group-hover:scale-110 transition" />
              <span className={`text-xs ${currentTheme.textSecondary} text-center`}>All Voters</span>
            </button>
            
            <button
              onClick={downloadVotersWhoVoted}
              className="flex flex-col items-center gap-2 p-4 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-xl transition group"
            >
              <FaUserCheck className="text-2xl text-emerald-400 group-hover:scale-110 transition" />
              <span className={`text-xs ${currentTheme.textSecondary} text-center`}>Voters Who Voted</span>
            </button>
            
            <button
              onClick={downloadCandidatesResults}
              className="flex flex-col items-center gap-2 p-4 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-xl transition group"
            >
              <FaTrophy className="text-2xl text-emerald-400 group-hover:scale-110 transition" />
              <span className={`text-xs ${currentTheme.textSecondary} text-center`}>Candidates</span>
            </button>
            
            <button
              onClick={downloadSummary}
              className="flex flex-col items-center gap-2 p-4 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-xl transition group"
            >
              <FaChartBar className="text-2xl text-emerald-400 group-hover:scale-110 transition" />
              <span className={`text-xs ${currentTheme.textSecondary} text-center`}>Summary</span>
            </button>
          </div>
        </div>

        {/* Results Display */}
        {Object.keys(results).length === 0 ? (
          <div className={`${currentTheme.cardBg} rounded-xl p-12 text-center border ${currentTheme.cardBorder}`}>
            <FaChartBar className="text-4xl text-emerald-400 mx-auto mb-4" />
            <p className={currentTheme.textMuted}>No results available for this election</p>
          </div>
        ) : (
          Object.entries(results).map(([position, candidates]) => (
            <div key={position} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <FaTrophy className="text-2xl text-emerald-400" />
                <h2 className={`text-xl font-bold ${currentTheme.textPrimary}`}>{position}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
              </div>
              
              <div className="space-y-3">
                {candidates.map((candidate, index) => {
                  const percentage = totalStats.totalVotes > 0 
                    ? ((candidate.voteCount / totalStats.totalVotes) * 100).toFixed(1)
                    : 0;
                  const barWidth = totalStats.totalVotes > 0 
                    ? (candidate.voteCount / totalStats.totalVotes) * 100 
                    : 0;
                  
                  return (
                    <div 
                      key={candidate.id}
                      className={`${currentTheme.cardBg} rounded-xl p-4 border transition ${
                        index === 0 ? `${currentTheme.winnerBorder} ${currentTheme.winnerBg}` : currentTheme.cardBorder
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-emerald-400 text-gray-900' :
                            index === 1 ? 'bg-gray-400 text-gray-900' :
                            `${currentTheme.selectBg} ${currentTheme.textPrimary}`
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className={`font-medium ${currentTheme.textPrimary}`}>{candidate.name}</p>
                            <p className={`${currentTheme.textMuted} text-sm`}>{candidate.department || 'Department not specified'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${currentTheme.textPrimary}`}>{candidate.voteCount}</p>
                          <p className={`${currentTheme.textMuted} text-sm`}>votes ({percentage}%)</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className={`h-1.5 ${currentTheme.progressBg} rounded-full overflow-hidden`}>
                          <div 
                            className={`h-full transition-all ${
                              index === 0 ? currentTheme.progressWinner : currentTheme.progressNormal
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
    </div>
  );
}