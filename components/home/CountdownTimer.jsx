'use client';

import { FaPlayCircle, FaClock, FaCalendarAlt, FaStopCircle, FaBan } from 'react-icons/fa';
import { useEffect, useState, useCallback } from 'react';

const CountdownTimer = ({ timeLeft, votingPeriod, isVotingActive, votingStartsIn, totalStats, loading, theme, isVotingStopped = false }) => {
  const [localTimeLeft, setLocalTimeLeft] = useState(timeLeft);

  // Debug logging - Add this to see what data is being received
  useEffect(() => {
    console.log('🔍 CountdownTimer received totalStats:', totalStats);
    console.log('🔍 CountdownTimer loading state:', loading);
    console.log('🔍 totalStats.totalVotersWhoVoted:', totalStats?.totalVotersWhoVoted);
    console.log('🔍 totalStats.remainingVoters:', totalStats?.remainingVoters);
    console.log('🔍 totalStats.participationRate:', totalStats?.participationRate);
  }, [totalStats, loading]);

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return "Invalid date";
    }
  };

  // Function to calculate time left based on voting period
  const calculateTimeLeft = useCallback(() => {
    // If voting is manually stopped, return stopped status
    if (isVotingStopped) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'Voting has been stopped by the Electoral Commission'
      };
    }

    if (!votingPeriod || !votingPeriod.start_time || !votingPeriod.end_time) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'Voting schedule not configured'
      };
    }

    const now = new Date();
    const start = new Date(votingPeriod.start_time);
    const end = new Date(votingPeriod.end_time);

    // Check if dates are valid
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
      // Voting hasn't started yet
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
      // Voting is active
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
      // Voting has ended
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'Voting has ended'
      };
    }
  }, [votingPeriod, isVotingStopped]);

  // Update local time left when props change
  useEffect(() => {
    if (isVotingStopped) {
      setLocalTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'Voting has been stopped by the Electoral Commission'
      });
    } else if (timeLeft && timeLeft.status) {
      setLocalTimeLeft(timeLeft);
    } else if (votingPeriod) {
      const calculated = calculateTimeLeft();
      setLocalTimeLeft(calculated);
    }
  }, [timeLeft, votingPeriod, calculateTimeLeft, isVotingStopped]);

  // Real-time countdown timer
  useEffect(() => {
    // Don't run timer if voting is stopped
    if (isVotingStopped) return;
    
    // Only start the timer if voting is active or hasn't started yet
    if (!votingPeriod || !votingPeriod.start_time || !votingPeriod.end_time) {
      return;
    }

    const start = new Date(votingPeriod.start_time);
    const end = new Date(votingPeriod.end_time);
    const now = new Date();

    // Only run timer if voting hasn't ended
    if (now <= end) {
      const timer = setInterval(() => {
        const updatedTime = calculateTimeLeft();
        setLocalTimeLeft(updatedTime);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [votingPeriod, calculateTimeLeft, isVotingStopped]);

  // Helper to safely get time values
  const getTimeValue = (value, defaultValue = 0) => {
    if (value === undefined || value === null || isNaN(value)) {
      return defaultValue;
    }
    return value;
  };

  // Determine voting status and message
  const getVotingStatus = () => {
    if (isVotingStopped) {
      return "Voting has been stopped by the Electoral Commission";
    }
    
    if (!votingPeriod || !votingPeriod.start_time || !votingPeriod.end_time) {
      return "Voting schedule not configured";
    }
    
    const now = new Date();
    const startTime = new Date(votingPeriod.start_time);
    const endTime = new Date(votingPeriod.end_time);
    
    if (now < startTime) {
      return "Voting hasn't started yet";
    } else if (now >= startTime && now <= endTime) {
      return "Voting is active";
    } else {
      return "Voting has ended";
    }
  };

  const votingStatus = getVotingStatus();
  
  // Check if we have valid time data
  const hasValidTimeData = localTimeLeft && 
    (localTimeLeft.days !== undefined || 
     localTimeLeft.hours !== undefined || 
     localTimeLeft.status !== undefined);

  // Determine if we should show the countdown
  const shouldShowCountdown = !isVotingStopped && localTimeLeft && 
    (localTimeLeft.status === 'Voting Active' || 
     (localTimeLeft.status && localTimeLeft.status.includes('starts in')));

  // Dynamic gradient based on voting status
  const getBackgroundGradient = () => {
    if (isVotingStopped) {
      return "bg-gradient-to-r from-red-950 via-red-900 to-red-950";
    } else if (isVotingActive) {
      return "bg-gradient-to-r from-green-950 via-green-900 to-green-950";
    } else if (votingStartsIn) {
      return "bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800";
    } else {
      return "bg-gradient-to-r from-red-950 via-red-900 to-red-950";
    }
  };

  // Get icon based on status
  const getStatusIcon = () => {
    if (isVotingStopped) {
      return <FaBan className="w-8 h-8 text-red-400 animate-pulse" />;
    } else if (isVotingActive) {
      return <FaPlayCircle className="w-8 h-8 text-gray-300 animate-pulse" />;
    } else if (votingStartsIn) {
      return <FaClock className="w-8 h-8 text-gray-400 animate-pulse" />;
    } else {
      return <FaStopCircle className="w-8 h-8 text-gray-500" />;
    }
  };

  // Get title based on status
  const getTitle = () => {
    if (isVotingStopped) {
      return "Voting Stopped";
    } else if (isVotingActive) {
      return "Live Voting";
    } else if (votingStartsIn) {
      return "Upcoming Election";
    } else {
      return "Election Results";
    }
  };

  // Safely format numbers with fallback
  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString();
  };

  return (
    <div className="md:pt-20 pt-5">
      <div className={`${getBackgroundGradient()} text-white py-6 transition-all duration-500`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              {getStatusIcon()}
              <div>
                <h3 className="text-2xl font-bold font-display">
                  {getTitle()}
                </h3>
                <p className={`font-medium ${isVotingStopped ? 'text-red-300' : 'text-gray-300'}`}>
                  {hasValidTimeData ? localTimeLeft.status : votingStatus}
                </p>
                {votingPeriod && (votingPeriod.start_time || votingPeriod.end_time) && !isVotingStopped && (
                  <p className="text-gray-400 text-sm mt-1">
                    <FaCalendarAlt className="inline w-3 h-3 mr-1" />
                    {votingPeriod.start_time && formatDate(votingPeriod.start_time)} 
                    {votingPeriod.start_time && votingPeriod.end_time && " → "}
                    {votingPeriod.end_time && formatDate(votingPeriod.end_time)}
                  </p>
                )}
              </div>
            </div>
            
            {/* Display countdown timer when voting is active or about to start */}
            {shouldShowCountdown && (
              <div className="flex items-center justify-center space-x-2 sm:space-x-4 mt-4 md:mt-0">
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-4xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 min-w-[60px] sm:min-w-[80px] text-center font-display text-gray-200">
                    {getTimeValue(localTimeLeft.days, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">Days</div>
                </div>
                <div className="text-xl sm:text-2xl text-gray-400 font-bold">:</div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-4xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 min-w-[60px] sm:min-w-[80px] text-center font-display text-gray-200">
                    {getTimeValue(localTimeLeft.hours, '0').toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">Hours</div>
                </div>
                <div className="text-xl sm:text-2xl text-gray-400 font-bold">:</div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-4xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 min-w-[60px] sm:min-w-[80px] text-center font-display text-gray-200">
                    {getTimeValue(localTimeLeft.minutes, '0').toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">Minutes</div>
                </div>
                <div className="text-xl sm:text-2xl text-gray-400 font-bold">:</div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-4xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 min-w-[60px] sm:min-w-[80px] text-center font-display text-gray-200">
                    {getTimeValue(localTimeLeft.seconds, '0').toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">Seconds</div>
                </div>
              </div>
            )}

            {/* Display when voting has been stopped */}
            {isVotingStopped && (
              <div className="text-center mt-4 md:mt-0">
                <div className="text-2xl sm:text-3xl font-bold bg-red-500/20 backdrop-blur-sm rounded-lg px-6 py-4 font-display text-red-300">
                  Voting Process Stopped
                </div>
                <p className="text-red-300 text-sm mt-2">The Electoral Commission has halted voting. Please contact admin for more information.</p>
              </div>
            )}

            {/* Display when voting has ended naturally */}
            {!isVotingStopped && (localTimeLeft?.status === 'Voting has ended' || (!isVotingActive && !votingStartsIn && hasValidTimeData && !shouldShowCountdown)) && (
              <div className="text-center mt-4 md:mt-0">
                <div className="text-2xl sm:text-3xl font-bold bg-white/5 backdrop-blur-sm rounded-lg px-6 py-4 font-display text-gray-300">
                  Voting Period Ended
                </div>
                <p className="text-gray-400 text-sm mt-2">Results are being finalized</p>
              </div>
            )}

            {/* Display when no valid time data is available */}
            {!hasValidTimeData && !shouldShowCountdown && !isVotingStopped && (
              <div className="text-center mt-4 md:mt-0">
                <div className="text-xl sm:text-2xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4 font-display text-gray-200">
                  <FaClock className="inline w-6 h-6 mr-2" />
                  Loading election schedule...
                </div>
              </div>
            )}
          </div>
          
          {/* Voting Progress Section - Hide if voting is stopped */}
          {!isVotingStopped && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span>Voting Progress</span>
                <span className="font-bold text-gray-200">
                  {loading ? '...' : `${(totalStats?.participationRate || 0).toFixed(1)}%`}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-3 rounded-full transition-all duration-1000 shadow-inner bg-gradient-to-r from-emerald-400 to-emerald-500"
                  style={{ width: loading ? '0%' : `${Math.min(100, totalStats?.participationRate || 0)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>
                  {loading 
                    ? 'Loading...' 
                    : `${formatNumber(totalStats?.totalVotersWhoVoted)} ${totalStats?.totalVotersWhoVoted === 1 ? 'voter has' : 'voters have'} completed voting`}
                </span>
                <span>
                  {loading 
                    ? '...' 
                    : `${formatNumber(totalStats?.remainingVoters)} ${totalStats?.remainingVoters === 1 ? 'voter' : 'voters'} yet to vote`}
                </span>
              </div>
            </div>
          )}

          {/* Display message when voting is stopped - no progress bar */}
          {isVotingStopped && (
            <div className="mt-6 text-center">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-sm">
                  Voting has been stopped. Please contact the Electoral Commission for assistance.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;