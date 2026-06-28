'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { MatchMarketsList } from '@/components/betting/match-markets-list';
import type { Market } from '@/components/betting/market-card';

/**
 * Charge à la demande les marchés additionnels d'un match (appelé quand le dialog
 * de pari s'ouvre sur /paris), puis délègue à MatchMarketsList. `refreshSignal`
 * force un re-fetch après un placement pour mettre à jour pools/cotes.
 */
export function MatchMarketsLazy({
  matchId,
  refreshSignal = 0,
}: {
  matchId: string;
  refreshSignal?: number;
}) {
  const [markets, setMarkets] = useState<Market[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}/markets`);
        if (!res.ok) {
          if (!cancelled) setMarkets([]);
          return;
        }
        const json = (await res.json()) as { markets: Market[] };
        if (!cancelled) setMarkets(json.markets ?? []);
      } catch {
        if (!cancelled) setMarkets([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId, refreshSignal]);

  if (markets === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-6 text-[11px] font-mono uppercase tracking-[0.22em] text-white/40">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement des marchés…
      </div>
    );
  }

  if (markets.length === 0) return null;

  return <MatchMarketsList markets={markets} />;
}
