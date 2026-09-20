import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Pencil, Plus, Shuffle, Trash2, X } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { StandingsTable } from "@/components/standings-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { matchesQuery, playersQuery, tournamentQuery } from "@/lib/tournament-data";
import {
  buildAmericano,
  buildMexicanoRound,
  computeStandings,
  suggestedRounds,
  type MatchRow,
  type PlannedMatch,
} from "@/lib/padel";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/tournament/$id")({
  head: () => ({
    meta: [
      { title: "Tournament control — Padellic" },
      {
        name: "description",
        content: "Manage players, generate rounds and enter scores for your padel tournament.",
      },
      { property: "og:title", content: "Tournament control — Padellic" },
      {
        property: "og:description",
        content: "Manage players, generate rounds and enter scores for your padel tournament.",
      },
    ],
  }),
  component: TournamentPage,
});

function TournamentPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: tournament, isLoading } = useQuery(tournamentQuery(id));
  const { data: players = [] } = useQuery(playersQuery(id));
  const { data: matches = [] } = useQuery(matchesQuery(id));

  const [newPlayer, setNewPlayer] = useState("");
  const standings = useMemo(() => computeStandings(players, matches), [players, matches]);
  const nameOf = (pid: string) => players.find((p) => p.id === pid)?.name ?? "—";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const rounds = useMemo(() => {
    const map = new Map<number, MatchRow[]>();
    for (const m of matches) {
      const list = map.get(m.round) ?? [];
      list.push(m);
      map.set(m.round, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [matches]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["players", id] });
    queryClient.invalidateQueries({ queryKey: ["matches", id] });
    queryClient.invalidateQueries({ queryKey: ["tournament", id] });
  };

  const addPlayer = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("players")
        .insert({ tournament_id: id, name, sort_order: players.length });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPlayer("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add the player"),
  });

  const updatePlayer = useMutation({
    mutationFn: async ({ playerId, name }: { playerId: string; name: string }) => {
      const { error } = await supabase
        .from("players")
        .update({ name })
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the player"),
  });
  
  const removePlayer = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase.from("players").delete().eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Remove that player's matches first."),
  });

  const updateTournament = useMutation({
    mutationFn: async (updates: { name: string; courts: number; format: "americano" | "mexicano" }) => {
      const { error } = await supabase
        .from("tournaments")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Tournament settings saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save settings"),
  });    
  
  const insertMatches = async (planned: PlannedMatch[]) => {
    if (planned.length === 0) throw new Error("Not enough players for a full court (need 4).");
    const { error } = await supabase
      .from("matches")
      .insert(planned.map((m) => ({ ...m, tournament_id: id })));
    if (error) throw error;
  };

  const generateSchedule = useMutation({
    mutationFn: async () => {
      if (!tournament) return;
      const ids = players.map((p) => p.id);
      await supabase.from("matches").delete().eq("tournament_id", id);
      const total = suggestedRounds(ids.length);
      if (tournament.format === "americano") {
        await insertMatches(buildAmericano(ids, total, tournament.courts));
      } else {
        await insertMatches(buildMexicanoRound(computeStandings(players, []), 1, tournament.courts));
      }
      await supabase
        .from("tournaments")
        .update({ status: "live", total_rounds: total })
        .eq("id", id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Schedule ready");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not build the schedule"),
  });

  const nextMexicanoRound = useMutation({
    mutationFn: async () => {
      if (!tournament) return;
      const nextRound = (rounds.at(-1)?.[0] ?? 0) + 1;
      await insertMatches(buildMexicanoRound(standings, nextRound, tournament.courts));
    },
    onSuccess: () => {
      invalidate();
      toast.success("Next round seeded from the standings");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create the round"),
  });

  const saveScore = useMutation({
    mutationFn: async (input: { matchId: string; a: number; b: number }) => {
      const { error } = await supabase
        .from("matches")
        .update({ score_a: input.a, score_b: input.b, completed: true })
        .eq("id", input.matchId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Could not save the score"),
  });

  if (isLoading || !tournament) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const shareUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/t/${tournament.share_code}`;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="capitalize">
                {tournament.format}
              </Badge>
              <span>
                {tournament.courts} court{tournament.courts > 1 ? "s" : ""}
              </span>
              <span>· {tournament.points_per_match} points per match</span>
              <span>· {players.length} players</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Share link copied");
              }}
            >
              <Copy className="size-4" />
              Copy share link
            </Button>
            <Button asChild variant="ghost">
              <Link to="/t/$code" params={{ code: tournament.share_code }}>
                Live view
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="rounds" className="mt-8">
          <TabsList>
            <TabsTrigger value="rounds">Rounds</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="rounds" className="mt-6 space-y-4">
            <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted-foreground">
                {tournament.format === "americano"
                   ? "Generates the full tournament with rotating partners."
                  : "Mexicano builds one round at a time from the live standings."}
              </p>

              <div className="flex gap-2">
              {matches.length > 0 ? (
                <>
                  {/* standard manual button */}
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDialogOpen(true)}
                    disabled={players.length < 4 || generateSchedule.isPending}
                  >
                    <Shuffle className="size-4" />
                    Rebuild schedule
                  </Button>
            
                  {/* AlertDialog open + onOpenChange */}
                  <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to rebuild the schedule?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will delete all existing matches and entered scores for this tournament. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            generateSchedule.mutate();
                            setIsDialogOpen(false);
                          }}
                        >
                          Yes, rebuild schedule
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => generateSchedule.mutate()}
                  disabled={players.length < 4 || generateSchedule.isPending}
                >
                  <Shuffle className="size-4" />
                  Generate schedule
                </Button>
              )}

                {/* "NEXT ROUND" (MEXICANO) */}
                {tournament.format === "mexicano" && matches.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => nextMexicanoRound.mutate()}
                    disabled={nextMexicanoRound.isPending}
                  >
                    <Plus className="size-4" />
                    Next round
                  </Button>
                )}
              </div>
            </div>

            {players.length < 4 && (
              <p className="text-sm text-muted-foreground">
                Add at least 4 players to build a schedule.
              </p>
            )}

            {rounds.map(([round, list]) => (
              <div key={round} className="panel p-5">
                <h3 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
                  Round {round}
                </h3>
                <div className="mt-4 space-y-3">
                  {list.map((m) => (
                    <ScoreRow
                      key={m.id}
                      match={m}
                      nameOf={nameOf}
                      maxPoints={tournament.points_per_match}
                      onSave={(a, b) => saveScore.mutate({ matchId: m.id, a, b })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="standings" className="mt-6">
            <StandingsTable rows={standings} />
          </TabsContent>

          <TabsContent value="players" className="mt-6 space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newPlayer.trim();
                if (name) addPlayer.mutate(name);
              }}
            >
              <Input
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                placeholder="Player name"
              />
              <Button type="submit" disabled={addPlayer.isPending}>
                <Plus className="size-4" />
                Add
              </Button>
            </form>

            <div className="panel divide-y divide-border/70">
              {players.length === 0 && (
                <p className="p-5 text-sm text-muted-foreground">No players yet.</p>
              )}
              {players.map((p, i) => (
                <PlayerItem
                  key={p.id}
                  player={p}
                  index={i}
                  onUpdate={(name) => updatePlayer.mutateAsync({ playerId: p.id, name })}
                  onRemove={() => removePlayer.mutate(p.id)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SettingsForm
              tournament={tournament}
              onSave={(updates) => updateTournament.mutate(updates)}
              isPending={updateTournament.isPending}
            />
          </TabsContent>
          
        </Tabs>
      </main>
    </div>
  );
}

function PlayerItem({
  player,
  index,
  onUpdate,
  onRemove,
}: {
  player: { id: string; name: string };
  index: number;
  onUpdate: (name: string) => Promise<void>;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(player.name);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === player.name) {
      setIsEditing(false);
      setName(player.name);
      return;
    }
    await onUpdate(trimmed);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 gap-3">
      <span className="tabular text-xs text-muted-foreground min-w-[1.25rem]">{index + 1}</span>
      
      {isEditing ? (
        <div className="flex items-center flex-1 gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setIsEditing(false);
                setName(player.name);
              }
            }}
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
            <Check className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              setIsEditing(false);
              setName(player.name);
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <>
          <span className="font-medium flex-1">{player.name}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              aria-label={`Edit ${player.name}`}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              aria-label={`Remove ${player.name}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ScoreRow({
  match,
  nameOf,
  maxPoints,
  onSave,
}: {
  match: MatchRow;
  nameOf: (id: string) => string;
  maxPoints: number;
  onSave: (a: number, b: number) => void;
}) {
  const [a, setA] = useState(String(match.score_a));
  const [b, setB] = useState(String(match.score_b));
  const numA = Number(a);
  const numB = Number(b);
  const valid =
    Number.isFinite(numA) && Number.isFinite(numB) && numA >= 0 && numB >= 0 && numA + numB === maxPoints;

  return (
    <div className="rounded-lg border border-border/80 bg-background/40 p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Court {match.court}</span>
        {match.completed ? (
          <span className="flex items-center gap-1 text-primary">
            <Check className="size-3.5" /> Finished
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <X className="size-3.5" /> Open
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="text-sm font-medium">
          {nameOf(match.a1)} <span className="text-muted-foreground">&amp;</span> {nameOf(match.a2)}
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={a}
            onChange={(e) => {
              const val = e.target.value;
              setA(val);
              
              const parsed = Number(val);
              if (val !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= maxPoints) {
                setB(String(maxPoints - parsed));
              }
            }}
            onFocus={() => {
              if (a === "0") setA("");
            }}
            onBlur={() => {
              if (a === "") setA("0");
            }}
            inputMode="numeric"
            className="h-10 w-14 text-center text-base tabular"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            value={b}
            onChange={(e) => {
              const val = e.target.value;
              setB(val);
              
              const parsed = Number(val);
              if (val !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= maxPoints) {
                setA(String(maxPoints - parsed));
              }
            }}
            onFocus={() => {
              if (b === "0") setB("");
            }}
            onBlur={() => {
              if (b === "") setB("0");
            }}
            inputMode="numeric"
            className="h-10 w-14 text-center text-base tabular"
          />
        </div>
        <p className="text-right text-sm font-medium">
          {nameOf(match.b1)} <span className="text-muted-foreground">&amp;</span> {nameOf(match.b2)}
        </p>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Scores must add up to {maxPoints}.</p>
        <Button size="sm" variant="outline" disabled={!valid} onClick={() => onSave(numA, numB)}>
          Save
        </Button>
      </div>
    </div>
  );
}

function SettingsForm({
  tournament,
  onSave,
  isPending,
}: {
  tournament: any;
  onSave: (updates: { name: string; courts: number; format: "americano" | "mexicano" }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(tournament.name);
  const [courts, setCourts] = useState(String(tournament.courts));
  const [format, setFormat] = useState<"americano" | "mexicano">(tournament.format);

  const handleSave = () => {
    const numCourts = parseInt(courts, 10);
    if (!name.trim() || isNaN(numCourts) || numCourts < 1) return;
    onSave({ name: name.trim(), courts: numCourts, format });
  };

  return (
    <div className="panel max-w-lg space-y-5 p-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Tournament Name</label>
        <Input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="New Tournament name" 
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Number of Courts</label>
        <Input 
          type="number" 
          min="1" 
          value={courts} 
          onChange={(e) => setCourts(e.target.value)} 
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Tournament Format</label>
        <Select value={format} onValueChange={(val: "americano" | "mexicano") => setFormat(val)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="americano">Americano — partners rotate</SelectItem>
            <SelectItem value="mexicano">Mexicano — seeded by standings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        onClick={handleSave}
        disabled={isPending || !name.trim() || parseInt(courts, 10) < 1}
      >
        Save changes
      </Button>
    </div>
  );
}
