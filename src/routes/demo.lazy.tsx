// src/routes/demo.lazy.tsx
import { createLazyFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from "react"
import { DEMO_TOURNAMENT, DEMO_PLAYERS, DEMO_MATCHES } from "@/lib/mock-tournament";
import { DemoWelcomeModal } from "@/components/DemoWelcomeModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Activity } from "lucide-react";

// ... your other imports ...
// NOTE: Import your actual tab components here
// import { StandingsTab } from "@/components/standings-table";
// import { RoundsTab } from "@/components/RoundsTab"; - not exported - to be done manually

// 1. THIS EXPORT IS WHAT FIXES THE ERROR
export const Route = createLazyFileRoute('/demo')({
  component: DemoTournamentPage,
})

// 2. Your component (make sure it matches the name in the Route object)
function DemoTournamentPage() {
  const [matches, setMatches] = useState(DEMO_MATCHES);
  const [showWelcome, setShowWelcome] = useState(true);

  // Live Match Simulation
  useEffect(() => {
    // Pause simulation while the modal is open
    if (showWelcome) return;

    const timer = setInterval(() => {
      setMatches((currentMatches) => {
        const pendingMatches = currentMatches.filter((m) => !m.completed);
        
        // Stop the timer if all matches are completed
        if (pendingMatches.length === 0) {
          clearInterval(timer);
          return currentMatches;
        }

        // Create a new array to trigger a re-render
        const updatedMatches = [...currentMatches];

        // Find the index of the first pending match
        const nextMatch = pendingMatches[0];
        if (!nextMatch) return currentMatches;

        const targetIndex = updatedMatches.findIndex((m) => m.id === nextMatch.id);
        
        if (targetIndex !== -1) {
          const currentMatch = updatedMatches[targetIndex];
          if (!currentMatch) return currentMatches;

          const target: (typeof updatedMatches)[number] = {
            ...currentMatch,
            score_a: Math.floor(Math.random() * 8) + 14,
            score_b: 32 - (Math.floor(Math.random() * 8) + 14),
            completed: true,
          };

          // Simulate realistic Mexicano score (total 32 points)
          target.score_a = Math.floor(Math.random() * 8) + 14; // random score between 14 and 21
          target.score_b = 32 - target.score_a;
          
          updatedMatches[targetIndex] = target;
        }
        
        return updatedMatches;
      });
    }, 5000); // A new match finishes every 5 seconds

    return () => clearInterval(timer);
  }, [showWelcome]);

  return (
    <div className="min-h-screen bg-background pb-12">
      <DemoWelcomeModal open={showWelcome} onOpenChange={setShowWelcome} />

      {/* Demo Banner */}
      <div className="flex items-center justify-center gap-2 bg-emerald-500 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex size-2.5 rounded-full bg-white"></span>
        </span>
        Interactive Live Demo • Read-only view
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-6">
        {/* Simplified Header for the Guest View */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {DEMO_TOURNAMENT.name}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="capitalize">{DEMO_TOURNAMENT.format}</span>
                <span>•</span>
                <span>{DEMO_TOURNAMENT.courts_count} Courts</span>
                <span>•</span>
                <span>{DEMO_PLAYERS.length} Players</span>
              </div>
            </div>
            
            <div className="hidden items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-sm font-medium sm:flex">
              <Activity className="size-4 text-emerald-500" />
              Live
            </div>
          </div>
        </header>

        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="standings" className="gap-2">
              <Trophy className="size-4" />
              Standings
            </TabsTrigger>
            <TabsTrigger value="rounds">Rounds</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standings" className="mt-6">
            {/* 
              Swap this out with your actual Standings component.
              Make sure it calculates standings dynamically from the `matches` state 
              passed below, so it updates automatically when the simulation fires! 
            */}
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
               {/* <StandingsTab matches={matches} players={DEMO_PLAYERS} /> */}
               <p className="text-muted-foreground">Standings component goes here...</p>
            </div>
          </TabsContent>
          
          <TabsContent value="rounds" className="mt-6">
            {/* 
              Swap this out with your actual Rounds component.
              Pass readOnly={true} if your component supports it to hide the input fields.
            */}
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
               {/* <RoundsTab matches={matches} players={DEMO_PLAYERS} readOnly={true} /> */}
               <p className="text-muted-foreground">Rounds component goes here...</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}