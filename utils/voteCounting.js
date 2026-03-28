// utils/voteCounting.js
import { supabase } from '@/lib/supabaseClient';

export const subscribeToVoteUpdates = (onUpdate) => {
  // Subscribe to votes table changes
  const subscription = supabase
    .channel('votes-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'votes'
      },
      (payload) => {
        console.log('New vote received:', payload);
        onUpdate(payload);
      }
    )
    .subscribe();

  return subscription;
};

export const calculateVoteResults = async () => {
  try {
    // Get all approved candidates with their vote counts
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select(`
        id,
        name,
        position,
        department,
        year_of_study,
        image_url,
        votes:votes(count)
      `)
      .eq('is_approved', true)
      .eq('status', 'approved');

    if (error) throw error;

    // Process results by position
    const results = {};
    candidates.forEach(candidate => {
      if (!results[candidate.position]) {
        results[candidate.position] = [];
      }
      
      const voteCount = candidate.votes?.[0]?.count || 0;
      results[candidate.position].push({
        ...candidate,
        voteCount
      });
    });

    // Sort each position by vote count
    Object.keys(results).forEach(position => {
      results[position].sort((a, b) => b.voteCount - a.voteCount);
    });

    return results;
  } catch (error) {
    console.error('Error calculating results:', error);
    return null;
  }
};

export const getTotalVotes = async () => {
  try {
    const { count, error } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting total votes:', error);
    return 0;
  }
};

export const getVoterTurnout = async () => {
  try {
    // Get total registered voters
    const { count: totalVoters, error: voterError } = await supabase
      .from('voters')
      .select('*', { count: 'exact', head: true });
    
    if (voterError) throw voterError;
    
    // Get total votes cast
    const { count: totalVotes, error: voteError } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true });
    
    if (voteError) throw voteError;
    
    return {
      totalVoters: totalVoters || 0,
      totalVotes: totalVotes || 0,
      turnout: totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(1) : 0
    };
  } catch (error) {
    console.error('Error calculating voter turnout:', error);
    return { totalVoters: 0, totalVotes: 0, turnout: 0 };
  }
};