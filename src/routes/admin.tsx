import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Trash2, AlertTriangle, ShieldAlert, Filter, User } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute('/admin')({
  component: AdminPanel,
});

const ADMIN_EMAIL = "igor.krolak@gmail.com";

function AdminPanel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
  }, []);


const { 
    data: tournaments, 
    isLoading: loadingTourneys,
    error: tourneysError // Extracted here
  } = useQuery({
    queryKey: ["admin", "tournaments", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("tournaments")
        .select("id, name, status, created_at, profiles(display_name)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

const { data: users, isLoading: loadingUsers, error: usersError } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles") 
        // THIS LINE was causing the error - change it to display_name
        .select("id, display_name, created_at")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

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

  if (isAdmin === null) {
    return <div className="p-10 text-center text-muted-foreground">Verifying access...</div>;
  }

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
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="tournaments" className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-surface p-4">
            
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <AlertTriangle className="size-4" />
                <span>Deleting a tournament permanently removes all associated matches.</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex h-9 w-[150px] items-center justify-between rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all" className="bg-background text-foreground">All Statuses</option>
                    <option value="setup" className="bg-background text-foreground">Setup</option>
                    <option value="live" className="bg-background text-foreground">Live</option>
                    <option value="finished" className="bg-background text-foreground">Finished</option>
                    <option value="archived" className="bg-background text-foreground">Archived</option>
                  </select>
              </div>
            </div>

            {tourneysError ? (
              <div className="p-4 text-center font-bold text-destructive">
                Database Error: {tourneysError.message}
              </div>
            ) : loadingTourneys ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : !tournaments?.length ? (
              <div className="p-4 text-center text-muted-foreground">No tournaments found for this filter.</div>
            ) : (
              <div className="divide-y divide-border/50">
                
              {tournaments.map((t) => {
                  // Find the matching user from the existing users query!
                  const ownerProfile = users?.find((u) => u.id === t.owner_id);
                  const ownerEmail = ownerProfile?.email || "Unknown user";

                  return (
                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-4">
                      <div>
                        <p className="font-medium">{t.name || "Untitled Tournament"}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <Badge variant={t.status === "archived" ? "secondary" : "outline"}>
                            {t.status}
                          </Badge>
                          <span>Created {formatDistanceToNow(new Date(t.created_at))} ago</span>
                          <span className="hidden sm:inline text-border">•</span>
                          <span className="flex items-center gap-1">
                            <User className="size-3" />
                            {ownerEmail}
                          </span>
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
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="size-4 sm:mr-2" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  );
                })}
                
              </div>
            )}


          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-surface p-4">
            <div className="mb-4 flex items-center gap-2 text-sm text-amber-500">
              <AlertTriangle className="size-4" />
              <span>Only deletes public profile. Delete user in Supabase Auth to revoke access entirely.</span>
            </div>

            {usersError ? (
              <div className="p-4 text-center font-bold text-destructive">
                Database Error: {usersError.message}
              </div>
            ) : loadingUsers ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : !users?.length ? (
              <div className="p-4 text-center text-muted-foreground">No users found.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      {/* Changed u.email to u.display_name */}
                      <p className="font-medium">{u.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDistanceToNow(new Date(u.created_at))} ago
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        // Changed u.email to u.display_name
                        if (window.confirm(`Delete profile for ${u.display_name}?`)) {
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
