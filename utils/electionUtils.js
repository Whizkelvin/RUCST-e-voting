export const processElectionResults = (candidatesData) => {
  const groupedResults = {};

  if (!candidatesData || candidatesData.length === 0) return groupedResults;

  candidatesData.forEach(candidate => {
    const position = candidate.position;
    if (!groupedResults[position]) groupedResults[position] = [];

    groupedResults[position].push({
      id: candidate.candidate_id,
      name: candidate.candidate_name,
      votes: candidate.vote_count || 0,
      picture: candidate.picture,
      position: candidate.position,
    });
  });

  Object.keys(groupedResults).forEach(position => {
    const positionCandidates = groupedResults[position];
    const totalVotes = positionCandidates.reduce((sum, c) => sum + (c.votes || 0), 0);

    groupedResults[position] = positionCandidates.map(c => ({
      ...c,
      totalVotes,
      percentage: totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0
    }));

    groupedResults[position].sort((a, b) => b.votes - a.votes);
  });

  return groupedResults;
};