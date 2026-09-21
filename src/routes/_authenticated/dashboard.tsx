import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import type { Format } from "@/lib/padel";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My tournaments — Padellic" },
      { name: "description", content: "Create and manage your padel Americano and Mexicano tournaments." },
      { property: "og:title", content: "My tournaments — Padellic" },
      { property: "og:description", content: "Create and manage your padel tournaments." },
    ],
  }),
  component: Dashboard,
});

const statuses = ["setup", "live", "completed", "archived"];

function Dashboard() {
  const { data: tournaments = [], isLoading } = useQuery(tournamentsQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("americano");
  const [courts, setCourts] = useState("2");
  const [points, setPoints] = useState("21");

  // State for status filtering
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(statuses);

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

  // Filter the tournaments list based on checked statuses
  const filteredTournaments = tournaments.filter((t: Tournament) =>
    selectedStatuses.includes(t.status)
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">My tournaments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a new night or jump back into one in progress.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            className="panel h-fit space-y-4 p-6"
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
                  <SelectItem value="americano">Americano — partners rotate</SelectItem>
                  <SelectItem value="mexicano">Mexicano — seeded by standings</SelectItem>
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
            <Button type="submit" className="w-full" disabled={create.isPending}>
              <Plus className="size-4" />
              Create tournament
            </Button>
          </form>

          <div className="space-y-4">
            {/* Filter Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/80 bg-background/40 p-4">
              <span className="text-sm font-medium text-muted-foreground">Filter:</span>
              {statuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`filter-${status}`}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <Label htmlFor={`filter-${status}`} className="cursor-pointer capitalize text-sm">
                    {status}
                  </Label>
                </div>
              ))}
            </div>

            {/* Tournament List */}
            <div className="space-y-3">
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
                  className="panel flex items-center justify-between gap-4 p-5 transition-colors hover:border-primary/60"
                >
                  <div>
                    <p className="font-display text-lg font-semibold">{t.name}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      {t.courts} court{t.courts > 1 ? "s" : ""} · {t.points_per_match} points
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {t.format}
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
