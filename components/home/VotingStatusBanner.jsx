'use client';

import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const VotingStatusBanner = ({ isVotingActive }) => {
  const router = useRouter();

  return (
    <div className="mt-12 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl hover-lift">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          {isVotingActive ? (
            <FaCheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <FaExclamationTriangle className="w-8 h-8 text-yellow-600" />
          )}
          <div>
            <h3 className="text-xl font-bold text-gray-900 font-poppins">
              {isVotingActive ? 'Voting is now open!' : 'Voting is currently closed'}
            </h3>
            <p className="text-gray-600">
              {isVotingActive 
                ? 'Cast your vote before the election period ends.' 
                : 'Check back when voting opens for the next election period.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(isVotingActive ? '/login' : '/election-result')}
          className="px-6 py-3 bg-green-900 hover:bg-green-800 text-white font-semibold rounded-xl transition-colors transform hover:scale-105 duration-300"
        >
          {isVotingActive ? 'Go to Voting' : 'View Results'}
        </button>
      </div>
    </div>
  );
};

export default VotingStatusBanner;