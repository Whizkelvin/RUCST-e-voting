'use client';

import { FaPlayCircle, FaClock, FaFlagCheckered, FaCalendarAlt } from 'react-icons/fa';
import { useEffect, useState, useCallback } from 'react';

const CountdownTimer = ({ timeLeft, votingPeriod, isVotingActive, votingStartsIn, totalStats, loading }) => {
  const [localTimeLeft, setLocalTimeLeft] = useState(timeLeft);
  const [currentTime, setCurrentTime] = useState(new Date());

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
  }, [votingPeriod]);

  // Update local time left when props change
  useEffect(() => {
    if (timeLeft && timeLeft.status) {
      setLocalTimeLeft(timeLeft);
    } else if (votingPeriod) {
      // If timeLeft is empty but we have votingPeriod, calculate it
      const calculated = calculateTimeLeft();
      setLocalTimeLeft(calculated);
    }
  }, [timeLeft, votingPeriod, calculateTimeLeft]);

  // Real-time countdown timer
  useEffect(() => {
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
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [votingPeriod, calculateTimeLeft]);

  // Helper to safely get time values
  const getTimeValue = (value, defaultValue = 0) => {
    if (value === undefined || value === null || isNaN(value)) {
      return defaultValue;
    }
    return value;
  };

  // Determine voting status and message
  const getVotingStatus = () => {
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
  const shouldShowCountdown = localTimeLeft && 
    (localTimeLeft.status === 'Voting Active' || 
     (localTimeLeft.status && localTimeLeft.status.includes('starts in')));

  return (
    <div className="pt-20">
      <div className="bg-gradient-to-r from-green-950 via-green-950 to-green-950 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              {isVotingActive ? (
                <FaPlayCircle className="w-8 h-8 text-[#f59e0b] animate-pulse" />
              ) : votingStartsIn ? (
                <FaClock className="w-8 h-8 text-[#f59e0b] animate-pulse" />
              ) : (
                <FaFlagCheckered className="w-8 h-8 text-gray-400" />
              )}
              <div>
                <h3 className="text-2xl font-bold font-display">Election Countdown</h3>
                <p className="text-[#f59e0b] font-medium">
                  {hasValidTimeData ? localTimeLeft.status : votingStatus}
                </p>
                {votingPeriod && (votingPeriod.start_time || votingPeriod.end_time) && (
                  <p className="text-green-100 text-sm mt-1">
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
                  <div className="text-2xl sm:text-4xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 min-w-[60px] sm:min-w-[80px] text-center font-display">
                    {getTimeValue(localTimeLeft.days, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-green-200 mt-1 sm:mt-2">Days</div>
                </div>
                <div className="text-xl sm:text-2xl text-white font-bold">:</div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-4xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 min-w-[60px] sm:min-w-[80px] text-center font-display">
                    {getTimeValue(localTimeLeft.hours, '0').toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-green-200 mt-1 sm:mt-2">Hours</div>
                </div>
                <div className="text-xl sm:text-2xl text-white font-bold">:</div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-4xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 min-w-[60px] sm:min-w-[80px] text-center font-display">
                    {getTimeValue(localTimeLeft.minutes, '0').toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-green-200 mt-1 sm:mt-2">Minutes</div>
                </div>
                <div className="text-xl sm:text-2xl text-white font-bold">:</div>
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-4xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 min-w-[60px] sm:min-w-[80px] text-center font-display">
                    {getTimeValue(localTimeLeft.seconds, '0').toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs sm:text-sm text-green-200 mt-1 sm:mt-2">Seconds</div>
                </div>
              </div>
            )}

            {/* Display when no valid time data is available */}
            {!hasValidTimeData && !shouldShowCountdown && (
              <div className="text-center mt-4 md:mt-0">
                <div className="text-xl sm:text-2xl font-bold bg-white/10 backdrop-blur-sm rounded-lg px-6 py-4 font-display">
                  <FaClock className="inline w-6 h-6 mr-2" />
                  Loading election schedule...
                </div>
              </div>
            )}

            {/* Display when voting has ended */}
            {(localTimeLeft?.status === 'Voting has ended' || (!isVotingActive && !votingStartsIn && hasValidTimeData && !shouldShowCountdown)) && (
              <div className="text-center mt-4 md:mt-0">
                <div className="text-2xl sm:text-3xl font-bold bg-red-500/20 backdrop-blur-sm rounded-lg px-6 py-4 font-display">
                  <FaFlagCheckered className="inline w-6 h-6 mr-2" />
                  Voting Period Ended
                </div>
                <p className="text-green-200 text-sm mt-2">Results are being finalized</p>
              </div>
            )}
          </div>
          
          {/* Voting Progress Section */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-green-200 mb-2">
              
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-[#f59e0b] to-[#f59e0b]/80 h-3 rounded-full transition-all duration-1000 shadow-inner"
                style={{ width: loading ? '0%' : `${Math.min(100, totalStats?.participationRate || 0)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-green-300 mt-2">
              <span>{loading ? '...' : `${(totalStats?.totalVotersWhoVoted || 0).toLocaleString()} voters have completed voting`}</span>
              <span>{loading ? '...' : `${(totalStats?.remainingVoters || 0).toLocaleString()} voters yet to vote`}</span>
            </div>
            <div className="flex justify-between text-xs text-green-300 mt-1">
              
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;