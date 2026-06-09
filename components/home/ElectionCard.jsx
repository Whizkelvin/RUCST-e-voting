// components/home/ElectionCard.js - Positions in grid columns
import { FaUsers, FaVoteYea, FaUserGraduate, FaImage, FaRegUserCircle, FaFileAlt, FaCalendarAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const ElectionCard = ({ election, index, isVotingActive, votingPeriod, loading, theme }) => {
  const [showResults, setShowResults] = useState(false);

  const getIconColor = () => theme === 'light' ? 'text-black' : 'text-white';

  const hasVotingEnded = () => {
    if (!votingPeriod?.end_time) return false;
    return new Date() > new Date(votingPeriod.end_time);
  };

  const votingEnded = hasVotingEnded();
  const isLight = theme === 'light';

  // Group candidates by position
  const groupByPosition = () => {
    if (!election.candidates?.length) return {};
    const grouped = {};
    election.candidates.forEach((candidate) => {
      const key = candidate.position_id || candidate.position || 'general';
      const label = candidate.position_title || candidate.position || 'General Position';
      if (!grouped[key]) grouped[key] = { label, candidates: [] };
      grouped[key].candidates.push(candidate);
    });
    return grouped;
  };

  const positions = Object.entries(groupByPosition());

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-16 bg-gray-200 rounded" />
              <div className="h-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!election.candidates || election.candidates.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <FaImage className={`mx-auto text-gray-400 text-4xl mb-3 ${getIconColor()}`} />
          <h3 className={`text-xl font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'} mb-2`}>{election.name}</h3>
          <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>{election.description}</p>
          <p className={`text-sm mt-2 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Check back soon for candidate information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {election.voting_period_title && (
              <p className={`text-xs font-semibold mb-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                {election.voting_period_title}
              </p>
            )}
            <h3 className={`text-2xl font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>{election.name}</h3>
          </div>

          <div className={`px-3 py-1 rounded-full text-xs font-semibold self-start ${
            election.status === 'active' && isVotingActive
              ? isLight ? 'bg-gray-200 text-gray-700' : 'bg-gray-700 text-gray-300'
              : isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-800 text-gray-400'
          }`}>
            {isVotingActive && election.status === 'active'
              ? 'Active'
              : votingEnded ? 'Results Available' : 'Closed'}
          </div>
        </div>

        {election.description && (
          <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{election.description}</p>
        )}
      </div>

      {/* ── Results toggle ── */}
      {votingEnded && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowResults(!showResults)}
            className={`flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 ${
              isLight ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            {showResults ? <FaEyeSlash className={getIconColor()} /> : <FaEye className={getIconColor()} />}
            <span className={`font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              {showResults ? 'Hide Results' : 'Show Results'}
            </span>
          </button>
        </div>
      )}

      {/* ── Positions grid ── */}
      <div className={`grid gap-8 ${
        positions.length === 1
          ? 'grid-cols-1'
          : positions.length === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      }`}>
        {positions.map(([posKey, { label, candidates }]) => (
          <div key={posKey} className="space-y-4">
            {/* Position heading */}
            <div className={`flex items-center space-x-2 pb-2 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
              <FaUserGraduate className={`flex-shrink-0 ${getIconColor()}`} />
              <h4 className={`text-base font-semibold ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                {label}
              </h4>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isLight ? 'bg-gray-100 text-gray-500' : 'bg-gray-700 text-gray-400'}`}>
                {candidates.length}
              </span>
            </div>

            {/* Candidates in this position */}
            <div className="space-y-3">
              {candidates.map((candidate, idx) => (
                <div
                  key={candidate.id || idx}
                  className={`flex items-start space-x-3 p-4 rounded-xl border transition-all duration-200 ${
                    isLight
                      ? 'bg-gray-50 hover:bg-gray-100 border-gray-100'
                      : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700'
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {candidate.image_url ? (
                      <div className={`w-12 h-12 relative rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-gray-700'}`}>
                        <Image src={candidate.image_url} alt={candidate.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                        <FaRegUserCircle className="text-white text-2xl" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>{candidate.name}</p>

                   

                    

                    {candidate.manifesto && (
                      <button
                        type="button"
                        className={`mt-2 text-xs flex items-center space-x-1 ${isLight ? 'text-gray-600 hover:text-gray-800' : 'text-gray-400 hover:text-gray-300'}`}
                        onClick={() => alert(`Manifesto for ${candidate.name}:\n\n${candidate.manifesto}`)}
                      >
                        <FaFileAlt className="text-xs" />
                        <span>View Manifesto</span>
                      </button>
                    )}
                  </div>

                  {/* Vote count */}
                  {votingEnded && showResults && (
                    <div className="text-right flex-shrink-0">
                      <div className={`rounded-lg px-3 py-1 shadow-sm ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
                        <p className={`text-lg font-bold ${getIconColor()}`}>{candidate.vote_count || 0}</p>
                        <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>votes</p>
                      </div>
                    </div>
                  )}

                  {votingEnded && !showResults && (
                    <div className="text-right flex-shrink-0">
                      <div className={`rounded-lg px-3 py-1 ${isLight ? 'bg-gray-100' : 'bg-gray-800'}`}>
                        <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Hidden</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Stats ── */}
      {votingEnded && showResults && (
        <div className={`border-t pt-5 ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 text-center ${isLight ? 'bg-gray-50' : 'bg-gray-800/50'}`}>
              <p className={`text-xs mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Total Candidates</p>
              <p className={`text-lg font-bold ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{election.candidatesCount}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${isLight ? 'bg-gray-50' : 'bg-gray-800/50'}`}>
              <p className={`text-xs mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Total Votes Cast</p>
              <p className={`text-lg font-bold ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{election.voteCount?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer actions ── */}
      <div>
        {isVotingActive && election.status === 'active' && election.candidatesCount > 0 && !votingEnded && (
          <Link
            href={`/login`}
            className="w-full mt-2 py-3 px-4 bg-green-950 text-white rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-300 font-semibold flex items-center justify-center space-x-2"
          >
            <FaVoteYea className="text-lg" />
            <span>Vote Now</span>
          </Link>
        )}

        {votingEnded && (
          <div className={`w-full py-3 px-4 rounded-lg text-center font-medium ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-800 text-gray-400'}`}>
            <FaCalendarAlt className={`inline mr-2 ${getIconColor()}`} />
            Voting has ended. Results are now available.
          </div>
        )}

        {isVotingActive && election.status === 'active' && election.candidatesCount === 0 && !votingEnded && (
          <button disabled className={`w-full py-3 px-4 rounded-lg cursor-not-allowed font-semibold ${isLight ? 'bg-gray-300 text-gray-500' : 'bg-gray-700 text-gray-400'}`}>
            No Candidates Available
          </button>
        )}

        {!isVotingActive && !votingEnded && (
          <button disabled className={`w-full py-3 px-4 rounded-lg cursor-not-allowed font-semibold ${isLight ? 'bg-gray-300 text-gray-500' : 'bg-gray-700 text-gray-400'}`}>
            {election.status === 'closed' ? 'Voting Closed' : 'Voting Not Active'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ElectionCard;