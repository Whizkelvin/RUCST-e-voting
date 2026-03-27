import { useState, useEffect } from 'react';

export const useCountdown = (votingPeriod) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    status: 'Loading...'
  });
  const [votingStartsIn, setVotingStartsIn] = useState(false);
  const [isVotingActive, setIsVotingActive] = useState(false);

  const calculateTimeLeft = () => {
    if (!votingPeriod || !votingPeriod.end_time) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'No voting period set'
      };
    }

    const now = new Date();
    const electionEnd = new Date(votingPeriod.end_time);
    
    if (now > electionEnd) {
      setIsVotingActive(false);
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        status: 'Voting has ended'
      };
    }

    const electionStart = new Date(votingPeriod.start_time);
    if (now < electionStart) {
      setIsVotingActive(false);
      setVotingStartsIn(true);
      const difference = electionStart - now;
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return {
        days,
        hours,
        minutes,
        seconds,
        status: `Voting starts in ${days}d ${hours}h`
      };
    }

    setVotingStartsIn(false);
    setIsVotingActive(true);
    const difference = electionEnd - now;
    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return {
        days,
        hours,
        minutes,
        seconds,
        status: 'Voting Active'
      };
    }

    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      status: 'Voting has ended'
    };
  };

  useEffect(() => {
    const updateTimer = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [votingPeriod]);

  return { timeLeft, votingStartsIn, isVotingActive };
};