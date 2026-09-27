import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_tournaments",
  title: "List tournaments",
  description: "List the signed-in organiser's padel tournaments, newest first.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("tournaments")
      .select("id, name, format, courts, points_per_match, total_rounds, status, share_code, created_at")
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const tournaments = (data ?? []).map((t) => ({
      id: t.id, name: t.name, format: t.format, courts: t.courts,
      points_per_match: t.points_per_match, total_rounds: t.total_rounds,
      status: t.status, share_code: t.share_code, created_at: t.created_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(tournaments) }],
      structuredContent: { tournaments },
    };
  },
});
