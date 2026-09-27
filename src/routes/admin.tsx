import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Trash2, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const ADMIN_EMAIL = "igor.krolak@gmail.com";

export function AdminPanel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // 0. Verify Admin Access
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
  }, []);

  // 1. Fetch Draft/Archived Tournaments (Only runs if admin)
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
    enabled: isAdmin === true,
  });

  // 2. Fetch Users (Only runs if admin)
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles") 
        .select("id, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  // 3. Delete Mutations
  const deleteTournament = useMutation({
    mutationFn: async (id: string) => {
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

  // Block rendering until auth is verified
  if (isAdmin === null) {
    return <div className="p-10 text-center text-muted-foreground">Verifying access...</div>;
  }

  // Show unauthorized error for everyone else
  if (isAdmin === false) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <ShieldAlert className="size-12 text-destructive" />
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button onClick={() => navigate({ to: "/" })}>Go Home</Button>
      </div>
    );
  }

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
