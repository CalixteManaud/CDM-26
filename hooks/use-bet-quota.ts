import { useCallback, useEffect, useState } from 'react';

export type BetQuota = {
  dailyQuota: number;
  dailySpent: number;
  dailyRemaining: number;
  matchQuota?: number;
  matchSpent?: number;
  matchRemaining?: number;
};

/**
 * Récupère le quota de mise restant de l'user (jour + match optionnel).
 *
 * @param matchId  pour obtenir aussi le restant sur ce match précis
 * @param auto     fetch au montage (true) ou uniquement sur `refresh()` manuel
 *                 (false — utile pour un formulaire en dialog ouvert à la demande)
 */
export function useBetQuota(matchId?: string | null, auto = true) {
  const [data, setData] = useState<BetQuota | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const q = matchId ? `?matchId=${encodeURIComponent(matchId)}` : '';
      const res = await fetch(`/api/bets/quota${q}`);
      if (!res.ok) {
        setData(null);
        return;
      }
      setData((await res.json()) as BetQuota);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (auto) refresh();
  }, [auto, refresh]);

  return { data, loading, refresh };
}
