import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "record_score",
  title: "Record match score",
  description: "Record the final score of a match; both scores must add up to the tournament's points per match.",
  inputSchema: {
    match_id: z.string().uuid().describe("Match id."),
    score_a: z.number().int().min(0).describe("Points for team A."),
    score_b: z.number().int().min(0).describe("Points for team B."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ match_id, score_a, score_b }, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data: match, error } = await sb
      .from("matches").select("id, tournaments(points_per_match)").eq("id", match_id).maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!match) throw new ToolError("Match not found");
    const total = (match.tournaments as { points_per_match: number } | null)?.points_per_match;
    if (total && score_a + score_b !== total) throw new ToolError(`Scores must add up to ${total}`);
    const upd = await sb.from("matches").update({ score_a, score_b, completed: true }).eq("id", match_id);
    if (upd.error) throw new ToolError(upd.error.message);
    return { content: [{ type: "text", text: `Saved ${score_a}–${score_b}.` }] };
  },
});
