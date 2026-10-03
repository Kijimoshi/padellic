import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ListOrdered, Share2, Shuffle, Trophy, Users } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import heroCourt from "@/assets/hero-court.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Padellic — Padel Americano & Mexicano tournament app" },
      {
        name: "description",
        content:
          "Set up a padel Americano or Mexicano in under a minute: add players, auto-generate the rounds, tap in scores and share live standings with a link.",
      },
      { property: "og:title", content: "Padellic — Padel Americano & Mexicano tournament app" },
      {
        name: "og:description",
        content: "Auto-generated rounds, live standings and a share link for every padel session.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Users,
    title: "Rounds that build themselves",
    body: "No limits on number of players or courts — the schedule always fits.",
  },
  {
    icon: ListOrdered,
    title: "Have an odd number of players?",
    body: "No problem - play Americano! The algorithm automatically balances the schedule, resting players on a rotating basis so those with the least matches played always get priority on the court.",
  },
  {
    icon: Share2,
    title: "One link for everyone",
    body: "Players follow the schedule and the leaderboard live from their phones. No account needed to watch.",
  },
];
// 80 - 10 - 50
function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <img
          src={heroCourt}
          alt="Floodlit padel court at night"
          width={1600}
          height={1008}
          className="absolute inset-0 size-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background" />
        <div className="court-grid absolute inset-0 opacity-70" />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <h1 className="mt-5 max-w-2xl whitespace-pre-line text-4xl font-bold leading-[1.05] sm:text-6xl">
             {"Less admin,\nmore smashes."}
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Pick a format, drop in the players, and Padellic handles the pairings, the courts and the
            leaderboard. Share one link and everyone follows along.
          </p>

          <div className="mt-4 max-w-xl grid gap-3 sm:grid-cols-2">
            {/* Frame 1: Rotating Partners */}
            <div className="rounded-xl border border-foreground/20 bg-surface-strong/50 px-4 py-3 flex flex-col justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                Rotating Partners
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold tracking-wide text-foreground">
                <span>AMERICANO</span>
                <span className="text-primary/60">•</span>
                <span>MEXICANO</span>
              </div>
            </div>

            {/* Frame 2: Fixed Teams */}
            <div className="rounded-xl border border-foreground/20 bg-surface-strong/50 px-4 py-3 flex flex-col justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                Fixed Teams
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold tracking-wide text-foreground">
                <span>SWISS-SYSTEM</span>
                <span className="text-primary/60">•</span>
                <span>KING OF THE COURT</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button asChild size="lg">
              <Link to="/auth">
                Start a tournament
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="panel p-6">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              {/* Added whitespace-pre-line class here */}
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="panel mt-4 flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Shuffle className="h-6 w-6 shrink-0 text-primary mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-3">
                  <p>
                    <strong className="text-foreground">Americano</strong>: smart scheduling - partners rotate randomly every round, with the Padellic algorithm actively prioritizing unique pairings for maximum variety.
                  </p>
                  <p>
                    <strong className="text-foreground">Mexicano</strong>: re-seeds from the current standings so the top players meet.
                  </p>
                  <p>
                    <strong className="text-foreground">Swiss-system</strong>: ensures that each pair plays opponents with a similar running score without rematching.
                  </p>
                  <p>
                    <strong className="text-foreground">King of the Court</strong>: pairs compete in a knockout-style tournament to determine the ultimate champion.
                  </p>
                </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to="/auth">Create your first event</Link>
          </Button>
        </div>
      </section>

      <footer className="mt-auto border-t border-border/40 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Built by{" "}
          <a 
            href="https://linkedin.com/in/igor-krolak/" 
            target="_blank" 
            rel="noreferrer" 
            className="font-medium underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Igor K.
          </a>
        </p>
      </footer>
    </div>
  );
}
