import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, Trophy } from "lucide-react";

import { StandingsTable } from "@/components/standings-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeStandings } from "@/lib/padel";
import { getPublicTournament } from "@/lib/public-tournament.functions";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/t/$code")({
  loader: async ({ params }) => {
    const payload = await getPublicTournament({ data: { code: params.code } });
    if (!payload) throw notFound();
    return payload;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Tournament unavailable — Padellic" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.tournament.name} — live standings`;
    const description = `Live ${loaderData.tournament.format} standings and schedule for ${loaderData.tournament.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">This tournament link isn't valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Double-check the link with whoever is running the event.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">Couldn't load the standings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please refresh in a moment.</p>
      </div>
    </div>
  ),
  component: PublicTournament,
});

function PublicTournament() {
  const { tournament, players, matches } = Route.useLoaderData();
  const router = useRouter();

  // Auto-refresh the live view every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.invalidate();
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const standings = computeStandings(players, matches);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "—";

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          
          {/* Left side: Padellic Logo */}
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="size-4" />
            </span>
            <span className="font-display text-lg font-bold">Padellic</span>
          </Link>
      
          {/* Right side: Theme Toggle */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
      
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold">{tournament.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="capitalize">
            {tournament.format}
          </Badge>
          <span>{players.length} players</span>
          <span>· {tournament.points_per_match} points per match</span>
        </div>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-primary">
            Standings
          </h2>
          <StandingsTable rows={standings} />
          
          {/* Auto-refresh indicator moved here */}
          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Live standings auto-update every 5s</span>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
            Schedule
          </h2>
          {rounds.length === 0 && (
            <p className="text-sm text-muted-foreground">The schedule hasn't been published yet.</p>
          )}
          {rounds.map((round) => (
            <div key={round} className="panel p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Round {round}
              </h3>
              <div className="mt-4 space-y-3">
                {matches
                  .filter((m) => m.round === round)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col items-stretch gap-4 rounded-lg border border-border/80 bg-background/40 p-3 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4 md:items-center"
                    >
                      {/* Team A */}
                      <div className="flex flex-col items-start gap-1">
                        <p className="text-left text-sm font-medium">
                          {nameOf(m.a1)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">&amp;</span>{" "}
                          {nameOf(m.a2)}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="flex flex-col items-center justify-center py-1">
                        <span className="font-display text-lg font-bold tabular-nums">
                          {m.completed ? (
                            `${m.score_a} : ${m.score_b}`
                          ) : (
                            <span className="text-sm font-normal uppercase text-muted-foreground">
                              vs
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Team B */}
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-right text-sm font-medium">
                          {nameOf(m.b1)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">&amp;</span>{" "}
                          {nameOf(m.b2)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
