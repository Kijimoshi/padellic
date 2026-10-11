import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { verifyTurnstileToken } from "@/lib/turnstile.functions"; // Import the server function

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Padellic padel tournaments" },
      {
        name: "description",
        content: "Sign in to create padel Americano and Mexicano tournaments and share live standings.",
      },
      { property: "og:title", content: "Sign in — Padellic padel tournaments" },
      {
        property: "og:description",
        content: "Sign in to create padel tournaments and share live standings.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const n = s["next"];
    return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? { next: n } : {};
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const turnstileRef = useRef<TurnstileInstance>(null);

  const goNext = () => {
    if (next) window.location.href = next;
    else navigate({ to: "/dashboard", replace: true });
  };

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goNext();
    });
  }, [navigate, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!captchaToken) {
      toast.error("Please complete the CAPTCHA challenge.");
      return;
    }

    setBusy(true);

    try {
      // Step 1: Execute server-side siteverify call via TanStack Start
      const verification = await verifyTurnstileToken({ data: captchaToken });

      if (!verification.success) {
        throw new Error(verification.error || "Bot verification failed.");
      }

      // Step 2: Trigger authentication only after server verification succeeds
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
        goNext();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        goNext();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
      turnstileRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const redirectTarget = next ? next : "/dashboard";
    const redirectUri = `${window.location.origin}${redirectTarget}`;

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUri,
    });

    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    goNext();
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="court-grid">
        <div className="mx-auto flex max-w-md flex-col px-4 py-16">
          <div className="panel p-6">
            <h1 className="text-2xl font-bold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to manage your padel tournaments."
                : "Set up tournaments and share live standings with your players."}
            </p>

            {sent ? (
              <div className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
                Check your inbox — we sent a confirmation link to <strong>{email}</strong>. Click it
                to finish creating your account.
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Your name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Igor"
                        autoComplete="name"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    />
                  </div>

                  {/* Cloudflare Turnstile Widget */}
                  <div className="flex min-h-16.25 justify-center py-2">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={import.meta.env["VITE_TURNSTILE_SITE_KEY"]}
                      onSuccess={(token) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                      onError={() => setCaptchaToken(null)}
                      options={{
                        theme: "auto",
                        action: mode,
                      }}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={busy || !captchaToken}>
                    {mode === "signin" ? "Sign in" : "Create account"}
                  </Button>
                </form>

                <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogle}
                  disabled={busy}
                >
                  Continue with Google
                </Button>

                <button
                  type="button"
                  className="mt-6 w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    turnstileRef.current?.reset();
                    setCaptchaToken(null);
                  }}
                >
                  {mode === "signin"
                    ? "No account yet? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}