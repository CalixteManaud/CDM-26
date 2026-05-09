'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Coins, Lock, AlertTriangle, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { computeLiveOdds } from '@/lib/utils/odds';
import { cn } from '@/lib/utils';

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

const OUTCOME_META: Record<Outcome, { label: string; cls: string; activeCls: string }> = {
  HOME: {
    label: 'Domicile',
    cls: 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5',
    activeCls: 'bg-emerald-500/15 border-emerald-500 text-emerald-300',
  },
  DRAW: {
    label: 'Nul',
    cls: 'text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/5',
    activeCls: 'bg-yellow-500/15 border-yellow-500 text-yellow-300',
  },
  AWAY: {
    label: 'Extérieur',
    cls: 'text-red-400 border-red-500/30 hover:bg-red-500/5',
    activeCls: 'bg-red-500/15 border-red-500 text-red-300',
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

  const odds = pool
    ? computeLiveOdds(pool)
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
      className="rounded-xl border border-white/10 bg-black/30 p-5 space-y-4"
    >
      <div>
        <div className="text-[11px] font-mono uppercase tracking-[0.3em] font-bold text-emerald-400 mb-3">
          / placer un pari
        </div>

        {/* Outcome picker */}
        <div className="grid grid-cols-3 gap-2">
          {(['HOME', 'DRAW', 'AWAY'] as Outcome[]).map((o) => {
            const meta = OUTCOME_META[o];
            const isActive = outcome === o;
            const oddsValue = oddsByOutcome[o];
            return (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border bg-white/[0.02] px-3 py-3 transition',
                  isActive ? meta.activeCls : meta.cls,
                )}
              >
                <span className="text-[9px] uppercase tracking-[0.24em] font-mono opacity-70">{o}</span>
                <span className="text-lg font-black tabular-nums">
                  {oddsValue != null ? oddsValue.toFixed(2) : '—'}
                </span>
                <span className="text-[10px] font-mono uppercase opacity-60 truncate max-w-full">
                  {labelByOutcome[o]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Points input */}
      <div>
        <Label htmlFor="bet-points" className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/50">
          Mise (points de chaîne)
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="bet-points"
            type="number"
            min={1}
            max={1_000_000}
            value={points}
            onChange={(e) => setPoints(Math.max(1, Number.parseInt(e.target.value || '0', 10) || 0))}
            className="bg-white/[0.02] border-white/15 text-white tabular-nums font-bold"
          />
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPoints(p)}
                className={cn(
                  'px-2.5 rounded-md border text-[10px] font-mono uppercase tracking-wider transition',
                  points === p
                    ? 'bg-yellow-500/15 border-yellow-500 text-yellow-300'
                    : 'border-white/10 text-white/60 hover:bg-white/5',
                )}
              >
                {p >= 1000 ? `${p / 1000}k` : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Estimated return */}
      <div className="flex items-center justify-between rounded-md border border-dashed border-white/10 bg-white/[0.02] px-3 py-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">
          Gain estimé (cote actuelle)
        </span>
        <span className="text-base font-black tabular-nums text-yellow-300">
          {expectedReturn != null ? `${expectedReturn.toLocaleString('fr-FR')} pts` : '—'}
        </span>
      </div>

      {alreadyBetSite && (
        <div className="flex gap-2 items-start text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">
          <Info className="h-3 w-3 text-yellow-400/70 flex-shrink-0 mt-0.5" />
          <span>tu as déjà un pari sur ce match — tu peux en placer d&apos;autres</span>
        </div>
      )}

      <ShimmerButton
        type="submit"
        disabled={isPending || !outcome}
        background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
        shimmerColor="#ffffff"
        className="w-full px-5 py-3 font-black uppercase tracking-[0.18em] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Coins className="w-4 h-4 mr-2" />
        {isPending ? 'Placement…' : `Parier ${points.toLocaleString('fr-FR')} pts`}
      </ShimmerButton>

      <p className="text-[10px] text-white/35 leading-relaxed font-mono">
        Le débit est effectué sur tes points de chaîne Wizebot avant le placement. Cote affichée = cote au
        moment du placement, payout final recalculé au coup d&apos;envoi.
      </p>
    </form>
  );
}
