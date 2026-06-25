'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Coins, Lock, AlertTriangle, Info, Check, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { computeLiveOdds } from '@/lib/utils/odds';
import { cn } from '@/lib/utils';
import { useLiveMatchPool } from '@/hooks/use-live-match-pool';
import { MAX_BET_POINTS } from '@/lib/utils/odds';
import { useBetQuota } from '@/hooks/use-bet-quota';
import { PER_MATCH_POINT_QUOTA } from '@/lib/utils/quota';

type Pool = {
  totalHomePool: number;
  totalDrawPool: number;
  totalAwayPool: number;
  housePercentage: { toString(): string } | number;
};

type Props = {
  matchId: string;
  homeShort: string;
  awayShort: string;
  pool: Pool | null;
  /** twitchUsername lié de l'user courant (null si pas lié) */
  userTwitchUsername: string | null;
  /** True si l'user a déjà placé au moins un pari sur ce match */
  alreadyBetSite?: boolean;
};

const PRESETS = [50, 100, 500, 1000];

type Outcome = 'HOME' | 'DRAW' | 'AWAY';

const OUTCOME_META: Record<
  Outcome,
  { idx: string; label: string; base: string; active: string; chip: string; text: string }
> = {
  HOME: {
    idx: '1',
    label: 'Domicile',
    base: 'border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04]',
    active: 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30',
    chip: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    text: 'text-emerald-300',
  },
  DRAW: {
    idx: 'X',
    label: 'Nul',
    base: 'border-white/10 hover:border-yellow-500/40 hover:bg-yellow-500/[0.04]',
    active: 'border-yellow-500/60 bg-yellow-500/10 ring-1 ring-yellow-500/30',
    chip: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300',
    text: 'text-yellow-300',
  },
  AWAY: {
    idx: '2',
    label: 'Extérieur',
    base: 'border-white/10 hover:border-red-500/40 hover:bg-red-500/[0.04]',
    active: 'border-red-500/60 bg-red-500/10 ring-1 ring-red-500/30',
    chip: 'border-red-500/40 bg-red-500/15 text-red-300',
    text: 'text-red-300',
  },
};

export function PlaceBetForm({
  matchId,
  homeShort,
  awayShort,
  pool,
  userTwitchUsername,
  alreadyBetSite = false,
}: Props) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [points, setPoints] = useState<number>(100);
  const [isPending, startTransition] = useTransition();

  // Live pool : polling 5s sur /api/matches/[id]/pool. L'endpoint est cache CDN
  // (max-age=2 + stale-while-revalidate=4) → Vercel absorbe la charge même à 1k
  // clients. On prend en priorité la data live, fallback sur le snapshot SSR.
  const { data: live } = useLiveMatchPool(matchId);

  // Quota restant (jour + ce match). Sert au plafond de mise + à l'affichage.
  const { data: quota, refresh: refreshQuota } = useBetQuota(
    matchId,
    !!isSignedIn && !!userTwitchUsername
  );
  const matchRemaining = quota?.matchRemaining ?? PER_MATCH_POINT_QUOTA;
  const dailyRemaining = quota?.dailyRemaining ?? MAX_BET_POINTS;
  const effectiveMax = Math.max(0, Math.min(MAX_BET_POINTS, matchRemaining, dailyRemaining));
  const quotaExhausted = quota != null && effectiveMax < 1;

  const activePool = live?.pool ?? pool;
  const totalPool = live
    ? live.pool.totalPool
    : pool
      ? pool.totalHomePool + pool.totalDrawPool + pool.totalAwayPool
      : 0;

  const odds = live
    ? live.odds
    : activePool
      ? computeLiveOdds(activePool)
      : { home: null, draw: null, away: null };
  const oddsByOutcome: Record<Outcome, number | null> = {
    HOME: odds.home,
    DRAW: odds.draw,
    AWAY: odds.away,
  };

  const labelByOutcome: Record<Outcome, string> = {
    HOME: homeShort,
    DRAW: 'Nul',
    AWAY: awayShort,
  };

  if (!isSignedIn) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-5 text-center">
        <Lock className="h-6 w-6 text-white/30 mx-auto mb-2" />
        <div className="text-sm text-white/70">Connecte-toi pour parier depuis le site</div>
        <Link
          href="/sign-in"
          className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-md border border-white/15 text-xs font-mono uppercase tracking-[0.22em] text-white/85 hover:bg-white/5"
        >
          Connexion
        </Link>
      </div>
    );
  }

  if (!userTwitchUsername) {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
        <div className="flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-300 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-yellow-200">Compte Twitch non lié</div>
            <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
              Les mises sont débitées sur tes points de chaîne Wizebot — il faut donc lier ton compte Twitch.
            </p>
            <Link
              href="/profile"
              className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-[10px] font-mono uppercase tracking-[0.22em] hover:bg-yellow-500/15"
            >
              Lier mon compte → /profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!outcome) {
      toast.error('Choisis une issue');
      return;
    }
    if (!Number.isInteger(points) || points < 1) {
      toast.error('Mise invalide');
      return;
    }
    if (points > effectiveMax) {
      toast.error(
        effectiveMax < 1
          ? 'Quota de mise épuisé pour aujourd\'hui / ce match'
          : `Quota dépassé : max ${effectiveMax.toLocaleString('fr-FR')} pts possible ici`
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/bets/place', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, outcome, points }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Erreur lors du pari');

        toast.success(
          `Pari placé : ${points.toLocaleString('fr-FR')} pts · cote ×${Number(json.oddsAtPlacement).toFixed(2)}`,
        );
        setOutcome(null);
        refreshQuota();
        router.replace(router.asPath, undefined, { scroll: false });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
      }
    });
  };

  const expectedReturn =
    outcome && oddsByOutcome[outcome] != null
      ? Math.floor(points * (oddsByOutcome[outcome] ?? 1))
      : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-5"
    >
      {/* Odds board — 1 · X · 2 : cote ET sélection en un seul geste */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/55">
            Choisis une issue
          </span>
          {live && (
            <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-emerald-300/80">
              <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              cotes en direct
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-2.5">
          {(['HOME', 'DRAW', 'AWAY'] as Outcome[]).map((o) => {
            const meta = OUTCOME_META[o];
            const isActive = outcome === o;
            const oddsValue = oddsByOutcome[o];
            return (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                aria-pressed={isActive}
                className={cn(
                  'group relative flex flex-col items-center justify-center gap-2 rounded-xl border bg-white/[0.02] px-2 py-4 transition-all',
                  isActive ? meta.active : meta.base
                )}
              >
                <span
                  className={cn(
                    'absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-md border text-[10px] font-mono font-black',
                    isActive ? meta.chip : 'border-white/15 text-white/45'
                  )}
                >
                  {meta.idx}
                </span>
                {isActive && <Check className={cn('absolute top-2.5 right-2.5 w-3.5 h-3.5', meta.text)} />}
                <span className="mt-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/55 truncate max-w-full">
                  {labelByOutcome[o]}
                </span>
                <span className={cn('text-2xl font-black tabular-nums tracking-tight', isActive ? meta.text : 'text-white')}>
                  {oddsValue != null ? oddsValue.toFixed(2) : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stake */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="bet-points" className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/55">
            Ta mise
          </Label>
          {quota && (
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/40 tabular-nums">
              reste {matchRemaining.toLocaleString('fr-FR')}/match · {dailyRemaining.toLocaleString('fr-FR')}/jour
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400/70 pointer-events-none" />
            <Input
              id="bet-points"
              type="number"
              min={1}
              max={Math.max(1, effectiveMax)}
              value={points}
              disabled={quotaExhausted}
              onChange={(e) =>
                setPoints(
                  Math.min(
                    Math.max(1, effectiveMax),
                    Math.max(1, Number.parseInt(e.target.value || '0', 10) || 0)
                  )
                )
              }
              className="pl-9 bg-white/[0.02] border-white/15 text-white tabular-nums font-black text-base disabled:opacity-50"
            />
          </div>
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={p > effectiveMax}
                onClick={() => setPoints(p)}
                className={cn(
                  'px-2.5 rounded-lg border text-[11px] font-mono font-bold uppercase tracking-wider transition disabled:opacity-30 disabled:cursor-not-allowed',
                  points === p
                    ? 'bg-yellow-500/15 border-yellow-500/60 text-yellow-300'
                    : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                )}
              >
                {p >= 1000 ? `${p / 1000}k` : p}
              </button>
            ))}
          </div>
        </div>
        {quotaExhausted && (
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-red-300/80">
            Quota épuisé — reviens demain ou tente un autre match.
          </p>
        )}
      </div>

      {/* Payout readout */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">Gain potentiel</div>
          <div className="text-2xl font-black tabular-nums text-emerald-300 leading-none mt-1">
            {expectedReturn != null ? expectedReturn.toLocaleString('fr-FR') : '—'}
            <span className="text-sm text-white/40 font-bold ml-1">pts</span>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">Bénéfice</div>
          <div className="text-lg font-black tabular-nums text-yellow-300 leading-none mt-1">
            +{expectedReturn != null ? Math.max(0, expectedReturn - points).toLocaleString('fr-FR') : '0'}
          </div>
        </div>
      </div>

      {alreadyBetSite && (
        <div className="flex gap-2 items-start text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
          <Info className="h-3 w-3 text-yellow-400/70 flex-shrink-0 mt-0.5" />
          <span>Tu as déjà un pari sur ce match — tu peux en cumuler d&apos;autres.</span>
        </div>
      )}

      <ShimmerButton
        type="submit"
        disabled={isPending || !outcome || quotaExhausted || points > effectiveMax}
        background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
        shimmerColor="#ffffff"
        className="w-full px-5 py-3.5 font-black uppercase tracking-[0.18em] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Coins className="w-4 h-4 mr-2" />
        {isPending
          ? 'Placement…'
          : outcome
          ? `Parier ${points.toLocaleString('fr-FR')} pts`
          : 'Choisis une issue'}
      </ShimmerButton>

      <p className="text-[10px] text-white/35 leading-relaxed">
        Mise débitée sur tes points de chaîne Wizebot. La cote affichée est figée au placement ; le
        gain final est recalculé au coup d&apos;envoi.
      </p>
    </form>
  );
}
