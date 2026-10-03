export type Format = "americano" | "mexicano" | "swiss" | "kotc";

export type PlannedMatch = {
  round: number;
  court: number;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
};

export type MatchRow = {
  id: string;
  round: number;
  court: number;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  score_a: number;
  score_b: number;
  completed: boolean;
};

export type StandingRow = {
  playerId: string;
  name: string;
  played: number;
  points: number;
  conceded: number;
  diff: number;
  wins: number;
};

const GHOST = "__rest__";

/** Fisher-Yates shuffle: randomizes an array in-place */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Circle-method partner rotation: every round pairs all players with a new partner. */
function partnerRounds(ids: string[]): string[][][] {
  const list = [...ids];
  if (list.length % 2 === 1) list.push(GHOST);
  const n = list.length;
  const fixed = list[0]!;
  let rest = list.slice(1);
  const rounds: string[][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const order = [fixed, ...rest];
    const pairs: string[][] = [];
    for (let i = 0; i < n / 2; i++) pairs.push([order[i]!, order[n - 1 - i]!]);
    rounds.push(pairs);
    rest = [rest[rest.length - 1]!, ...rest.slice(0, -1)];
  }
  return rounds;
}

/**
 * Americano: partners rotate every round so everyone plays with (almost) everyone.
 * Players are selected by least-played count, then mixed into 2v2 matches while
 * minimizing repeated team combinations. If not enough unique teams exist,
 * repeats are allowed (prioritizing least-repeated teams).
 */
export function buildAmericano(
  playerIds: string[],
  rounds: number,
  courts: number,
  players: { id: string; name: string }[] = [],
  matches: MatchRow[] = [],
): PlannedMatch[] {
  if (playerIds.length < 4 || courts < 1) return [];

  const playersPerRound = courts * 4;
  const out: PlannedMatch[] = [];
  const shuffledIds = shuffle(playerIds);

  // Track repeat count for each team pairing
  const teamCounts = new Map<string, number>();
  for (const match of matches) {
    const aPair = [match.a1, match.a2].sort().join("|");
    const bPair = [match.b1, match.b2].sort().join("|");
    teamCounts.set(aPair, (teamCounts.get(aPair) || 0) + 1);
    teamCounts.set(bPair, (teamCounts.get(bPair) || 0) + 1);
  }

  const allStandings =
    players.length > 0 && matches.length > 0 ? computeStandings(players, matches) : [];

  for (let r = 0; r < rounds; r++) {
    let playingIds: string[];

    if (allStandings.length > 0) {
      const leastPlayed = [...allStandings]
        .sort((a, b) => a.played - b.played || a.name.localeCompare(b.name))
        .slice(0, playersPerRound)
        .map((row) => row.playerId);

      playingIds = shuffle(leastPlayed);
    } else {
      const offset = (r * playersPerRound) % shuffledIds.length;
      const rotatedIds = [...shuffledIds.slice(offset), ...shuffledIds.slice(0, offset)];
      playingIds = rotatedIds.slice(0, playersPerRound);
    }

    // Generate all possible team combinations from available players
    const possibleTeams: Array<[string, string]> = [];
    for (let i = 0; i < playingIds.length; i++) {
      for (let j = i + 1; j < playingIds.length; j++) {
        possibleTeams.push([playingIds[i]!, playingIds[j]!]);
      }
    }

    // Sort by repeat count (prefer teams that haven't played together)
    possibleTeams.sort((teamA, teamB) => {
      const keyA = [teamA[0], teamA[1]].sort().join("|");
      const keyB = [teamB[0], teamB[1]].sort().join("|");
      return (teamCounts.get(keyA) || 0) - (teamCounts.get(keyB) || 0);
    });

    // Shuffle within same count to add variety
    shuffle(possibleTeams);

    // Select teams greedily (no player appears twice per round)
    const roundTeams: Array<[string, string]> = [];
    const usedPlayers = new Set<string>();

    for (const team of possibleTeams) {
      const [a, b] = team;
      if (usedPlayers.has(a) || usedPlayers.has(b)) continue;
      roundTeams.push(team);
      usedPlayers.add(a);
      usedPlayers.add(b);
      const key = [a, b].sort().join("|");
      teamCounts.set(key, (teamCounts.get(key) || 0) + 1);
      if (roundTeams.length === courts * 2) break;
    }

    // Create matches from selected teams
    for (let court = 0; court < courts; court++) {
      const aTeam = roundTeams[court * 2];
      const bTeam = roundTeams[court * 2 + 1];
      if (!aTeam || !bTeam) break;

      out.push({
        round: r + 1,
        court: court + 1,
        a1: aTeam[0]!,
        a2: aTeam[1]!,
        b1: bTeam[0]!,
        b2: bTeam[1]!,
      });
    }
  }

  return out;
}

/** Mexicano: next round is seeded by current standings — 1+4 vs 2+3 on each court. */
export function buildMexicanoRound(
  standings: StandingRow[],
  round: number,
  courts: number,
): PlannedMatch[] {
  const ids = standings.map((s) => s.playerId);
  const out: PlannedMatch[] = [];
  let court = 0;
  for (let i = 0; i + 3 < ids.length; i += 4) {
    const [p1, p2, p3, p4] = ids.slice(i, i + 4);
    out.push({
      round,
      court: (court % courts) + 1,
      a1: p1!,
      a2: p4!,
      b1: p2!,
      b2: p3!,
    });
    court++;
  }

  return out;
}

export function computeStandings(
  players: { id: string; name: string }[],
  matches: MatchRow[],
): StandingRow[] {
  const table = new Map<string, StandingRow>();
  for (const p of players) {
    table.set(p.id, {
      playerId: p.id,
      name: p.name,
      played: 0,
      points: 0,
      conceded: 0,
      diff: 0,
      wins: 0,
    });
  }

  for (const m of matches) {
    if (!m.completed) continue;
    const teams: [string[], number, number][] = [
      [[m.a1, m.a2], m.score_a, m.score_b],
      [[m.b1, m.b2], m.score_b, m.score_a],
    ];
    for (const [ids, scored, against] of teams) {
      for (const id of ids) {
        const row = table.get(id);
        if (!row) continue;
        row.played += 1;
        row.points += scored;
        row.conceded += against;
        row.diff = row.points - row.conceded;
        if (scored > against) row.wins += 1;
      }
    }
  }

  return [...table.values()].sort(
    (a, b) => b.points - a.points || b.diff - a.diff || a.name.localeCompare(b.name),
  );
}

export function suggestedRounds(playerCount: number): number {
  if (playerCount < 4) return 0;
  const base = playerCount % 2 === 0 ? playerCount - 1 : playerCount;
  return Math.min(Math.max(base, 3), 15);
}

// KOTC: King of the Court — winners move up, losers move down. Each court has a "king" team.
export function buildKotcRound(
  playerIds: string[],
  matches: MatchRow[],
  round: number,
  courts: number
): PlannedMatch[] {
  const out: PlannedMatch[] = [];
  const lastRoundMatches = matches.filter((m) => m.round === round - 1 && m.completed);

  // Fallback: Round 1 (Sequential fixed pairings)
  if (lastRoundMatches.length === 0) {
    for (let i = 0; i < courts * 4 && i + 3 < playerIds.length; i += 4) {
      out.push({
        round,
        court: out.length + 1,
        a1: playerIds[i]!,
        a2: playerIds[i + 1]!,
        b1: playerIds[i + 2]!,
        b2: playerIds[i + 3]!,
      });
    }
    return out;
  }

  // KOTC Logic: Calculate court movements
  const nextCourts = Array.from({ length: courts }, () => [] as [string, string][]);

  for (const m of lastRoundMatches) {
    const courtIdx = m.court - 1;
    if (courtIdx >= courts) continue;

    const teamA: [string, string] = [m.a1, m.a2];
    const teamB: [string, string] = [m.b1, m.b2];
    
    // Tie-breaker: If points are tied, Team A stays/moves up by default
    const teamAWon = m.score_a >= m.score_b; 
    const winner = teamAWon ? teamA : teamB;
    const loser = teamAWon ? teamB : teamA;

    if (courtIdx === 0) {
      nextCourts[0].push(winner); // King court winner stays
      if (courts > 1) nextCourts[1].push(loser); // King court loser moves down
      else nextCourts[0].push(loser);
    } else if (courtIdx === courts - 1) {
      nextCourts[courtIdx - 1].push(winner); // Bottom court winner moves up
      nextCourts[courtIdx].push(loser); // Bottom court loser stays
    } else {
      nextCourts[courtIdx - 1].push(winner); // Middle court winner moves up
      nextCourts[courtIdx + 1].push(loser); // Middle court loser moves down
    }
  }

  // Generate Planned Matches for the next round
  for (let c = 0; c < courts; c++) {
    const courtTeams = nextCourts[c];
    if (courtTeams && courtTeams.length === 2) {
      out.push({
        round,
        court: c + 1,
        a1: courtTeams[0]![0],
        a2: courtTeams[0]![1],
        b1: courtTeams[1]![0],
        b2: courtTeams[1]![1],
      });
    }
  }
  return out;
}

// Swiss: next round is seeded by current standings, but teams are fixed (no partner rotation).
export function buildSwissRound(
  playerIds: string[],
  matches: MatchRow[],
  round: number,
  courts: number
): PlannedMatch[] {
  const out: PlannedMatch[] = [];
  
  // Fallback: Round 1 (Sequential fixed pairings)
  if (matches.length === 0) {
    for (let i = 0; i < courts * 4 && i + 3 < playerIds.length; i += 4) {
      out.push({
        round,
        court: out.length + 1,
        a1: playerIds[i]!,
        a2: playerIds[i + 1]!,
        b1: playerIds[i + 2]!,
        b2: playerIds[i + 3]!,
      });
    }
    return out;
  }

  // Reconstruct fixed teams and stats from match history
  type TeamData = { id: string; p1: string; p2: string; points: number; diff: number; played: Set<string> };
  const teamMap = new Map<string, TeamData>();
  
  const getTeamId = (p1: string, p2: string) => [p1, p2].sort().join('|');

  for (const m of matches) {
    if (!m.completed) continue;
    const idA = getTeamId(m.a1, m.a2);
    const idB = getTeamId(m.b1, m.b2);

    if (!teamMap.has(idA)) teamMap.set(idA, { id: idA, p1: m.a1, p2: m.a2, points: 0, diff: 0, played: new Set() });
    if (!teamMap.has(idB)) teamMap.set(idB, { id: idB, p1: m.b1, p2: m.b2, points: 0, diff: 0, played: new Set() });

    const tA = teamMap.get(idA)!;
    const tB = teamMap.get(idB)!;

    tA.points += m.score_a;
    tA.diff += (m.score_a - m.score_b);
    tA.played.add(idB);

    tB.points += m.score_b;
    tB.diff += (m.score_b - m.score_a);
    tB.played.add(idA);
  }

  // Sort teams by Points, then by Differential
  const sortedTeams = Array.from(teamMap.values()).sort((a, b) => b.points - a.points || b.diff - a.diff);
  const assigned = new Set<string>();
  let courtCount = 1;

  for (let i = 0; i < sortedTeams.length; i++) {
    const teamA = sortedTeams[i]!;
    if (assigned.has(teamA.id)) continue;

    let opponentIndex = -1;
    
    // Priority 1: Find closest opponent they haven't played yet
    for (let j = i + 1; j < sortedTeams.length; j++) {
      const candidate = sortedTeams[j]!;
      if (!assigned.has(candidate.id) && !teamA.played.has(candidate.id)) {
        opponentIndex = j;
        break;
      }
    }
    
    // Priority 2 (Fallback): Find closest opponent regardless of history if no unique matchups remain
    if (opponentIndex === -1) {
      for (let j = i + 1; j < sortedTeams.length; j++) {
        if (!assigned.has(sortedTeams[j]!.id)) {
          opponentIndex = j;
          break;
        }
      }
    }

    // Assign Match
    if (opponentIndex !== -1 && courtCount <= courts) {
      const teamB = sortedTeams[opponentIndex]!;
      out.push({
        round,
        court: courtCount++,
        a1: teamA.p1,
        a2: teamA.p2,
        b1: teamB.p1,
        b2: teamB.p2,
      });
      assigned.add(teamA.id);
      assigned.add(teamB.id);
    }
  }

  return out;
}

export function computeTeamStandings(
  players: { id: string; name: string }[],
  individualStandings: StandingRow[] 
): StandingRow[] {
  const teams: StandingRow[] = [];

  // Group players into pairs exactly as they were seeded in Round 1
  for (let i = 0; i < players.length; i += 2) {
    const p1 = players[i];
    const p2 = players[i + 1];

    if (!p1 || !p2) continue; // Safety check in case of uneven players

    // Look up p1's stats to represent the whole team
    const stats = individualStandings.find((s) => s.playerId === p1.id) || {
      played: 0,
      wins: 0,
      points: 0,
      diff: 0,
    };

    teams.push({
      playerId: `${p1.id}-${p2.id}`, // Maps to the React key in StandingsTable
      name: `${p1.name} & ${p2.name}`,
      played: stats.played,
      wins: stats.wins,
      points: stats.points,
      diff: stats.diff,
    });
  }

  // Sort the leaderboard: Points (desc) -> Diff (desc) -> Wins (desc)
  return teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.wins - a.wins;
  });
}

export function getFormatLabel(format: Format): string {
  switch (format) {
    case "americano":
      return "Americano";
    case "mexicano":
      return "Mexicano";
    case "swiss":
      return "Swiss";
    case "kotc":
      return "KotC"; // Ensures 'C' remains capitalized
    default:
      return format;
  }
}