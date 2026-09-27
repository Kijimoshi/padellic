import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function env(names: string[]): string | undefined {
  const p = (globalThis as RuntimeGlobals).process?.env;
  for (const n of names) {
    const v = p?.[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

function publishableKey(): string {
  const direct = env(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (direct) return direct;
  const keyset = env(["SUPABASE_PUBLISHABLE_KEYS"]);
  if (keyset) {
    try {
      const parsed = JSON.parse(keyset) as Record<string, unknown>;
      const key = [parsed["default"], ...Object.values(parsed)].find(
        (v): v is string => typeof v === "string" && v.startsWith("sb_publishable_"),
      );
      if (key) return key;
    } catch {
      // ignore
    }
  }
  const legacy = env(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("Supabase publishable key is required");
}

export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("Authenticated caller required");
  const url = env(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL is required");
  return createClient(url, publishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
