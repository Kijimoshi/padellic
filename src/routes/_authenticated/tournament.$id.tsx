import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, Copy, Pencil, Plus, Shuffle, Trash2, X, QrCode, Settings2, Play, Trophy, Archive } from "lucide-react"; // Added QrCode

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
  buildSwissRound,
  buildKotcRound,
  computeStandings,
  computeTeamStandings,
  suggestedRounds,
  type Format,
  type MatchRow,
  type PlannedMatch,
  getFormatLabel,
  validatePlayerCount
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

import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  // STANDINGS CALCULATION
  // 1. Keep the individual standings (Mexicano needs this for seeding anyway)
  const standings = useMemo(
    () => computeStandings(players, matches),
    [players, matches]
  );
  // 2. Calculate the team standings using the individual standings
  const teamStandings = useMemo(
    () => computeTeamStandings(players, standings),
    [players, standings]
  );
  // 3. Determine which leaderboard to display based on the format
  const isTeamFormat = tournament?.format === "swiss" || tournament?.format === "kotc";
  const displayStandings = isTeamFormat ? teamStandings : standings;

  const nameOf = (pid: string) => players.find((p) => p.id === pid)?.name ?? "—";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

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
    mutationFn: async (updates: { name: string; courts: number; format: Format }) => {
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

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("tournaments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Tournament status updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update status"),
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

      // Clear existing matches
      await supabase.from("matches").delete().eq("tournament_id", id);
      const total = suggestedRounds(ids.length);

      // Generate matches based on format
      let plannedMatches;
      switch (tournament.format) {
        case "americano":
          plannedMatches = buildAmericano(ids, total, tournament.courts);
          break;
        case "swiss":
          plannedMatches = buildSwissRound(ids, [], 1, tournament.courts);
          break;
        case "kotc":
          plannedMatches = buildKotcRound(ids, [], 1, tournament.courts);
          break;
        case "mexicano":
        default:
          plannedMatches = buildMexicanoRound(computeStandings(players, []), 1, tournament.courts);
          break;
      }

      await insertMatches(plannedMatches);

      await supabase
        .from("tournaments")
        .update({ status: "live", total_rounds: total })
        .eq("id", id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Schedule ready");
      setCurrentRoundIndex(0);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not build the schedule"),
  });

  const generateNextRound = useMutation({
    mutationFn: async () => {
      if (!tournament) return;

      const nextRound = (rounds.at(-1)?.[0] ?? 0) + 1;
      const ids = players.map((p) => p.id);
      let plannedMatches;

      switch (tournament.format) {
        case "swiss":
          plannedMatches = buildSwissRound(ids, matches, nextRound, tournament.courts);
          break;
        case "kotc":
          plannedMatches = buildKotcRound(ids, matches, nextRound, tournament.courts);
          break;
        case "mexicano":
        default:
          plannedMatches = buildMexicanoRound(standings, nextRound, tournament.courts);
          break;
      }

      await insertMatches(plannedMatches);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Next round generated successfully");
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
        <div className="flex flex-wrap items-start justify-between gap-2">
          {/* 1. Top Left: Title & Info */}
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{tournament.name}</h1>

            {/* INFO BAR */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">
                {getFormatLabel(tournament.format)}
              </Badge>
              <span>
                {tournament.courts} court{tournament.courts > 1 ? "s" : ""}
              </span>
              <span>· {tournament.points_per_match} points per match</span>
              <span>· {players.length} players</span>
            </div>
          </div>

          {/* 2. Top Right: Action Buttons */}
          <div className="mb-2 mt-1 flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs sm:text-sm">
                  <QrCode className="size-4" />
                  Show QR
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-center">Scan to follow live</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <QRCodeSVG value={shareUrl} size={240} level="H" />
                  </div>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Players can scan this code to view live standings and court assignments.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="text-xs sm:text-sm"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Share link copied");
              }}
            >
              <Copy className="size-4" />
              Copy link
            </Button>

            <Button
              variant="outline"
              className="gap-2 text-xs sm:text-sm"
              onClick={() => {
                if (typeof window !== "undefined") {
                  // Open live view in a normal new tab/window (no popup features)
                  window.open(shareUrl, "_blank");
                }
              }}
            >
              {/* The Pulsing Green Dot */}
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
              </span>
              Live view
            </Button>
          </div>
        </div>

        {/* 3. The Tabs wrapper now contains the Info Row + Tabs on the left, Clock on the right */}
        <Tabs defaultValue="rounds">

          {/* Grid Container: Left column ( Tabs), Right column (Clock) */}
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto]">
            {/* Left Column: Tabs  */}
            <div>
              {/* 2. TABS */}
              <TabsList className="sm:h-10 mt-2 grid w-full grid-cols-4 sm:inline-flex sm:w-auto">
                <TabsTrigger value="rounds" className="text-sm sm:text-base">Rounds</TabsTrigger>
                <TabsTrigger value="standings" className="text-sm sm:text-base">Standings</TabsTrigger>
                <TabsTrigger value="players" className="text-sm sm:text-base">Players</TabsTrigger>
                <TabsTrigger value="settings" className="text-sm sm:text-base">Settings</TabsTrigger>
              </TabsList>
            </div>

            {/* Right Column: Clock */}
            <div className="hidden sm:flex sm:justify-end">
              <MatchClock />
            </div>
          </div>

          <TabsContent value="rounds" className="mt-4 space-y-2">
            {matches.length === 0 && (() => {
              // Check if the current format strictly requires a multiple of 4
              const requiresMultipleOf4 = tournament.format !== "americano";
              const isInvalidPlayerCount = players.length < 4 || (requiresMultipleOf4 && players.length % 4 !== 0);

              const teamsCount = players.length / 2;
              const requiredCourts = teamsCount / 2; // 2 teams per court
              const isKotcOverCapacity =
                tournament.format === "kotc" && requiredCourts > tournament.courts;

              return (
                <div className="panel mb-2 flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Helper Text / Validation Warning */}
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {tournament.format === "americano"
                        ? "Generates the full tournament with rotating partners."
                        : "Mexicano, Swiss, and KotC build round-by-round."}
                    </p>
                    {isInvalidPlayerCount && (
                      <p className="text-xs font-semibold text-destructive">
                        {players.length < 4
                          ? ""
                          : `${getFormatLabel(tournament.format)} requires a multiple of 4 players (currently ${players.length}).`}
                      </p>
                    )}
                    {isKotcOverCapacity && (
                      <p className="text-xs font-semibold text-destructive">
                        KotC requires 1 court per 4 players. You need {requiredCourts} courts, but only have {tournament.courts}.
                      </p>
                    )}
                  </div>

                  {/* Generate Schedule Button */}
                  <Button
                    onClick={() => generateSchedule.mutate()}
                    disabled={isInvalidPlayerCount || generateSchedule.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Shuffle className="size-4" />
                    Generate schedule
                  </Button>
                </div>
              );
            })()}

            {players.length < 4 && (
              <p className="text-sm text-muted-foreground">
                Add at least 4 players to build a schedule.
              </p>
            )}

            {/* DISPLAY ONLY THE CURRENT ACTIVE ROUND */}
            {rounds.length > 0 && (() => {
              const safeIndex = Math.min(currentRoundIndex, rounds.length - 1);
              const currentRoundEntry = rounds[safeIndex];
              if (!currentRoundEntry) return null;

              const [round, list] = currentRoundEntry;
              const playingIds = new Set(list.flatMap((m) => [m.a1, m.a2, m.b1, m.b2]));
              const restingPlayers = players.filter((p) => !playingIds.has(p.id));

              return (
                <div className="space-y-2">
                  {/* Current Round Panel */}
                  <div key={round} className="panel p-2 sm:p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="ml-1 font-display text-base font-bold uppercase tracking-widest text-primary">
                        Round {round}
                      </h3>
                    </div>

                    <div className="mt-1 sm:mt-3 space-y-2 sm:space-y-4">
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

                    {/* Resting players section */}
                    {restingPlayers.length > 0 && (
                      <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Resting:</span>{" "}
                        {restingPlayers.map((p) => p.name).join(", ")}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM: Round Navigation Only */}
                  <div className="mt-8 flex items-center justify-between gap-2">

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentRoundIndex((prev) => prev - 1)}
                      disabled={currentRoundIndex === 0}
                    >
                      Prev round
                    </Button>

                    <div className="text-xs font-medium text-center">
                      <p>Round</p>
                      <p>{currentRoundIndex + 1} / {tournament.format === "americano" ? tournament.total_rounds : rounds.length}</p>
                    </div>

                    {currentRoundIndex < rounds.length - 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentRoundIndex((prev) => prev + 1)}
                      >
                        Next round
                      </Button>
                    ) : tournament.format !== "americano" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          generateNextRound.mutate(undefined, {
                            onSuccess: () => {
                              setCurrentRoundIndex((prev) => prev + 1);
                            }
                          });
                        }}
                        disabled={generateNextRound.isPending || matches.some((m) => !m.completed)}
                      >
                        <Plus className="mr-1 size-4" />
                        Generate next
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={true}
                      >
                        Next round
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* NEW FOOTER LOCATION */}
            {matches.length > 0 && (
              <div className="mt-8 border-t border-border/50 pt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  Need to rebuild the schedule? Go to the <strong>Settings</strong> tab.
                </p>
              </div>
            )}

          </TabsContent>

          <TabsContent value="standings" className="mt-6">
            <StandingsTable rows={displayStandings} />
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

            <div className={tournament?.format === "swiss" || tournament?.format === "kotc" ? "space-y-1" : "panel divide-y divide-border/70"}>
              {players.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No players yet.</p>
              )}

              {tournament?.format === "swiss" || tournament?.format === "kotc" ? (
                // TEAM FORMAT: Compact grouped box
                Array.from({ length: Math.ceil(players.length / 2) }).map((_, i) => {
                  const p1 = players[i * 2];
                  const p2 = players[i * 2 + 1];

                  return (
                    <div
                      key={`team-${i}`}
                      className="overflow-hidden rounded-md border-2 border-foreground/30 bg-primary/5 shadow-sm"
                    >
                      <div className="divide-y divide-primary/20 [&_button]:py-0.5 [&_div]:py-0.5 md:[&_button]:py-1 md:[&_div]:py-1">
                        {p1 && (
                          <PlayerItem
                            player={p1}
                            index={i * 2}
                            onUpdate={(name) => updatePlayer.mutateAsync({ playerId: p1.id, name })}
                            onRemove={() => removePlayer.mutate(p1.id)}
                          />
                        )}
                        {p2 && (
                          <PlayerItem
                            player={p2}
                            index={i * 2 + 1}
                            onUpdate={(name) => updatePlayer.mutateAsync({ playerId: p2.id, name })}
                            onRemove={() => removePlayer.mutate(p2.id)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                // INDIVIDUAL FORMAT: Compact list with horizontal separators
                <div className="divide-y divide-border/70 [&_button]:py-0.5 [&_div]:py-0.5 md:[&_button]:py-1 md:[&_div]:py-1">
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
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            <div className="panel max-w-lg p-5">
              <h2 className="mb-6 text-sm font-medium">Tournament Status</h2>
              <TournamentStatusBar
                currentStatus={tournament.status}
                onStatusChange={(newStatus) => updateStatus.mutate(newStatus)}
                isPending={updateStatus.isPending}
              />
            </div>

            <SettingsForm
              tournament={tournament}
              onSave={(updates) => updateTournament.mutate(updates)}
              isPending={updateTournament.isPending}
            />

            <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
              <h3 className="text-sm font-semibold text-destructive">Danger Zone: Rebuild Schedule</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                <strong>Be careful!</strong> Rebuilding the schedule will delete all current matches and entered scores, creating a brand new schedule from scratch.
              </p>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setIsDialogOpen(true)}
                  disabled={players.length < 4 || generateSchedule.isPending}
                >
                  <Shuffle className="size-4" />
                  Rebuild schedule
                </Button>

                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to rebuild the schedule?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will delete all existing matches and entered scores for this tournament. A new schedule will be generated from scratch. This action cannot be undone.
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
              </div>
            </div>

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
      <span className="tabular text-xs text-muted-foreground min-w-5">{index + 1}</span>

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
          <span
            className="font-medium flex-1 cursor-pointer select-none"
            onDoubleClick={() => {
              setIsEditing(true);
            }}
            title="Double-click to edit"
          >
            {player.name}
          </span>
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
  const [justSaved, setJustSaved] = useState(false);

  const handleAChange = (val: string) => {
    setA(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= maxPoints) {
      setB(String(maxPoints - num));
    } else if (val === "") {
      setB("");
    }
  };

  const handleBChange = (val: string) => {
    setB(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= maxPoints) {
      setA(String(maxPoints - num));
    } else if (val === "") {
      setA("");
    }
  };

  const numA = Number(a);
  const numB = Number(b);

  // Validation logic checking for NaN, negatives, or scores exceeding maxPoints
  const hasError =
    (a !== "" && (Number.isNaN(numA) || numA < 0 || numA > maxPoints)) ||
    (b !== "" && (Number.isNaN(numB) || numB < 0 || numB > maxPoints));

  const valid =
    !hasError &&
    a !== "" &&
    b !== "" &&
    Number.isFinite(numA) &&
    Number.isFinite(numB) &&
    numA >= 0 &&
    numB >= 0 &&
    numA + numB === maxPoints;

  // Check if the current inputs are different from the saved database values
  const hasChanged = numA !== match.score_a || numB !== match.score_b;

  // Auto-save logic
  useEffect(() => {
    if (valid && hasChanged) {
      const timer = setTimeout(() => {
        onSave(numA, numB);
        setJustSaved(true);
      }, 1000);

      // Cleanup function clears the timer if the user types again before 1 second passes
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [numA, numB, valid, hasChanged, onSave]);

  // Handle the 3-second highlight reset
  useEffect(() => {
    if (justSaved) {
      const timer = setTimeout(() => {
        setJustSaved(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [justSaved]);

  return (
    <div className="rounded-lg border border-border/80 bg-background/40 p-2 md:p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Court {match.court}</span>
        {hasError ? (
          <span className="font-bold text-destructive">Error</span>
        ) : match.completed || justSaved ? (
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-500 ${justSaved
                ? "bg-green-500/20 text-green-600 dark:text-green-400 font-bold scale-105"
                : "text-primary"
              }`}
          >
            <Check className="size-3.5" /> Saved
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <X className="size-3.5" /> Open
          </span>
        )}
      </div>

      <div className="mt-1 md:mt-4 flex flex-col items-stretch gap-1 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4">
        {/* Team A */}
        <div className="flex flex-col items-start gap-1">
          <p className="text-left text-base font-semibold">
            {nameOf(match.a1)} <span className="text-sm font-normal text-muted-foreground">&amp;</span> {nameOf(match.a2)}
          </p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-xl font-bold">
            <Input
              value={a}
              onChange={(e) => handleAChange(e.target.value)}
              onFocus={() => {
                if (a === "0") setA("");
              }}
              onBlur={() => {
                if (a === "") setA("0");
              }}
              inputMode="numeric"
              className="h-12 w-16 text-center text-xl font-bold tabular-nums"
            />
            <span className="text-muted-foreground pb-1">:</span>
            <Input
              value={b}
              onChange={(e) => handleBChange(e.target.value)}
              onFocus={() => {
                if (b === "0") setB("");
              }}
              onBlur={() => {
                if (b === "") setB("0");
              }}
              inputMode="numeric"
              className="h-12 w-16 text-center text-xl font-bold tabular-nums"
            />
          </div>
        </div>

        {/* Team B */}
        <div className="flex flex-col items-end gap-1">
          <p className="text-right text-base font-semibold">
            {nameOf(match.b1)} <span className="text-sm font-normal text-muted-foreground">&amp;</span> {nameOf(match.b2)}
          </p>
        </div>
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
  onSave: (updates: {
    name: string;
    courts: number;
    format: Format  // changed from "americano" | "mexicano" | "swiss" | "kotc" to 'Format' type
  }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(tournament.name);
  const [courts, setCourts] = useState(String(tournament.courts));
  const [format, setFormat] = useState<"americano" | "mexicano" | "swiss" | "kotc">(
    tournament.format
  );

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
        {/* // changed from "americano" | "mexicano" | "swiss" | "kotc" to 'Format' type */}
        <Select value={format} onValueChange={(val: Format) => setFormat(val)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="americano">Americano — solo partners rotate</SelectItem>
            <SelectItem value="mexicano">Mexicano — solo seeded by standings</SelectItem>
            <SelectItem value="swiss">Swiss — fixed pairs matched by score</SelectItem>
            <SelectItem value="kotc">King of the Court — fixed pairs move courts</SelectItem>
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

const STATUSES = [
  { id: "setup", label: "Setup", icon: Settings2 },
  { id: "live", label: "Live", icon: Play },
  { id: "finished", label: "Finished", icon: Trophy },
  { id: "archived", label: "Archived", icon: Archive },
] as const;

function TournamentStatusBar({
  currentStatus,
  onStatusChange,
  isPending,
}: {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  isPending: boolean;
}) {
  const safeIndex = Math.max(0, STATUSES.findIndex((s) => s.id === (currentStatus || "setup")));

  return (
    <div className="relative flex w-full justify-between pb-8 pt-2">
      {/* Background Track Line */}
      <div className="absolute left-5 right-5 top-7 h-0.5 -translate-y-1/2 bg-border">
        {/* Active Progress Line */}
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(safeIndex / (STATUSES.length - 1)) * 100}%` }}
        />
      </div>

      {STATUSES.map((status, index) => {
        const Icon = status.icon;
        const isPast = index < safeIndex;
        const isCurrent = index === safeIndex;

        return (
          <div key={status.id} className="relative z-10 flex flex-col items-center">
            <button
              type="button"
              onClick={() => onStatusChange(status.id)}
              disabled={isPending}
              className="group relative flex flex-col items-center outline-none"
            >
              {/* Added bg-background to perfectly mask the track line behind it */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-all duration-200 ${isCurrent
                    ? "border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20"
                    : isPast
                      ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-muted text-muted-foreground hover:border-primary/50 hover:text-primary/70"
                  }`}
              >
                <Icon className="size-4" />
              </div>
              <span
                className={`absolute -bottom-7 whitespace-nowrap text-xs font-semibold tracking-wide transition-colors ${isCurrent ? "text-primary" : isPast ? "text-foreground" : "text-muted-foreground"
                  }`}
              >
                {status.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MatchClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  return (
    <div className="relative flex items-center justify-center rounded-lg border border-primary/20 bg-background/50 px-5 py-3 shadow-[2px_2px_0px_0px_hsl(var(--primary))] backdrop-blur-sm dark:shadow-[2px_2px_0px_0px_hsl(var(--primary)/0.3)]">
      <div className="flex items-baseline font-mono text-5xl font-black leading-none tracking-tighter text-foreground tabular-nums">
        <span>{hours}</span>
        <span className="mx-1 animate-[pulse_1s_ease-in-out_infinite] text-primary/40 pb-0.5">:</span>
        <span>{minutes}</span>
        <span className="text-3xl mx-1 text-muted-foreground/40 pb-0.5">:</span>
        <span className="text-3xl text-muted-foreground/70">{seconds}</span>
      </div>
    </div>
  );
}
