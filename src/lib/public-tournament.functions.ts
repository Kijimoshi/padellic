import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type PublicTournamentPayload = {
  tournament: {
    id: string;
    name: string;
    format: "americano" | "mexicano";
    courts: number;
    points_per_match: number;
    status: string;
    share_code: string;
  };
  players: { id: string; name: string }[];
  matches: {
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
  }[];
} | null;

export const getPublicTournament = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ code: z.string().min(1).max(64) }).parse(data))
  .handler(async ({ data }): Promise<PublicTournamentPayload> => {
    const client = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: tournament, error } = await client
      .from("tournaments")
      .select("id, name, format, courts, points_per_match, status, share_code")
      .eq("share_code", data.code)
      .maybeSingle();
    if (error) throw error;
    if (!tournament) return null;

    const [{ data: players }, { data: matches }] = await Promise.all([
      client
        .from("players")
        .select("id, name")
        .eq("tournament_id", tournament.id)
        .order("sort_order", { ascending: true }),
      client
        .from("matches")
        .select("id, round, court, a1, a2, b1, b2, score_a, score_b, completed")
        .eq("tournament_id", tournament.id)
        .order("round", { ascending: true })
        .order("court", { ascending: true }),
    ]);

    return {
      tournament: tournament as PublicTournamentPayload extends null
        ? never
        : NonNullable<PublicTournamentPayload>["tournament"],
      players: (players ?? []) as { id: string; name: string }[],
      matches: (matches ?? []) as NonNullable<PublicTournamentPayload>["matches"],
    };
  });
