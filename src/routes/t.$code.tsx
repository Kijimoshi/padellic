import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { StandingsTable } from "@/components/standings-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeStandings } from "@/lib/padel";
import { getPublicTournament } from "@/lib/public-tournament.functions";

export const Route = createFileRoute("/t/$code")({
  loader: async ({ params }) => {
    const payload = await getPublicTournament({ data: { code: params.code } });
    if (!payload) throw notFound();
    return payload;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Tournament unavailable — Rally" }, { name: "robots", content: "noindex" }],
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
  const standings = computeStandings(players, matches);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "—";

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </span>
          <span className="font-display text-lg font-bold">Rally</span>
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
              <div className="mt-3 space-y-2">
                {matches
                  .filter((m) => m.round === round)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-border/80 bg-background/40 px-3 py-2 text-sm"
                    >
                      <span>
                        {nameOf(m.a1)} &amp; {nameOf(m.a2)}
                      </span>
                      <span className="font-display font-bold tabular">
                        {m.completed ? `${m.score_a} : ${m.score_b}` : "vs"}
                      </span>
                      <span className="text-right">
                        {nameOf(m.b1)} &amp; {nameOf(m.b2)}
                      </span>
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
