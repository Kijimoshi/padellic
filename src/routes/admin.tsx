import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function AdminPanel() {
  const queryClient = useQueryClient();

  // 1. Fetch Draft/Archived Tournaments
  const { data: tournaments, isLoading: loadingTourneys } = useQuery({
    queryKey: ["admin", "tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, status, created_at")
        .in("status", ["setup", "archived"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Users (Profiles)
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles") // Replace with your actual users table name
        .select("id, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // 3. Delete Mutations
  const deleteTournament = useMutation({
    mutationFn: async (id: string) => {
      // Assuming ON DELETE CASCADE is set for matches. 
      // If not, you must delete matches first: await supabase.from("matches").delete().eq("tournament_id", id);
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tournament deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "tournaments"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User profile deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage and clean up stale database records.</p>
      </div>

      <Tabs defaultValue="tournaments" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tournaments">Draft Tournaments</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="tournaments" className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-surface p-4">
            <div className="mb-4 flex items-center gap-2 text-sm text-amber-500">
              <AlertTriangle className="size-4" />
              <span>Deleting a tournament will permanently remove all associated matches and scores.</span>
            </div>

            {loadingTourneys ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : !tournaments?.length ? (
              <div className="p-4 text-center text-muted-foreground">No draft or archived tournaments found.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {tournaments.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{t.name || "Untitled Tournament"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={t.status === "archived" ? "secondary" : "outline"}>
                          {t.status}
                        </Badge>
                        <span>Created {formatDistanceToNow(new Date(t.created_at))} ago</span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${t.name}"?`)) {
                          deleteTournament.mutate(t.id);
                        }
                      }}
                      disabled={deleteTournament.isPending}
                    >
                      <Trash2 className="size-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-surface p-4">
            <div className="mb-4 flex items-center gap-2 text-sm text-amber-500">
              <AlertTriangle className="size-4" />
              <span>This only deletes the public profile. To completely remove authentication access, delete the user in the Supabase Dashboard.</span>
            </div>

            {loadingUsers ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : !users?.length ? (
              <div className="p-4 text-center text-muted-foreground">No users found.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDistanceToNow(new Date(u.created_at))} ago
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Delete profile for ${u.email}?`)) {
                          deleteUser.mutate(u.id);
                        }
                      }}
                      disabled={deleteUser.isPending}
                    >
                      <Trash2 className="size-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}