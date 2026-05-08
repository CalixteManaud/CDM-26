import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import {
  Search,
  Lock,
  Coins,
  Loader2,
  ArrowRight,
  Trophy,
  Star,
  Users,
  X,
  Layers,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { computeMarketOdds, isMarketOpen, MARKET_LABEL } from '@/lib/utils/markets';
import type { Market } from '@/components/betting/market-card';
import { useBetSlip } from '@/lib/contexts/bet-slip-context';

const TYPE_ICON: Record<string, { Icon: typeof Trophy; cls: string }> = {
  TOURNAMENT_TOP_SCORER: { Icon: Star, cls: 'text-yellow-300' },
  TOURNAMENT_MVP: { Icon: Trophy, cls: 'text-purple-300' },
  TOURNAMENT_WINNER: { Icon: Trophy, cls: 'text-emerald-300' },
};

const PRESETS = [50, 100, 500, 1000, 5000];

type Pool = Market['pools'][number];

function poolDisplayName(pool: Pool, type: Market['type']): string {
  if (type === 'TOURNAMENT_WINNER') {
    return pool.team?.name ?? pool.outcomeKey;
  }
  if (pool.player) {
    return pool.player.user?.username || pool.player.user?.name || `#${pool.player.jerseyNumber}`;
  }
  return pool.outcomeKey;
}

function poolSubLabel(pool: Pool, type: Market['type']): string | null {
  if (type === 'TOURNAMENT_WINNER') return pool.team?.shortName ?? null;
  return pool.player?.team?.shortName ?? null;
}

function poolImage(pool: Pool): string | null {
  if (pool.team?.logo) return pool.team.logo;
  if (pool.player?.user?.avatar) return pool.player.user.avatar;
  return null;
}

export function TournamentMarketCard({ market }: { market: Market }) {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const slip = useBetSlip();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Pool | null>(null);
  const [amount, setAmount] = useState<string>('100');
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const inSlip = slip.hasLeg(market.id);

  const odds = useMemo(
    () => computeMarketOdds(market.pools, Number(market.housePercentage)),
    [market.pools, market.housePercentage]
  );
  const totalPool = market.pools.reduce((s, p) => s + p.totalPool, 0);
  const totalBets = market.pools.reduce((s, p) => s + p.betCount, 0);
  const open_ = isMarketOpen({ status: market.status, closesAt: market.closesAt });
  const meta = TYPE_ICON[market.type] ?? { Icon: Trophy, cls: 'text-white/65' };
  const Icon = meta.Icon;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = market.pools;
    if (q) {
      list = list.filter((p) => {
        const name = poolDisplayName(p, market.type).toLowerCase();
        const sub = poolSubLabel(p, market.type)?.toLowerCase() ?? '';
        return name.includes(q) || sub.includes(q);
      });
    }
    // Sort by totalPool desc (favorites first), then by name asc
    return [...list].sort((a, b) => {
      if (b.totalPool !== a.totalPool) return b.totalPool - a.totalPool;
      return poolDisplayName(a, market.type).localeCompare(poolDisplayName(b, market.type));
    });
  }, [market.pools, market.type, search]);

  const visible = showAll || search ? filtered : filtered.slice(0, 12);

  const onSubmit = async () => {
    if (!selected) return;
    const amt = Number.parseInt(amount, 10);
    if (!Number.isFinite(amt) || amt < 50) {
      toast.error('Mise minimum : 50 pts');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/markets/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: market.id,
          outcomeKey: selected.outcomeKey,
          points: amt,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur');
        return;
      }
      toast.success(`Pari placé : ${amt} pts sur ${poolDisplayName(selected, market.type)}`);
      setSelected(null);
      router.replace(router.asPath, undefined, { scroll: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOdds = selected ? odds[selected.outcomeKey] : null;
  const stake = Number.parseInt(amount, 10);
  const potential =
    selectedOdds && Number.isFinite(stake) ? Math.floor(stake * selectedOdds) : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Icon className={cn('w-4 h-4', meta.cls)} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-black text-white tracking-tight">
              {MARKET_LABEL[market.type]}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 mt-0.5">
              {totalBets} paris · {totalPool.toLocaleString('fr-FR')} pts · {market.pools.length} options
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inSlip && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-purple-500/30 bg-purple-500/5 text-[10px] font-mono uppercase tracking-[0.22em] text-purple-300">
              <Check className="w-3 h-3" /> Combiné
            </span>
          )}
          {!open_ ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/15 text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">
              <Lock className="w-3 h-3" /> Fermé
            </span>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400/40 w-44"
              />
            </div>
          )}
        </div>
      </div>

      <ul className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
        {visible.length === 0 ? (
          <li className="px-4 py-8 text-center text-[11px] font-mono uppercase tracking-[0.22em] text-white/40">
            / aucune option
          </li>
        ) : (
          visible.map((p, i) => {
            const o = odds[p.outcomeKey];
            const sub = poolSubLabel(p, market.type);
            const img = poolImage(p);
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.025] group"
              >
                <span className="text-[10px] font-mono text-white/30 tabular-nums w-6 text-right">
                  {i + 1}
                </span>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={poolDisplayName(p, market.type)}
                    className="w-9 h-9 rounded-full object-cover bg-white/5 ring-2 ring-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/5 ring-2 ring-white/10 flex items-center justify-center text-[10px] font-black text-white/55 shrink-0">
                    {poolDisplayName(p, market.type).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-white tracking-tight truncate">
                    {poolDisplayName(p, market.type)}
                  </div>
                  {sub && (
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35 mt-0.5 truncate">
                      {sub}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      'text-sm font-black tabular-nums tracking-tight',
                      o == null ? 'text-white/30' : 'text-yellow-300'
                    )}
                  >
                    {o == null ? '—' : `×${o.toFixed(2)}`}
                  </div>
                  <div className="text-[9px] font-mono text-white/35 tabular-nums leading-none mt-0.5">
                    {p.totalPool.toLocaleString('fr-FR')} pts
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!open_ || !isSignedIn}
                  onClick={() => {
                    if (!isSignedIn) {
                      toast.info('Connecte-toi pour parier');
                      return;
                    }
                    setSelected(p);
                  }}
                  className="text-[10px] font-mono uppercase tracking-[0.22em] font-black text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 disabled:text-white/20"
                >
                  Parier
                </Button>
              </li>
            );
          })
        )}
      </ul>

      {!showAll && !search && filtered.length > visible.length && (
        <div className="border-t border-white/5 px-4 py-2.5 flex items-center justify-center">
          <button
            onClick={() => setShowAll(true)}
            className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/45 hover:text-white"
          >
            / voir les {filtered.length - visible.length} restants ↓
          </button>
        </div>
      )}

      {/* Bet dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="bg-black border-white/15 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Icon className={cn('w-5 h-5', meta.cls)} />
              {MARKET_LABEL[market.type]}
            </DialogTitle>
            <DialogDescription className="text-white/55 font-mono text-xs uppercase tracking-[0.22em]">
              / {selected ? poolDisplayName(selected, market.type) : ''}{' '}
              {selectedOdds ? `· ×${selectedOdds.toFixed(2)}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 font-bold">
                / Mise (pts)
              </label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  min={50}
                  step={50}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono text-lg font-black bg-white/5 border-white/15"
                />
                <Coins className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className="px-3 py-1.5 rounded border border-white/10 text-[11px] font-mono uppercase tracking-[0.22em] text-white/65 hover:border-yellow-400/30 hover:text-yellow-300"
                  >
                    {preset.toLocaleString('fr-FR')}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/3 p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                  Gain potentiel
                </div>
                <div className="text-2xl font-black text-emerald-300 tabular-nums">
                  {potential.toLocaleString('fr-FR')} pts
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-white/30" />
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                  Bénéfice
                </div>
                <div className="text-lg font-black text-yellow-300 tabular-nums">
                  +{Math.max(0, potential - (Number.isFinite(stake) ? stake : 0)).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (!selected || selectedOdds == null) return;
                  slip.addLeg({
                    marketId: market.id,
                    outcomeKey: selected.outcomeKey,
                    marketType: market.type,
                    marketLabel: MARKET_LABEL[market.type],
                    outcomeLabel: poolDisplayName(selected, market.type),
                    odds: selectedOdds,
                    context: market.tournament?.name,
                  });
                  toast.success('Ajouté au combiné');
                  setSelected(null);
                }}
                className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 text-[11px] font-mono uppercase tracking-[0.22em]"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                + Combiné
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelected(null)}
                  className="text-white/65 hover:text-white text-[11px]"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Annuler
                </Button>
                <ShimmerButton
                  onClick={onSubmit}
                  disabled={submitting}
                  background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                  shimmerColor="#ffffff"
                  className="px-5 py-2.5 font-black uppercase tracking-[0.18em] text-[11px] disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Parier {Number.isFinite(stake) ? stake.toLocaleString('fr-FR') : 0} pts
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </>
                  )}
                </ShimmerButton>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
