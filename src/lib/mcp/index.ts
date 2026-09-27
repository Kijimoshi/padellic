import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTournaments from "./tools/list-tournaments";
import getTournament from "./tools/get-tournament";
import recordScore from "./tools/record-score";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "padellic",
  title: "Padellic",
  version: "0.1.0",
  instructions:
    "Padel tournament tools. Use list_tournaments to find a tournament, get_tournament for players, matches and standings, and record_score to enter results.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTournaments, getTournament, recordScore],
});
