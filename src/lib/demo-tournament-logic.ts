// src/utils/tournament-logic.ts

export function generateNextMexicanoRound(currentMatches: any[]) {
  // 1. Figure out what round we are generating
  const currentRound = Math.max(...currentMatches.map(m => m.round), 0);
  const nextRound = currentRound + 1;

  // 2. Tally up all the points for every player
  const playerStats: Record<string, number> = {};

  currentMatches.forEach((match) => {
    if (!match.completed) return;

    // Helper to safely add points
    const addPoints = (playerId: string, points: number) => {
      if (!playerStats[playerId]) playerStats[playerId] = 0;
      playerStats[playerId] += points;
    };

    addPoints(match.a1, match.score_a);
    addPoints(match.a2, match.score_a);
    addPoints(match.b1, match.score_b);
    addPoints(match.b2, match.score_b);
  });

  // 3. Sort players by total points (Highest to Lowest)
  const sortedPlayers = Object.entries(playerStats)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]); // Just keep the player IDs

  // 4. Generate the new matches (4 players per court)
  const newMatches = [];
  let courtNumber = 1;

  for (let i = 0; i < sortedPlayers.length; i += 4) {
    // Ensure we have exactly 4 players left for a full court
    if (i + 3 >= sortedPlayers.length) break; 

    newMatches.push({
      id: `m-r${nextRound}-c${courtNumber}-${Date.now()}`,
      round: nextRound,
      court: courtNumber,
      completed: false,
      // Team A gets Player 1 & 2, Team B gets Player 3 & 4
      a1: sortedPlayers[i],
      a2: sortedPlayers[i + 1],
      b1: sortedPlayers[i + 2],
      b2: sortedPlayers[i + 3],
      score_a: 0,
      score_b: 0,
    });
    
    courtNumber++;
  }

  // Return the combined array: old matches + the new round
  return [...currentMatches, ...newMatches];
}