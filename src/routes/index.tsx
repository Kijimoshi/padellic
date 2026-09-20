import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ListOrdered, Share2, Shuffle, Trophy } from "lucide-react";

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
    icon: Shuffle,
    title: "Rounds that build themselves",
    body: "Americano rotates partners every round. Mexicano re-seeds from the current standings so the top players meet.",
  },
  {
    icon: ListOrdered,
    title: "Scores in two taps",
    body: "Fixed points per match, big number inputs and instant validation. No paper, no arguments.",
  },
  {
    icon: Share2,
    title: "One link for everyone",
    body: "Players follow the schedule and the leaderboard live from their phones. No account needed to watch.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <img
          src={heroCourt}
          alt="Floodlit padel court at night"
          width={1600}
          height={1008}
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="court-grid absolute inset-0 opacity-70" />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
             AMERICANO · MEXICANO · TROLOLOLO · POZDRO =]
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.05] sm:text-6xl">
             {"Less admin,\nmore smashes."}
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Pick a format, drop in the players, and Padellic handles the pairings, the courts and the
            leaderboard. Share one link and everyone follows along.
          </p>
          <div className="mt-8">
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
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="panel mt-4 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="size-5 text-primary" />
            <p className="text-sm text-muted-foreground">
               No limits on number of players or courts — the schedule always fits.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/auth">Create your first event</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
