DROP POLICY IF EXISTS "tournaments public read" ON public.tournaments;
DROP POLICY IF EXISTS "players public read" ON public.players;
DROP POLICY IF EXISTS "matches public read" ON public.matches;

CREATE POLICY "tournaments owner read" ON public.tournaments FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "players owner read" ON public.players FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = players.tournament_id AND t.owner_id = auth.uid()));
CREATE POLICY "matches owner read" ON public.matches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = matches.tournament_id AND t.owner_id = auth.uid()));

REVOKE ALL ON public.tournaments FROM anon;
REVOKE ALL ON public.players FROM anon;
REVOKE ALL ON public.matches FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
GRANT ALL ON public.players TO service_role;
GRANT ALL ON public.matches TO service_role;