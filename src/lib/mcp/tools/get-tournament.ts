import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { computeStandings, type MatchRow } from "@/lib/padel";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_tournament",
  title: "Get tournament",
  description: "Get a tournament's players, matches and current standings.",
  inputSchema: { tournament_id: z.string().uuid().describe("Tournament id.") },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ tournament_id }, ctx) => {
    const sb = supabaseForUser(ctx);
    const [t, p, m] = await Promise.all([
      sb.from("tournaments").select("id, name, format, status, points_per_match").eq("id", tournament_id).maybeSingle(),
      sb.from("players").select("id, name, sort_order").eq("tournament_id", tournament_id).order("sort_order"),
      sb.from("matches").select("id, round, court, a1, a2, b1, b2, score_a, score_b, completed")
        .eq("tournament_id", tournament_id).order("round").order("court"),
    ]);
    if (t.error || p.error || m.error) throw new ToolError((t.error ?? p.error ?? m.error)!.message);
    if (!t.data) throw new ToolError("Tournament not found");
    const players = (p.data ?? []).map((x) => ({ id: x.id, name: x.name }));
    const matchRows = (m.data ?? []) as MatchRow[];
    const matches = matchRows.map((x) => ({
      id: x.id, round: x.round, court: x.court, a1: x.a1, a2: x.a2, b1: x.b1, b2: x.b2,
      score_a: x.score_a ?? null, score_b: x.score_b ?? null, completed: x.completed,
    }));
    const standings = computeStandings(players, matchRows).map((s) => ({
      player_id: s.playerId, name: s.name, played: s.played, points: s.points, diff: s.diff,
    }));
    const result = {
      tournament: { id: t.data.id, name: t.data.name, format: t.data.format, status: t.data.status, points_per_match: t.data.points_per_match },
      players, matches, standings,
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
