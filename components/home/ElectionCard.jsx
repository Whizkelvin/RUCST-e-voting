// components/home/ElectionCard.js - Updated to hide results until voting ends
import { FaUsers, FaVoteYea, FaUserGraduate, FaImage, FaRegUserCircle, FaFileAlt, FaCalendarAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const ElectionCard = ({ election, index, isVotingActive, votingPeriod, loading }) => {
  const [showResults, setShowResults] = useState(false);
  
  // Check if voting has ended
  const hasVotingEnded = () => {
    if (!votingPeriod || !votingPeriod.end_time) return false;
    const now = new Date();
    const endTime = new Date(votingPeriod.end_time);
    return now > endTime;
  };
  
  const votingEnded = hasVotingEnded();
  
  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="mt-4 space-y-3">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // If no candidates, show message
  if (!election.candidates || election.candidates.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <FaImage className="mx-auto text-gray-400 text-4xl mb-3" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">{election.name}</h3>
          <p className="text-gray-500">{election.description}</p>
          <p className="text-sm text-gray-400 mt-2">Check back soon for candidate information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Election Title */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            {election.voting_period_title && (
              <p className="text-xs text-black font-semibold mb-1">
                {election.voting_period_title}
              </p>
            )}
            <h3 className="text-2xl font-bold text-gray-800">{election.name}</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            election.status === 'active' && isVotingActive
              ? 'bg-green-100 text-green-700' 
              : votingEnded ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {isVotingActive && election.status === 'active' 
              ? 'Active' 
              : votingEnded ? 'Results Available' : 'Closed'}
          </div>
        </div>
        
        {election.description && (
          <p className="text-gray-600 text-sm mt-1">{election.description}</p>
        )}
      </div>
      
      {/* Results Toggle Button - Only show if voting has ended */}
      {votingEnded && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowResults(!showResults)}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            {showResults ? (
              <>
                <FaEyeSlash className="text-black" />
                <span className="text-black">Hide Results</span>
              </>
            ) : (
              <>
                <FaEye className="text-black" />
                <span className="text-black font-medium">Show Results</span>
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Candidates List */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
          <FaUserGraduate className="mr-2 text-black" />
          Candidates ({election.candidatesCount})
        </h4>
        
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {election.candidates.map((candidate, idx) => (
            <div 
              key={candidate.id || idx} 
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-100"
            >
              {/* Candidate Image/Icon */}
              <div className="flex-shrink-0">
                {candidate.image_url ? (
                  <div className="w-12 h-12 relative rounded-full overflow-hidden bg-gray-200">
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#0f766e] to-[#064e3b] flex items-center justify-center">
                    <FaRegUserCircle className="text-white text-2xl" />
                  </div>
                )}
              </div>
              
              {/* Candidate Info */}
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{candidate.name}</p>
                
                {/* Position - already shown in the card title, but can show again if needed */}
                {candidate.position && candidate.position !== election.name && (
                  <p className="text-xs text-gray-600 mt-1">
                    Running for: {candidate.position}
                  </p>
                )}
                
                {/* Department */}
                {candidate.department && (
                  <p className="text-xs text-gray-500 mt-1">
                    Department: {candidate.department}
                  </p>
                )}
                
                {/* Status */}
                {candidate.status && (
                  <p className="text-xs text-gray-500 mt-1">
                    Status: {candidate.status}
                  </p>
                )}
                
                {/* Manifesto */}
                {candidate.manifesto && (
                  <div className="mt-2">
                    <button 
                      className="text-xs text-[#0f766e] hover:text-[#064e3b] flex items-center"
                      onClick={() => {
                        alert(`Manifesto for ${candidate.name}:\n\n${candidate.manifesto}`);
                      }}
                    >
                      <FaFileAlt className="mr-1 text-xs" />
                      View Manifesto
                    </button>
                  </div>
                )}
              </div>
              
              {/* Vote Count - Only show if voting has ended and results are toggled on */}
              {votingEnded && showResults && (
                <div className="text-right">
                  <div className="bg-white rounded-lg px-3 py-1 shadow-sm">
                    <p className="text-lg font-bold text-[#0f766e]">
                      {candidate.vote_count || 0}
                    </p>
                    <p className="text-xs text-gray-500">votes</p>
                  </div>
                </div>
              )}
              
              {/* Placeholder for results when hidden */}
              {votingEnded && !showResults && (
                <div className="text-right">
                  <div className="bg-gray-100 rounded-lg px-3 py-1">
                    <p className="text-sm text-gray-500">🔒 Results hidden</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Election Stats - Only show if voting has ended */}
      {votingEnded && showResults && (
        <div className="border-t border-gray-200 pt-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Candidates</p>
              <p className="text-lg font-bold text-gray-700">{election.candidatesCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Votes Cast</p>
              <p className="text-lg font-bold text-gray-700">{election.voteCount?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Vote Button - Only show if voting is active */}
      {isVotingActive && election.status === 'active' && election.candidatesCount > 0 && !votingEnded && (
        <Link href={`/vote/${election.id}`}>
          <button className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-[#0f766e] to-[#064e3b] text-white rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-300 font-semibold flex items-center justify-center space-x-2">
            <FaVoteYea className="text-lg" />
            <span>Vote Now</span>
          </button>
        </Link>
      )}
      
      {/* Voting Ended Message */}
      {votingEnded && (
        <div className="w-full mt-4 py-3 px-4 bg-gray-100 text-gray-600 rounded-lg text-center font-medium">
          <FaCalendarAlt className="inline mr-2" />
          Voting has ended. Results are now available.
        </div>
      )}
      
      {isVotingActive && election.status === 'active' && election.candidatesCount === 0 && !votingEnded && (
        <button 
          disabled
          className="w-full mt-4 py-3 px-4 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-semibold"
        >
          No Candidates Available
        </button>
      )}
      
      {!isVotingActive && !votingEnded && (
        <button 
          disabled
          className="w-full mt-4 py-3 px-4 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-semibold"
        >
          {election.status === 'closed' ? 'Voting Closed' : 'Voting Not Active'}
        </button>
      )}
    </div>
  );
};

export default ElectionCard;