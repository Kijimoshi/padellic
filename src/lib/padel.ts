export type Format = "americano" | "mexicano";

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
 * Pairs that cannot be matched up in a round simply rest.
 */
export function buildAmericano(playerIds: string[], rounds: number, courts: number): PlannedMatch[] {
  if (playerIds.length < 4) return [];
  const schedule = partnerRounds(playerIds);
  const out: PlannedMatch[] = [];

  for (let r = 0; r < rounds; r++) {
    const pairs = schedule[r % schedule.length]!.filter((p) => !p.includes(GHOST));
    // rotate the starting offset on repeat cycles so opponents vary
    const offset = Math.floor(r / schedule.length) % Math.max(pairs.length, 1);
    const ordered = [...pairs.slice(offset), ...pairs.slice(0, offset)];
    let court = 0;
    for (let i = 0; i + 1 < ordered.length; i += 2) {
      out.push({
        round: r + 1,
        court: (court % courts) + 1,
        a1: ordered[i]![0]!,
        a2: ordered[i]![1]!,
        b1: ordered[i + 1]![0]!,
        b2: ordered[i + 1]![1]!,
      });
      court++;
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
  return Math.min(Math.max(base, 5), 11);
}
