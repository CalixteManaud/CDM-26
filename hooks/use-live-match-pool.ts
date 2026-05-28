/**
 * Hook de polling pour les pools de paris en direct.
 *
 * Appelle `/api/matches/[id]/pool` toutes les `intervalMs` (défaut 5s) et expose
 * { pool, odds, bettingOpen, isLoading, error }. L'endpoint est cache CDN
 * (max-age=2, stale-while-revalidate=4) — avec 1000 clients qui pollent toutes
 * les 5s, Vercel ne tape la DB qu'une fois toutes les 2s (~30 req/min/match).
 *
 * - Pause auto quand l'onglet est inactif (Page Visibility API).
 * - Refresh forcé quand l'onglet redevient visible (sinon on attend le tick).
 * - Cleanup propre à l'unmount.
 *
 * Quand on passera à Supabase Realtime, on remplacera ce hook par une
 * subscription sur `MatchBettingPool` (postgres_changes). L'interface publique
 * reste la même → swap transparent côté composants.
 */
import { useEffect, useRef, useState } from 'react';

export type LivePoolData = {
  matchId: string;
  bettingOpen: boolean;
  status: string;
  pool: {
    totalHomePool: number;
    totalDrawPool: number;
    totalAwayPool: number;
    totalPool: number;
    betCount: number;
    uniqueBettors: number;
    housePercentage: number;
    finalTotalPool: number | null;
    lockedAt: string | null;
    settledAt: string | null;
  };
  odds: { home: number | null; draw: number | null; away: number | null };
};

export function useLiveMatchPool(matchId: string | null, intervalMs = 5000) {
  const [data, setData] = useState<LivePoolData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!matchId);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!matchId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/matches/${matchId}/pool`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as LivePoolData;
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (err) {
        if (cancelled || (err as Error).name === 'AbortError') return;
        setError((err as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        await fetchOnce();
      }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchOnce();
      }
    };

    fetchOnce();
    timer = setTimeout(tick, intervalMs);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      abortRef.current?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [matchId, intervalMs]);

  return { data, isLoading, error };
}
