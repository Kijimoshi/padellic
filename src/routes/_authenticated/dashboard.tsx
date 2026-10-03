import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trophy, Users } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { tournamentsQuery, type Tournament } from "@/lib/tournament-data";
import { getFormatLabel, type Format } from "@/lib/padel";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My tournaments — Padellic" },
      { name: "description", content: "Create and manage your padel tournaments." },
      { property: "og:title", content: "My tournaments — Padellic" },
      { property: "og:description", content: "Create and manage your padel tournaments." },
    ],
  }),
  component: Dashboard,
});

const statuses = ["setup", "live", "finished", "archived"];

function Dashboard() {
  const { data: tournaments = [], isLoading } = useQuery(tournamentsQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("americano");
  const [courts, setCourts] = useState("2");
  const [points, setPoints] = useState("21");

  // State for status filtering
  //const [selectedStatuses, setSelectedStatuses] = useState<string[]>(statuses);
  // Initialize state without "archived"
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "setup",
    "live",
    "finished",
  ]);
  
  //const [ownerFilter, setOwnerFilter] = useState<"mine" | "all">("mine");
  // New states for ownership filtering
  const [showOnlyMine, setShowOnlyMine] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Fetch the current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);
  
  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData.user?.id;
      if (!ownerId) throw new Error("You need to be signed in.");
      const { data, error } = await supabase
        .from("tournaments")
        .insert({
          owner_id: ownerId,
          name: name.trim() || "Padel night",
          format,
          courts: Number(courts),
          points_per_match: Number(points),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      setName("");
      navigate({ to: "/tournament/$id", params: { id } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not create the tournament"),
  });

  // Filter the tournaments list based on checked statuses and ownership
  const filteredTournaments = tournaments.filter((t: Tournament) => {
    const matchesStatus = selectedStatuses.includes(t.status);
    const matchesOwner = showOnlyMine ? t.owner_id === currentUserId : true;
    return matchesStatus && matchesOwner;
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6 md:py-8">
        <h1 className="text-3xl font-bold">My tournaments</h1>
        <p className="mt-1 mb-2 text-sm text-muted-foreground">
          Set up a new event or jump back into one in progress.
        </p>

        <div className="mt-3 md:mt-4 grid gap-3 md:gap-5 lg:grid-cols-[360px_1fr] gap-y-4 md:gap-y-5">
          <form
            className="panel h-fit space-y-1 md:space-y-3 p-6 mb-2 md:mb-6"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <h2 className="text-lg font-semibold">New tournament</h2>
            <div className="space-y-2">
              <Label htmlFor="tname">Name</Label>
              <Input
                id="tname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Friday padel night"
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="courts">Courts</Label>
                <Input
                  id="courts"
                  type="number"
                  min={1}
                  max={8}
                  value={courts}
                  onChange={(e) => setCourts(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="points">Points / match</Label>
                <Input
                  id="points"
                  type="number"
                  min={8}
                  max={64}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full mt-2" disabled={create.isPending}>
              <Plus className="size-4" />
              Create tournament
            </Button>
          </form>

          <div className="space-y-2 md:space-y-4">
            {/* Filter Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/80 bg-background/40 p-4">
              <span className="text-sm font-medium text-muted-foreground">Filter:</span>
              
              <div className="flex flex-wrap items-center gap-4">
                {statuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-${status}`}
                      checked={selectedStatuses.includes(status)}
                      onCheckedChange={() => toggleStatus(status)}
                    />
                    <Label htmlFor={`filter-${status}`} className="cursor-pointer capitalize text-xs md:text-sm">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>

              {/* Visual Divider */}
              <div className="hidden h-5 w-px bg-border sm:block self-center"></div>

              {/* Ownership Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-mine"
                  checked={showOnlyMine}
                  onCheckedChange={(checked) => setShowOnlyMine(checked as boolean)}
                  disabled={!currentUserId}
                />
                <Label htmlFor="filter-mine" className="cursor-pointer text-sm font-medium">
                  Only mine
                  {/* removed  text-primary*/}
                </Label>
              </div>
            </div>         

            {/* Tournament List */}
            <div className="mt-4 md:mt-6 space-y-2 md:space-y-4">
              {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!isLoading && filteredTournaments.length === 0 && (
                <div className="panel p-8 text-center">
                  <Trophy className="mx-auto size-6 text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No tournaments match your filter.
                  </p>
                </div>
              )}
              {filteredTournaments.map((t: Tournament) => (
                <Link
                  key={t.id}
                  to="/tournament/$id"
                  params={{ id: t.id }}
                  className="panel flex items-center justify-between gap-4 p-4 md:p-5 transition-colors hover:border-primary/60"
                >
                  <div>
                    <p className="font-display text-lg font-semibold">{t.name}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      {t.courts} court{t.courts > 1 ? "s" : ""} · {t.points_per_match} points
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary">
                      {getFormatLabel(t.format)}
                    </Badge>
                    <span className="text-xs capitalize text-muted-foreground">{t.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
