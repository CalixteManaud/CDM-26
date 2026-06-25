import { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';

import { MarketCard, type Market } from '@/components/betting/market-card';
import {
  MARKET_CATEGORY,
  MARKET_CATEGORY_LABEL,
  MARKET_CATEGORY_ORDER,
  type MarketCategory,
} from '@/lib/utils/markets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function isOpen(m: Market): boolean {
  return m.status === 'OPEN' && new Date(m.closesAt).getTime() > Date.now();
}

function MarketGroup({ markets }: { markets: Market[] }) {
  const open = markets.filter(isOpen);
  const closed = markets.filter((m) => !open.includes(m));

  return (
    <div className="p-3 space-y-3">
      {open.map((m) => (
        <MarketCard key={m.id} market={m} />
      ))}
      {open.length === 0 && closed.length === 0 && (
        <p className="px-3 py-6 text-center text-[11px] font-mono uppercase tracking-[0.25em] text-white/35">
          Aucun marché
        </p>
      )}
      {closed.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none px-3 py-2 text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 hover:text-white/65">
            / {closed.length} marché{closed.length > 1 ? 's' : ''} fermé{closed.length > 1 ? 's' : ''} ↓
          </summary>
          <div className="mt-2 space-y-3">
            {closed.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function MatchMarketsList({ markets }: { markets: Market[] }) {
  // Regroupe les marchés par catégorie, en conservant l'ordre des onglets.
  const byCategory = useMemo(() => {
    const map = new Map<MarketCategory, Market[]>();
    for (const m of markets) {
      const cat = MARKET_CATEGORY[m.type];
      const list = map.get(cat) ?? [];
      list.push(m);
      map.set(cat, list);
    }
    return map;
  }, [markets]);

  const categories = useMemo(
    () => MARKET_CATEGORY_ORDER.filter((c) => (byCategory.get(c)?.length ?? 0) > 0),
    [byCategory]
  );

  const [active, setActive] = useState<MarketCategory>(categories[0] ?? 'RESULT');

  if (markets.length === 0) return null;

  const openCount = markets.filter(isOpen).length;
  const closedCount = markets.length - openCount;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-black text-white tracking-tight">Marchés additionnels</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 mt-0.5">
              {openCount} ouvert{openCount > 1 ? 's' : ''} · {closedCount} fermé{closedCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Un seul onglet → pas de barre, on affiche directement le groupe. */}
      {categories.length <= 1 ? (
        <MarketGroup markets={byCategory.get(categories[0]) ?? markets} />
      ) : (
        <Tabs
          value={active}
          onValueChange={(v) => setActive(v as MarketCategory)}
          className="gap-0"
        >
          <div className="px-3 pt-3">
            <TabsList className="w-full justify-start gap-1 bg-black/40 border border-white/10 h-auto p-1 rounded-xl flex-wrap">
              {categories.map((cat) => {
                const count = byCategory.get(cat)?.length ?? 0;
                return (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-white/55 data-[state=active]:bg-white/10 data-[state=active]:text-white"
                  >
                    {MARKET_CATEGORY_LABEL[cat]}
                    <span className="ml-1.5 text-white/35 tabular-nums">{count}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-0">
              <MarketGroup markets={byCategory.get(cat) ?? []} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
