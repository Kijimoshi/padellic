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
  .inputValidator((data) => z.object({ code: z.string().regex(/^[a-z0-9]{4,64}$/) }).parse(data))
  .handler(async ({ data }): Promise<PublicTournamentPayload> => {
    // Share codes are unguessable secrets. The database function returns exactly one
    // tournament for one code; the tables themselves stay unreadable to anon.
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Supabase server environment is not configured");

    const client = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: payload, error } = await client.rpc("get_public_tournament", {
      _code: data.code,
    });
    if (error) throw error;
    return (payload ?? null) as PublicTournamentPayload;
  });
