import { supabase } from "@/integrations/supabase/client";
import type { Format, MatchRow } from "./padel";

export type Tournament = {
  id: string;
  owner_id: string;
  name: string;
  format: Format;
  courts: number;
  points_per_match: number;
  total_rounds: number;
  status: "setup" | "live" | "finished";
  share_code: string;
  created_at: string;
};

export type Player = { id: string; name: string; sort_order: number };

export const tournamentsQuery = () => ({
  queryKey: ["tournaments"],
  queryFn: async (): Promise<Tournament[]> => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Tournament[];
  },
});

export const tournamentQuery = (id: string) => ({
  queryKey: ["tournament", id],
  queryFn: async (): Promise<Tournament> => {
    const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (error) throw error;
    return data as Tournament;
  },
});

export const playersQuery = (tournamentId: string) => ({
  queryKey: ["players", tournamentId],
  queryFn: async (): Promise<Player[]> => {
    const { data, error } = await supabase
      .from("players")
      .select("id, name, sort_order")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Player[];
  },
});

export const matchesQuery = (tournamentId: string) => ({
  queryKey: ["matches", tournamentId],
  queryFn: async (): Promise<MatchRow[]> => {
    const { data, error } = await supabase
      .from("matches")
      .select("id, round, court, a1, a2, b1, b2, score_a, score_b, completed")
      .eq("tournament_id", tournamentId)
      .order("round", { ascending: true })
      .order("court", { ascending: true });
    if (error) throw error;
    return (data ?? []) as MatchRow[];
  },
});
