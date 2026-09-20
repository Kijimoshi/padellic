CREATE OR REPLACE FUNCTION public.get_public_tournament(_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tournament', jsonb_build_object(
      'id', t.id, 'name', t.name, 'format', t.format, 'courts', t.courts,
      'points_per_match', t.points_per_match, 'status', t.status, 'share_code', t.share_code
    ),
    'players', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) ORDER BY p.sort_order)
      FROM players p WHERE p.tournament_id = t.id
    ), '[]'::jsonb),
    'matches', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id, 'round', m.round, 'court', m.court,
        'a1', m.a1, 'a2', m.a2, 'b1', m.b1, 'b2', m.b2,
        'score_a', m.score_a, 'score_b', m.score_b, 'completed', m.completed
      ) ORDER BY m.round, m.court)
      FROM matches m WHERE m.tournament_id = t.id
    ), '[]'::jsonb)
  )
  FROM tournaments t
  WHERE t.share_code = _code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_tournament(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tournament(text) TO anon, authenticated, service_role;