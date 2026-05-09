'use client';

import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const VotingStatusBanner = ({ isVotingActive, theme }) => {
  const router = useRouter();

  // Get icon color based on theme
  const getIconColor = () => {
    return theme === 'light' ? 'text-black' : 'text-white';
  };

  return (
    <div className={`mt-12 p-6 ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-700'} border rounded-2xl hover-lift`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          {isVotingActive ? (
            <FaCheckCircle className={`w-8 h-8 ${getIconColor()}`} />
          ) : (
            <FaExclamationTriangle className={`w-8 h-8 ${getIconColor()}`} />
          )}
          <div>
            <h3 className={`text-xl font-bold font-poppins ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {isVotingActive ? 'Voting is now open' : 'Voting is currently closed'}
            </h3>
            <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              {isVotingActive 
                ? 'Cast your vote before the election period ends.' 
                : 'Check back when voting opens for the next election period.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(isVotingActive ? '/login' : '/election-result')}
          className={`px-6 py-3 ${theme === 'light' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-700 hover:bg-gray-600'} text-white font-semibold rounded-xl transition-colors transform hover:scale-105 duration-300`}
        >
          {isVotingActive ? 'Go to Voting' : 'View Results'}
        </button>
      </div>
    </div>
  );
};

export default VotingStatusBanner;