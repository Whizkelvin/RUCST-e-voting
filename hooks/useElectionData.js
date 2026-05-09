// hooks/useElectionData.js - Updated with voting stopped/paused handling
import { useState, useEffect, useCallback } from 'react';
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
  const [isVotingStopped, setIsVotingStopped] = useState(false);  // NEW: Add this
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

  const calculateTimeLeft = useCallback((startTime, endTime, isStopped = false) => {
    // If voting is stopped, return stopped status
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

  const fetchElectionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch voting period from voting_periods table
      const { data: votingPeriodData, error: votingPeriodError } = await supabase
        .from('voting_periods')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let startTime = null;
      let endTime = null;
      let isActive = false;
      let currentVotingPeriodId = null;
      let isStopped = false;  // NEW: Track stopped status
      
      if (votingPeriodData) {
        startTime = votingPeriodData.start_date || votingPeriodData.start_time;
        endTime = votingPeriodData.end_date || votingPeriodData.end_time;
        currentVotingPeriodId = votingPeriodData.id;
        
        // NEW: Check if voting is manually stopped
        isStopped = votingPeriodData.is_stopped === true;
        setIsVotingStopped(isStopped);
        
        if (startTime && endTime && !isStopped) {
          const now = new Date();
          const start = new Date(startTime);
          const end = new Date(endTime);
          isActive = now >= start && now <= end;
          
          setVotingPeriod({
            start_time: startTime,
            end_time: endTime,
            id: votingPeriodData.id,
            name: votingPeriodData.title || 'Voting Period'
          });
          
          const timeData = calculateTimeLeft(startTime, endTime, false);
          setTimeLeft(timeData);
          setIsVotingActive(isActive);
          setVotingStartsIn(!isActive && now < start);
        } else if (isStopped) {
          // If voting is stopped, override status
          setVotingPeriod({
            start_time: startTime,
            end_time: endTime,
            id: votingPeriodData.id,
            name: votingPeriodData.title || 'Voting Period'
          });
          
          const stoppedTimeData = calculateTimeLeft(startTime, endTime, true);
          setTimeLeft(stoppedTimeData);
          setIsVotingActive(false);
          setVotingStartsIn(false);
        } else {
          setTimeLeft({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            status: 'Voting dates not configured'
          });
          setIsVotingActive(false);
          setVotingStartsIn(false);
          setIsVotingStopped(false);
        }
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          status: 'No voting period configured'
        });
        setIsVotingActive(false);
        setVotingStartsIn(false);
        setIsVotingStopped(false);
      }
      
      // If voting is stopped, return early with empty progress
      if (isStopped) {
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
      
      // 2. Fetch candidates based on voting_period_id
      let allCandidates = [];
      if (currentVotingPeriodId) {
        const { data: candidates, error: candidatesError } = await supabase
          .from('candidates')
          .select('*')
          .eq('voting_period_id', currentVotingPeriodId);
        
        if (!candidatesError && candidates) {
          allCandidates = candidates;
          
          // Process each candidate to add image URL
          allCandidates = allCandidates.map(candidate => ({
            ...candidate,
            image_url: getCandidateImageUrl(candidate.image_url)
          }));
        }
      }
      
      // 3. Group candidates by position
      const candidatesByPosition = {};
      if (allCandidates && allCandidates.length > 0) {
        allCandidates.forEach(candidate => {
          const positionName = candidate.position || 'General';
          if (!candidatesByPosition[positionName]) {
            candidatesByPosition[positionName] = [];
          }
          candidatesByPosition[positionName].push(candidate);
        });
      }
      
      // 4. Fetch total voters count
      let totalVoters = 0;
      try {
        const { count, error: votersError } = await supabase
          .from('voters')
          .select('*', { count: 'exact', head: true });
        
        if (!votersError) {
          totalVoters = count || 0;
        }
      } catch (err) {
        // Ignore error
      }
      
      // 5. Fetch total votes count
      let totalVotes = 0;
      try {
        const { count, error: votesError } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true });
        
        if (!votesError) {
          totalVotes = count || 0;
        }
      } catch (err) {
        // Ignore error
      }
      
      // 6. Fetch unique voters who voted
      let totalVotersWhoVoted = 0;
      try {
        const { data: uniqueVoters, error: uniqueError } = await supabase
          .from('votes')
          .select('voter_id')
          .not('voter_id', 'is', null);
        
        if (!uniqueError && uniqueVoters) {
          const uniqueVoterIds = [...new Set(uniqueVoters.map(v => v.voter_id))];
          totalVotersWhoVoted = uniqueVoterIds.length;
        }
      } catch (err) {
        // Ignore error
      }
      
      // 7. Calculate participation rate
      const participationRate = totalVoters > 0 
        ? (totalVotersWhoVoted / totalVoters) * 100 
        : 0;
      
      setTotalStats({
        totalVoters: totalVoters,
        totalVotes: totalVotes,
        participationRate,
        totalVotersWhoVoted,
        remainingVoters: Math.max(0, totalVoters - totalVotersWhoVoted)
      });
      
      // 8. Build progress data for each position
      let progressData = [];
      
      if (Object.keys(candidatesByPosition).length > 0) {
        // Create an election card for each position
        for (const [positionName, positionCandidates] of Object.entries(candidatesByPosition)) {
          // Calculate total votes for this position
          let positionVoteCount = 0;
          
          for (const candidate of positionCandidates) {
            // Fetch vote count for each candidate
            try {
              const { count, error: voteCountError } = await supabase
                .from('votes')
                .select('*', { count: 'exact', head: true })
                .eq('candidate_id', candidate.id);
              
              if (!voteCountError) {
                positionVoteCount += count || 0;
                candidate.vote_count = count || 0;
              } else {
                candidate.vote_count = 0;
              }
            } catch (err) {
              candidate.vote_count = 0;
            }
          }
          
          progressData.push({
            id: positionName.toLowerCase().replace(/\s+/g, '_'),
            name: positionName,
            description: `Cast your vote for ${positionName}`,
            candidates: positionCandidates,
            voteCount: positionVoteCount,
            candidatesCount: positionCandidates.length,
            maxVotes: 1,
            status: isActive ? 'active' : 'closed',
            start_date: startTime,
            end_date: endTime,
            voting_period_title: votingPeriodData?.title || 'Election',
            voting_period_year: votingPeriodData?.year
          });
        }
      } else {
        // Show a message if no candidates
        progressData = [{
          id: 'no-candidates',
          name: 'No Candidates Available',
          description: 'Candidates will be added soon for this election',
          candidates: [],
          voteCount: 0,
          candidatesCount: 0,
          maxVotes: 0,
          status: 'closed',
          start_date: startTime,
          end_date: endTime
        }];
      }
      
      setVotingProgress(progressData);
      setLastUpdated(new Date());
      
    } catch (err) {
      setError(err.message || 'Failed to load election data');
      
      setTotalStats({
        totalVoters: 0,
        totalVotes: 0,
        participationRate: 0,
        totalVotersWhoVoted: 0,
        remainingVoters: 0
      });
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
  }, [calculateTimeLeft]);
  
  useEffect(() => {
    fetchElectionData();
    const interval = setInterval(fetchElectionData, 360000);
    return () => clearInterval(interval);
  }, [fetchElectionData]);
  
  return {
    loading,
    error,
    totalStats,
    votingProgress,
    isVotingActive,
    isVotingStopped,  // NEW: Return this
    votingPeriod,
    votingStartsIn,
    timeLeft,
    fetchElectionData,
    lastUpdated
  };
};