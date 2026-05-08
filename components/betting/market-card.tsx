import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import {
  TrendingUp,
  Lock,
  Coins,
  Loader2,
  ArrowRight,
  Trophy,
  Goal,
  Users,
  Star,
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { computeMarketOdds, isMarketOpen, MARKET_LABEL } from '@/lib/utils/markets';
import { useBetSlip } from '@/lib/contexts/bet-slip-context';

type Pool = {
  id: string;
  outcomeKey: string;
  totalPool: number;
  betCount: number;
  player?: {
    id: string;
    jerseyNumber: number;
    user: { name: string; username: string | null; avatar: string | null } | null;
    team: { id: string; shortName: string; logo: string | null } | null;
  } | null;
  team?: { id: string; name: string; shortName: string; logo: string | null } | null;
};

export type Market = {
  id: string;
  type:
    | 'MATCH_EXACT_SCORE'
    | 'MATCH_TOTAL_GOALS'
    | 'MATCH_BTTS'
    | 'TOURNAMENT_TOP_SCORER'
    | 'TOURNAMENT_MVP'
    | 'TOURNAMENT_WINNER';
  status: string;
  param: string | null;
  closesAt: string | Date;
  housePercentage: number | { toString(): string };
  pools: Pool[];
  match?: {
    id: string;
    matchDate: string | Date;
    homeTeam: { shortName: string };
    awayTeam: { shortName: string };
    tournament: { id: string; name: string };
  } | null;
  tournament?: { id: string; name: string } | null;
};

function marketContextLabel(market: Market): string | null {
  if (market.match) {
    return `${market.match.homeTeam.shortName} vs ${market.match.awayTeam.shortName}`;
  }
  if (market.tournament) {
    return market.tournament.name;
  }
  return null;
}

const PRESETS = [50, 100, 500, 1000];

const TYPE_ICON: Record<Market['type'], { Icon: typeof Goal; cls: string }> = {
  MATCH_EXACT_SCORE: { Icon: Goal, cls: 'text-emerald-300' },
  MATCH_TOTAL_GOALS: { Icon: TrendingUp, cls: 'text-yellow-300' },
  MATCH_BTTS: { Icon: Users, cls: 'text-purple-300' },
  TOURNAMENT_TOP_SCORER: { Icon: Star, cls: 'text-yellow-300' },
  TOURNAMENT_MVP: { Icon: Trophy, cls: 'text-purple-300' },
  TOURNAMENT_WINNER: { Icon: Trophy, cls: 'text-emerald-300' },
};

function outcomeLabel(market: Market, pool: Pool): string {
  if (market.type === 'MATCH_BTTS') return pool.outcomeKey === 'YES' ? 'Oui' : 'Non';
  if (market.type === 'MATCH_TOTAL_GOALS') {
    return `${pool.outcomeKey === 'OVER' ? '+' : '−'} ${market.param ?? ''}`;
  }
  if (market.type === 'MATCH_EXACT_SCORE') {
    return pool.outcomeKey === 'OTHER' ? 'Autre' : pool.outcomeKey.replace('-', ' – ');
  }
  if (pool.player) {
    const p = pool.player;
    return p.user?.username || p.user?.name || `#${p.jerseyNumber}`;
  }
  if (pool.team) return pool.team.shortName;
  return pool.outcomeKey;
}

function outcomeSubLabel(market: Market, pool: Pool): string | null {
  if (market.type === 'TOURNAMENT_TOP_SCORER' || market.type === 'TOURNAMENT_MVP') {
    return pool.player?.team?.shortName ?? null;
  }
  return null;
}

export function MarketCard({ market }: { market: Market }) {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const slip = useBetSlip();
  const [open, setOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('100');
  const [submitting, setSubmitting] = useState(false);
  const inSlip = slip.hasLeg(market.id);

  const odds = useMemo(
    () => computeMarketOdds(market.pools, Number(market.housePercentage)),
    [market.pools, market.housePercentage]
  );
  const totalPool = market.pools.reduce((s, p) => s + p.totalPool, 0);
  const totalBets = market.pools.reduce((s, p) => s + p.betCount, 0);
  const open_ = isMarketOpen({ status: market.status, closesAt: market.closesAt });
  const meta = TYPE_ICON[market.type];
  const Icon = meta.Icon;

  // Score grid layout for MATCH_EXACT_SCORE
  const isScoreGrid = market.type === 'MATCH_EXACT_SCORE';

  const onSubmit = async () => {
    if (!selectedOutcome) return;
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
          outcomeKey: selectedOutcome,
          points: amt,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur');
        return;
      }
      toast.success(`Pari placé : ${amt} pts sur ${outcomeLabel(market, market.pools.find((p) => p.outcomeKey === selectedOutcome)!)}`);
      setOpen(false);
      setSelectedOutcome(null);
      router.replace(router.asPath, undefined, { scroll: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPool = selectedOutcome
    ? market.pools.find((p) => p.outcomeKey === selectedOutcome)
    : null;
  const selectedOdds = selectedOutcome ? odds[selectedOutcome] : null;
  const stake = Number.parseInt(amount, 10);
  const potential = selectedOdds && Number.isFinite(stake) ? Math.floor(stake * selectedOdds) : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Icon className={cn('w-4 h-4', meta.cls)} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-black text-white tracking-tight">
              {MARKET_LABEL[market.type]}
              {market.param && <span className="text-white/40 ml-1.5 text-xs font-mono">/ ligne {market.param}</span>}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 mt-0.5">
              {totalBets} paris · {totalPool.toLocaleString('fr-FR')} pts
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inSlip && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-purple-500/30 bg-purple-500/5 text-[10px] font-mono uppercase tracking-[0.22em] text-purple-300">
              <Check className="w-3 h-3" /> Dans le combiné
            </span>
          )}
          {!open_ && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/15 text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">
              <Lock className="w-3 h-3" /> Fermé
            </span>
          )}
        </div>
      </div>

      {/* Outcomes */}
      <div className={cn('p-3', isScoreGrid && 'p-2')}>
        <div
          className={cn(
            'grid gap-2',
            isScoreGrid
              ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6'
              : market.pools.length <= 2
              ? 'grid-cols-2'
              : market.pools.length <= 4
              ? 'grid-cols-2 sm:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          )}
        >
          {market.pools.map((p) => {
            const o = odds[p.outcomeKey];
            const sub = outcomeSubLabel(market, p);
            return (
              <Dialog
                key={p.id}
                open={open && selectedOutcome === p.outcomeKey}
                onOpenChange={(v) => {
                  if (!v) {
                    setOpen(false);
                    setSelectedOutcome(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <button
                    type="button"
                    disabled={!open_ || !isSignedIn}
                    onClick={() => {
                      if (!isSignedIn) {
                        toast.info('Connecte-toi pour parier');
                        return;
                      }
                      setSelectedOutcome(p.outcomeKey);
                      setOpen(true);
                    }}
                    className={cn(
                      'group relative flex flex-col items-center justify-center gap-1 rounded-lg border bg-black/40 px-2 py-3 transition-all',
                      open_ && isSignedIn
                        ? 'border-white/10 hover:border-yellow-400/50 hover:bg-yellow-500/[0.04]'
                        : 'border-white/5 opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/55 leading-none truncate max-w-full">
                      {outcomeLabel(market, p)}
                    </span>
                    {sub && (
                      <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/35 leading-none truncate max-w-full">
                        {sub}
                      </span>
                    )}
                    <span
                      className={cn(
                        'text-base font-black tabular-nums tracking-tight',
                        o == null ? 'text-white/30' : 'text-yellow-300 group-hover:text-yellow-200'
                      )}
                    >
                      {o == null ? '—' : `×${o.toFixed(2)}`}
                    </span>
                    <span className="text-[9px] font-mono uppercase text-white/30 tabular-nums leading-none">
                      {p.totalPool > 0 ? `${p.totalPool.toLocaleString('fr-FR')}` : '0'} pts
                    </span>
                  </button>
                </DialogTrigger>

                {/* Bet form dialog */}
                <DialogContent className="bg-black border-white/15 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                      <Icon className={cn('w-5 h-5', meta.cls)} />
                      {MARKET_LABEL[market.type]}
                    </DialogTitle>
                    <DialogDescription className="text-white/55 font-mono text-xs uppercase tracking-[0.22em]">
                      / {outcomeLabel(market, p)} {sub ? `(${sub})` : ''}{' '}
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
                      <div className="flex items-center gap-2 mt-2">
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
                          if (selectedOdds == null) return;
                          slip.addLeg({
                            marketId: market.id,
                            outcomeKey: p.outcomeKey,
                            marketType: market.type,
                            marketLabel: MARKET_LABEL[market.type],
                            outcomeLabel: outcomeLabel(market, p),
                            odds: selectedOdds,
                            context: marketContextLabel(market) ?? undefined,
                          });
                          toast.success('Ajouté au combiné');
                          setOpen(false);
                          setSelectedOutcome(null);
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
                          onClick={() => {
                            setOpen(false);
                            setSelectedOutcome(null);
                          }}
                          className="text-white/65 hover:text-white text-[11px]"
                        >
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
