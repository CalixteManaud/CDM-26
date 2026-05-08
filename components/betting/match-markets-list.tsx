import { Layers } from 'lucide-react';

import { MarketCard, type Market } from '@/components/betting/market-card';

export function MatchMarketsList({ markets }: { markets: Market[] }) {
  const open = markets.filter(
    (m) => m.status === 'OPEN' && new Date(m.closesAt).getTime() > Date.now()
  );
  const closed = markets.filter((m) => !open.includes(m));

  if (markets.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-black text-white tracking-tight">Marchés additionnels</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 mt-0.5">
              {open.length} ouvert{open.length > 1 ? 's' : ''} · {closed.length} fermé{closed.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {open.map((m) => (
          <MarketCard key={m.id} market={m} />
        ))}
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
    </div>
  );
}
