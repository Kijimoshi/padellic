import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Trophy className="size-4" />
          </span>
           <span className="font-display text-lg font-bold tracking-tight">Padellic</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {email ? (
            <>
              {/* ADMIN LINK - ONLY VISIBLE TO YOU */}
              {email === "igor.krolak@gmail.com" && (
                <Button asChild variant="ghost" size="sm" className="text-amber-500 hover:text-amber-600 px-2 sm:px-3">
                  <Link to="/admin">Admin</Link>
                </Button>
              )}

              {/* EMAIL DISPLAY - RESPONSIVE SIZE & SCALING */}
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                <span className="self-center text-[10px] sm:text-xs text-muted-foreground mr-1 max-w-[90px] sm:max-w-none truncate" title={email}>
                  {email}
                </span>
                <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                  <Link to="/dashboard">My tournaments</Link>
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="px-2 sm:px-3">
                <LogOut className="size-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
        
      </div>
    </header>
  );
}
