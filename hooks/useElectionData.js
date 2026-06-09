// hooks/useElectionData.js - Updated to match your admin page schema
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const useElectionData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalStats, setTotalStats] = useState({
    totalVoters: 0,
    totalVotes: 0,
    participationRate: 0,
    totalVotersWhoVoted: 0,
    remainingVoters: 0
  });
  const [votingProgress, setVotingProgress] = useState([]);
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [isVotingStopped, setIsVotingStopped] = useState(false);
  const [votingPeriod, setVotingPeriod] = useState(null);
  const [votingStartsIn, setVotingStartsIn] = useState(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    status: 'Loading...'
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const lastElectionIdRef = useRef(null);

  const getCandidateImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const { data } = supabase.storage
      .from('candidate-photos')
      .getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const calculateTimeLeft = useCallback((startTime, endTime, isStopped = false) => {
    if (isStopped) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'stopped',
        displayStatus: 'Voting has been stopped by the Electoral Commission'
      };
    }

    try {
      const now = new Date();
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          status: 'Invalid date format'
        };
      }
      
      if (now < start) {
        const timeToStart = start - now;
        const days = Math.floor(timeToStart / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeToStart % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeToStart % (1000 * 60)) / 1000);
        
        return {
          days,
          hours,
          minutes,
          seconds,
          status: `Voting starts in ${days} days, ${hours} hours`
        };
      } else if (now >= start && now <= end) {
        const timeRemaining = end - now;
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        return {
          days,
          hours,
          minutes,
          seconds,
          status: 'Voting Active'
        };
      } else {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          status: 'Voting has ended'
        };
      }
    } catch (error) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'Error calculating time'
      };
    }
  }, []);

  const fetchVoterStatsForElection = useCallback(async (electionId) => {
    if (!electionId) {
      console.log('No election ID provided for voter stats');
      return null;
    }

    try {
      console.log(`🔍 Fetching voter stats for election ID: ${electionId}`);
      
      // Query the voters table directly (matching your admin page schema)
      const { data: voters, error: votersError } = await supabase
        .from('voters')
        .select('id, has_voted')
        .eq('election_id', electionId);

      if (votersError) {
        console.error('Error fetching voters:', votersError);
        return null;
      }

      const totalVoters = voters?.length || 0;
      const totalVotersWhoVoted = voters?.filter(v => v.has_voted === true).length || 0;
      const remainingVoters = totalVoters - totalVotersWhoVoted;
      const participationRate = totalVoters > 0 ? (totalVotersWhoVoted / totalVoters) * 100 : 0;

      // Get total votes cast for this election
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('id')
        .eq('election_id', electionId);

      if (votesError) {
        console.error('Error fetching votes:', votesError);
      }

      const totalVotesCast = votes?.length || 0;

      console.log(`✅ Election ${electionId} stats:`, {
        totalVoters,
        totalVotersWhoVoted,
        remainingVoters,
        participationRate: participationRate.toFixed(2) + '%',
        totalVotesCast
      });

      return {
        totalVoters,
        totalVotes: totalVotesCast,
        participationRate,
        totalVotersWhoVoted,
        remainingVoters
      };
    } catch (error) {
      console.error('Error in fetchVoterStatsForElection:', error);
      return null;
    }
  }, []);

  const fetchElectionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== 🚀 Fetching Election Data ===');
      
      // 1. Get ACTIVE voting period
      const { data: votingPeriodData, error: votingPeriodError } = await supabase
        .from('voting_periods')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (votingPeriodError) {
        console.error('Error fetching voting period:', votingPeriodError);
      }
      
      if (!votingPeriodData) {
        console.log('No active voting period found');
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          status: 'No active voting period'
        });
        setIsVotingActive(false);
        setVotingStartsIn(false);
        setIsVotingStopped(false);
        setVotingPeriod(null);
        setVotingProgress([]);
        setTotalStats({
          totalVoters: 0,
          totalVotes: 0,
          participationRate: 0,
          totalVotersWhoVoted: 0,
          remainingVoters: 0
        });
        setLoading(false);
        return;
      }
      
      console.log('Active Voting Period:', votingPeriodData.title);
      
      const startTime = votingPeriodData.start_date || votingPeriodData.start_time;
      const endTime = votingPeriodData.end_date || votingPeriodData.end_time;
      const isStopped = votingPeriodData.is_stopped === true;
      setIsVotingStopped(isStopped);
      
      // Set voting period info
      setVotingPeriod({
        start_time: startTime,
        end_time: endTime,
        id: votingPeriodData.id,
        name: votingPeriodData.title || 'Voting Period'
      });
      
      // Calculate time left
      const timeData = calculateTimeLeft(startTime, endTime, isStopped);
      setTimeLeft(timeData);
      
      const now = new Date();
      const start = new Date(startTime);
      const end = new Date(endTime);
      const isActive = now >= start && now <= end && !isStopped;
      setIsVotingActive(isActive);
      setVotingStartsIn(!isActive && now < start && !isStopped);
      
      // If voting is stopped, return early
      if (isStopped) {
        console.log('Voting is stopped');
        setVotingProgress([]);
        setTotalStats({
          totalVoters: 0,
          totalVotes: 0,
          participationRate: 0,
          totalVotersWhoVoted: 0,
          remainingVoters: 0
        });
        setLoading(false);
        return;
      }
      
      // 2. Get ACTIVE election for this voting period
      const { data: activeElection, error: electionError } = await supabase
        .from('elections')
        .select('*')
        .eq('voting_period_id', votingPeriodData.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (electionError) {
        console.error('Error fetching active election:', electionError);
      }
      
      if (!activeElection) {
        console.log('No active election found for this voting period');
        setVotingProgress([]);
        setTotalStats({
          totalVoters: 0,
          totalVotes: 0,
          participationRate: 0,
          totalVotersWhoVoted: 0,
          remainingVoters: 0
        });
        setLoading(false);
        return;
      }
      
      console.log('Active Election:', activeElection.title);
      console.log('Election ID:', activeElection.id);
      
      // Check if election has changed - reset data if needed
      if (lastElectionIdRef.current !== activeElection.id) {
        console.log('Election changed, resetting data');
        lastElectionIdRef.current = activeElection.id;
        setVotingProgress([]);
      }
      
      // 3. Get positions for this election
      const { data: positions, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('election_id', activeElection.id)
        .order('order_number', { ascending: true });
      
      if (positionsError) {
        console.error('Error fetching positions:', positionsError);
      }
      
      console.log('Positions found:', positions?.length || 0);
      
      // 4. Get candidates for each position
      let allCandidates = [];
      for (const position of positions || []) {
        const { data: candidates, error: candidatesError } = await supabase
          .from('candidates')
          .select('*')
          .eq('position_id', position.id)
          .eq('status', 'approved');
        
        if (!candidatesError && candidates && candidates.length > 0) {
          // Get vote counts for each candidate
          const candidatesWithVotes = await Promise.all(candidates.map(async (candidate) => {
            const { count: voteCount } = await supabase
              .from('votes')
              .select('*', { count: 'exact', head: true })
              .eq('candidate_id', candidate.id);
            
            return {
              ...candidate,
              image_url: getCandidateImageUrl(candidate.image_url),
              vote_count: voteCount || 0,
              position_title: position.title,
              position_id: position.id
            };
          }));
          allCandidates.push(...candidatesWithVotes);
        }
      }
      
      console.log('Total candidates found:', allCandidates.length);
      
      // 5. Get VOTER STATS from voters table (matching your admin schema)
      const voterStats = await fetchVoterStatsForElection(activeElection.id);
      
      console.log('🎯 FINAL VOTER STATS TO DISPLAY:', voterStats);
      
      if (voterStats) {
        console.log('✅ Setting totalStats to:', voterStats);
        setTotalStats(voterStats);
      } else {
        console.log('❌ Failed to fetch voter stats, using defaults');
        setTotalStats({
          totalVoters: 0,
          totalVotes: 0,
          participationRate: 0,
          totalVotersWhoVoted: 0,
          remainingVoters: 0
        });
      }
      
      // 6. Build progress data for the election card
      const totalVotesForElection = allCandidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);
      
      const progressData = [{
        id: activeElection.id,
        name: activeElection.title,
        title: activeElection.title,
        description: activeElection.description || `Cast your vote for ${activeElection.title}`,
        candidates: allCandidates,
        voteCount: totalVotesForElection,
        candidatesCount: allCandidates.length,
        positionsCount: positions?.length || 0,
        maxVotes: 1,
        status: activeElection.is_active && isActive ? 'active' : 'closed',
        start_date: activeElection.start_time,
        end_date: activeElection.end_time,
        voting_period_title: votingPeriodData?.title || 'Election',
        voting_period_year: votingPeriodData?.year,
        eligibleVoters: voterStats?.totalVoters || 0,
        votedCount: voterStats?.totalVotersWhoVoted || 0
      }];
      
      console.log('Progress data built with 1 election');
      console.log('📊 TotalStats being passed to CountdownTimer:', voterStats);
      setVotingProgress(progressData);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching election data:', err);
      setError(err.message || 'Failed to load election data');
      setVotingProgress([]);
      setIsVotingActive(false);
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'Error loading data'
      });
    } finally {
      setLoading(false);
    }
  }, [calculateTimeLeft, fetchVoterStatsForElection]);
  
  useEffect(() => {
    fetchElectionData();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchElectionData, 30000);
    return () => clearInterval(interval);
  }, [fetchElectionData]);
  
  return {
    loading,
    error,
    totalStats,
    votingProgress,
    isVotingActive,
    isVotingStopped,
    votingPeriod,
    votingStartsIn,
    timeLeft,
    fetchElectionData,
    lastUpdated
  };
};