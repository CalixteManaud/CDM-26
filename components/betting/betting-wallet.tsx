'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, Wallet, CalendarClock, RefreshCw, Link2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { DAILY_POINT_QUOTA } from '@/lib/utils/quota';

type Props = {
  /** Incrémenté par le parent après un pari/modif pour rafraîchir solde + quota. */
  refreshSignal?: number;
  className?: string;
};

export function BettingWallet({ refreshSignal = 0, className }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [twitchLinked, setTwitchLinked] = useState<boolean>(true);
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, quotaRes] = await Promise.all([
        fetch('/api/profile/balance'),
        fetch('/api/bets/quota'),
      ]);

      if (balRes.status === 400) {
        setTwitchLinked(false);
      } else if (balRes.ok) {
        setTwitchLinked(true);
        const bal = (await balRes.json()) as { balance: number };
        setBalance(typeof bal.balance === 'number' ? bal.balance : null);
      }

      if (quotaRes.ok) {
        const q = (await quotaRes.json()) as { dailyRemaining: number };
        setDailyRemaining(q.dailyRemaining);
      }
    } catch {
      // silencieux — le band reste affiché avec des tirets
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  if (!twitchLinked) {
    return (
      <div className={cn('rounded-2xl border border-yellow-500/30 bg-yellow-500/[0.04] px-5 py-4 flex items-center justify-between gap-4 flex-wrap', className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 grid place-items-center shrink-0">
            <Link2 className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <div className="text-sm font-bold text-yellow-100">Lie ton compte Twitch pour parier</div>
            <p className="text-[11px] text-white/55 mt-0.5">Les mises sont débitées sur tes points de chaîne Wizebot.</p>
          </div>
        </div>
        <Link
          href="/profile"
          className="inline-flex items-center px-4 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-[11px] font-mono uppercase tracking-[0.18em] hover:bg-yellow-500/15 transition"
        >
          Lier mon compte
        </Link>
      </div>
    );
  }

  const dailyPct =
    dailyRemaining != null ? Math.max(0, Math.min(100, (dailyRemaining / DAILY_POINT_QUOTA) * 100)) : 0;
  const dailySpent = dailyRemaining != null ? DAILY_POINT_QUOTA - dailyRemaining : null;

  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden', className)}>
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
        {/* Solde Wizebot */}
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 grid place-items-center shrink-0">
            <Wallet className="w-5 h-5 text-purple-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase tracking-[0.26em] text-white/45">Solde Wizebot</div>
            <div className="text-2xl md:text-3xl font-black tabular-nums text-white leading-none mt-1">
              {loading && balance == null ? '—' : balance != null ? balance.toLocaleString('fr-FR') : '—'}
              <span className="text-sm text-white/40 font-bold ml-1.5">pts</span>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Rafraîchir le solde"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/12 text-white/55 hover:bg-white/5 hover:text-white transition shrink-0"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Reste à dépenser aujourd'hui */}
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 grid place-items-center shrink-0">
            <CalendarClock className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.26em] text-white/45">Reste aujourd&apos;hui</div>
              <div className="text-[10px] font-mono text-white/40 tabular-nums">
                {dailySpent != null ? `${dailySpent.toLocaleString('fr-FR')} engagés` : ''}
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-black tabular-nums text-emerald-300 leading-none mt-1">
              {dailyRemaining != null ? dailyRemaining.toLocaleString('fr-FR') : '—'}
              <span className="text-sm text-white/40 font-bold ml-1.5">/ {DAILY_POINT_QUOTA.toLocaleString('fr-FR')}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${dailyPct}%` }} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-5 py-2 border-t border-white/10 bg-black/20">
        <Coins className="w-3 h-3 text-yellow-400/60" />
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35">
          Quota {DAILY_POINT_QUOTA.toLocaleString('fr-FR')} pts/jour · max 10 000 pts/pari · points de chaîne Twitch
        </span>
      </div>
    </div>
  );
}
