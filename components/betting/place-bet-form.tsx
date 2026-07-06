'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Lock, AlertTriangle, Check, Ticket, Zap } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { computeLiveOdds, MAX_BET_POINTS } from '@/lib/utils/odds';
import { cn } from '@/lib/utils';
import { useLiveMatchPool } from '@/hooks/use-live-match-pool';
import { useBetQuota } from '@/hooks/use-bet-quota';
import { PER_MATCH_POINT_QUOTA } from '@/lib/utils/quota';
import { FlapNumber } from '@/components/betting/flap-number';

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
  /** Appelé après un placement réussi (refresh liste éditable + wallet parent). */
  onPlaced?: () => void;
};

const PRESETS = [50, 100, 500, 1000];

/** Au-dessus de ce montant, on demande une confirmation explicite (jeu responsable). */
const LARGE_BET_CONFIRM = 10_000;

type Outcome = 'HOME' | 'DRAW' | 'AWAY';

const OUTCOME_META: Record<Outcome, { idx: string; ring: string; chip: string; text: string }> = {
  HOME: {
    idx: '1',
    ring: 'border-[var(--tote-amber)]/70 bg-[var(--tote-amber)]/[0.08]',
    chip: 'border-[var(--tote-amber)]/50 bg-[var(--tote-amber)]/15 text-[var(--tote-amber)]',
    text: 'text-[var(--tote-amber)]',
  },
  DRAW: {
    idx: 'X',
    ring: 'border-[var(--tote-amber)]/70 bg-[var(--tote-amber)]/[0.08]',
    chip: 'border-[var(--tote-amber)]/50 bg-[var(--tote-amber)]/15 text-[var(--tote-amber)]',
    text: 'text-[var(--tote-amber)]',
  },
  AWAY: {
    idx: '2',
    ring: 'border-[var(--tote-amber)]/70 bg-[var(--tote-amber)]/[0.08]',
    chip: 'border-[var(--tote-amber)]/50 bg-[var(--tote-amber)]/15 text-[var(--tote-amber)]',
    text: 'text-[var(--tote-amber)]',
  },
};

export function PlaceBetForm({
  matchId,
  homeShort,
  awayShort,
  pool,
  userTwitchUsername,
  alreadyBetSite = false,
  onPlaced,
}: Props) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [points, setPoints] = useState<number>(100);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Toute modification de la mise ou de l'issue annule la confirmation en attente.
  useEffect(() => {
    setAwaitingConfirm(false);
  }, [points, outcome]);

  const { data: live } = useLiveMatchPool(matchId);

  const { data: quota, refresh: refreshQuota } = useBetQuota(
    matchId,
    !!isSignedIn && !!userTwitchUsername
  );
  const matchRemaining = quota?.matchRemaining ?? PER_MATCH_POINT_QUOTA;
  const dailyRemaining = quota?.dailyRemaining ?? MAX_BET_POINTS;
  const effectiveMax = Math.max(0, Math.min(MAX_BET_POINTS, matchRemaining, dailyRemaining));
  const quotaExhausted = quota != null && effectiveMax < 1;

  const activePool = live?.pool ?? pool;
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
  const labelByOutcome: Record<Outcome, string> = { HOME: homeShort, DRAW: 'Nul', AWAY: awayShort };

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
        <Lock className="mx-auto mb-2 h-6 w-6 text-white/30" />
        <div className="text-sm text-white/70">Connecte-toi pour parier</div>
        <Link
          href="/sign-in"
          className="ff-board mt-3 inline-flex items-center justify-center rounded-md border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/85 hover:bg-white/5"
        >
          Connexion
        </Link>
      </div>
    );
  }

  if (!userTwitchUsername) {
    return (
      <div className="rounded-2xl border border-[var(--tote-amber)]/30 bg-[var(--tote-amber)]/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tote-amber)]" />
          <div>
            <div className="text-sm font-bold text-[var(--tote-amber)]">Compte Twitch non lié</div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/60">
              Les mises sont débitées sur tes points de chaîne Wizebot — lie ton compte Twitch.
            </p>
            <Link
              href="/profile"
              className="ff-board mt-3 inline-flex items-center rounded-md border border-[var(--tote-amber)]/40 bg-[var(--tote-amber)]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--tote-amber)] hover:bg-[var(--tote-amber)]/15"
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
          ? "Quota de mise épuisé pour aujourd'hui / ce match"
          : `Quota dépassé : max ${effectiveMax.toLocaleString('fr-FR')} pts possible ici`
      );
      return;
    }

    // Jeu responsable : grosse mise → double confirmation.
    if (points >= LARGE_BET_CONFIRM && !awaitingConfirm) {
      setAwaitingConfirm(true);
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
          `Ticket validé : ${points.toLocaleString('fr-FR')} pts · cote ×${Number(json.oddsAtPlacement).toFixed(2)}`
        );
        setOutcome(null);
        refreshQuota();
        onPlaced?.();
        router.replace(router.asPath, undefined, { scroll: false });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
      }
    });
  };

  const expectedReturn =
    outcome && oddsByOutcome[outcome] != null ? Math.floor(points * (oddsByOutcome[outcome] ?? 1)) : null;
  const benefit = expectedReturn != null ? Math.max(0, expectedReturn - points) : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sélecteur d'issue — cellules clapet ambre, sélection qui s'illumine */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="ff-board text-[11px] uppercase tracking-[0.24em] text-white/55">Ton pari</span>
          {live && (
            <span className="ff-board flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-[var(--tote-amber)]/90">
              <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--tote-amber)]" />
              cotes en direct
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {(['HOME', 'DRAW', 'AWAY'] as Outcome[]).map((o) => {
            const meta = OUTCOME_META[o];
            const isActive = outcome === o;
            const oddsValue = oddsByOutcome[o];
            return (
              <motion.button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                aria-pressed={isActive}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: isActive
                    ? '0 0 0 1px rgba(251,191,36,.45), 0 0 26px -6px rgba(251,191,36,.6)'
                    : '0 0 0 0 rgba(0,0,0,0)',
                }}
                transition={{ duration: 0.25 }}
                className={cn(
                  'relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border bg-white/[0.02] px-2 py-4 transition-colors',
                  isActive ? meta.ring : 'border-white/10 hover:border-white/25'
                )}
              >
                <span
                  className={cn(
                    'ff-board absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-black',
                    isActive ? meta.chip : 'border-white/15 text-white/45'
                  )}
                >
                  {meta.idx}
                </span>
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute right-2 top-2"
                    >
                      <Check className={cn('h-4 w-4', meta.text)} />
                    </motion.span>
                  )}
                </AnimatePresence>

                <span className="ff-board mt-2 max-w-full truncate text-[11px] uppercase tracking-[0.14em] text-white/55">
                  {labelByOutcome[o]}
                </span>
                {oddsValue != null ? (
                  <FlapNumber value={oddsValue.toFixed(2)} className="text-xl" />
                ) : (
                  <span className="ff-board text-xl font-black text-white/25">—</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Mise */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="ff-board text-[11px] uppercase tracking-[0.24em] text-white/55">Ta mise</span>
          {quota && (
            <span className="ff-board text-[9px] uppercase tracking-[0.18em] tabular-nums text-white/40">
              reste {matchRemaining.toLocaleString('fr-FR')}/match · {dailyRemaining.toLocaleString('fr-FR')}/jour
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tote-amber)]/80" />
            <Input
              id="bet-points"
              type="number"
              min={1}
              max={Math.max(1, effectiveMax)}
              value={points}
              disabled={quotaExhausted}
              onChange={(e) =>
                setPoints(
                  Math.min(Math.max(1, effectiveMax), Math.max(1, Number.parseInt(e.target.value || '0', 10) || 0))
                )
              }
              className="ff-board border-white/15 bg-white/[0.02] pl-9 text-base font-black tabular-nums text-white disabled:opacity-50"
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
                  'ff-board rounded-lg border px-2.5 text-[11px] font-bold uppercase transition disabled:cursor-not-allowed disabled:opacity-30',
                  points === p
                    ? 'border-[var(--tote-amber)]/60 bg-[var(--tote-amber)]/15 text-[var(--tote-amber)]'
                    : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                )}
              >
                {p >= 1000 ? `${p / 1000}k` : p}
              </button>
            ))}
          </div>
        </div>
        {quotaExhausted && (
          <p className="ff-board text-[10px] uppercase tracking-[0.18em] text-red-300/80">
            Quota épuisé — reviens demain ou tente un autre match.
          </p>
        )}
      </div>

      {/* Le talon de ticket — gain potentiel en chiffres clapet */}
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-black/50 px-5 py-4">
        {/* perforation décorative du talon */}
        <div
          aria-hidden
          className="absolute left-0 top-0 h-full w-2 [background:radial-gradient(circle_at_left,transparent_0_3px,var(--tote-base)_3px)_0_0/8px_10px_repeat-y]"
        />
        <div className="flex items-end justify-between gap-3 pl-2">
          <div className="min-w-0">
            <div className="ff-board text-[10px] uppercase tracking-[0.24em] text-white/45">Gain potentiel</div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              {expectedReturn != null ? (
                <FlapNumber value={expectedReturn.toLocaleString('fr-FR')} className="text-3xl" />
              ) : (
                <span className="ff-board text-3xl font-black text-white/25">—</span>
              )}
              <span className="ff-board text-sm font-bold text-white/40">pts</span>
            </div>
          </div>
          <div className="text-right">
            <div className="ff-board text-[10px] uppercase tracking-[0.24em] text-white/45">Bénéfice</div>
            <div className="ff-board mt-1.5 text-lg font-black tabular-nums text-emerald-300">
              +{benefit.toLocaleString('fr-FR')}
            </div>
          </div>
        </div>
      </div>

      {alreadyBetSite && (
        <div className="ff-board flex items-start gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
          <Zap className="mt-0.5 h-3 w-3 shrink-0 text-[var(--tote-amber)]/70" />
          <span>Tu as déjà un pari sur ce match — tu peux en cumuler d&apos;autres.</span>
        </div>
      )}

      {awaitingConfirm && (
        <div className="flex items-start gap-2 rounded-xl border border-[var(--tote-amber)]/40 bg-[var(--tote-amber)]/[0.06] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tote-amber)]" />
          <div className="text-[11px] leading-relaxed text-white/75">
            <span className="font-bold text-[var(--tote-amber)]">Grosse mise.</span> Tu es sur le
            point de miser <span className="font-black text-white">{points.toLocaleString('fr-FR')} pts</span>.
            Clique à nouveau pour confirmer — mise ferme, non remboursable une fois le match lancé.
          </div>
        </div>
      )}

      <ShimmerButton
        type="submit"
        disabled={isPending || !outcome || quotaExhausted || points > effectiveMax}
        background={
          awaitingConfirm
            ? 'linear-gradient(110deg, #3a1a0a 0%, #7a3f0a 45%, #3a1a0a 100%)'
            : 'linear-gradient(110deg, #1a1a1a 0%, #3a2f0a 45%, #1a1a1a 100%)'
        }
        shimmerColor="#fbbf24"
        className="ff-display w-full px-5 py-4 text-base font-black uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Ticket className="mr-2 h-4 w-4 text-[var(--tote-amber)]" />
        {isPending
          ? 'Validation…'
          : awaitingConfirm
            ? `Confirmer ${points.toLocaleString('fr-FR')} pts`
            : outcome
              ? `Parier ${points.toLocaleString('fr-FR')} pts`
              : 'Choisis une issue'}
      </ShimmerButton>

      <p className="ff-board text-[10px] leading-relaxed text-white/35">
        Mise débitée sur tes points de chaîne Wizebot. Cote figée au placement, gain recalculé au coup
        d&apos;envoi. Modifiable ou annulable 3 min après le placement.
      </p>
    </form>
  );
}
