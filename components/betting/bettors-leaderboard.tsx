import { useMemo, useState } from 'react';
import { Award, TrendingUp, Target, Coins, Crown, Medal, Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';

type Row = {
  user: {
    id: string;
    twitchUsername: string | null;
    username: string | null;
    name: string;
    avatar: string | null;
  } | null;
  wagered: number;
  won: number;
  netProfit: number;
  winRate: number;
  roi: number;
  totalBets: number;
  wonCount: number;
  lostCount: number;
};

type SortKey = 'netProfit' | 'roi' | 'winRate' | 'wagered';

const SORT_TABS: Array<{ key: SortKey; label: string; code: string; icon: typeof Coins; cls: string }> = [
  { key: 'netProfit', label: 'Bénéfice net', code: 'NET', icon: TrendingUp, cls: 'text-emerald-300' },
  { key: 'roi', label: 'ROI', code: 'ROI', icon: Target, cls: 'text-yellow-300' },
  { key: 'winRate', label: 'Win rate', code: 'HIT', icon: Award, cls: 'text-purple-300' },
  { key: 'wagered', label: 'Volume', code: 'VOL', icon: Coins, cls: 'text-red-300' },
];

function displayName(u: Row['user']): string {
  if (!u) return 'anonyme';
  if (u.twitchUsername) return `@${u.twitchUsername}`;
  if (u.username) return u.username;
  return u.name;
}

function rankBadge(rank: number) {
  if (rank === 1) return { Icon: Crown, cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/40 ring-yellow-500/30' };
  if (rank === 2) return { Icon: Medal, cls: 'text-zinc-300 bg-zinc-300/10 border-zinc-300/30 ring-zinc-300/20' };
  if (rank === 3) return { Icon: Medal, cls: 'text-orange-400 bg-orange-500/10 border-orange-500/30 ring-orange-500/20' };
  return null;
}

export function BettorsLeaderboard({ rows: initialRows }: { rows: Row[] }) {
  const [sortBy, setSortBy] = useState<SortKey>('netProfit');

  const rows = useMemo(() => {
    return [...initialRows].sort((a, b) => {
      if (sortBy === 'netProfit') return b.netProfit - a.netProfit;
      if (sortBy === 'roi') return b.roi - a.roi;
      if (sortBy === 'winRate') return b.winRate - a.winRate;
      return b.wagered - a.wagered;
    });
  }, [initialRows, sortBy]);

  if (initialRows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
        <Trophy className="h-10 w-10 text-white/15 mx-auto mb-4" />
        <div className="text-base font-bold text-white/70">Pas encore de classement</div>
        <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
          / le leaderboard s'active dès qu'un pari est résolu
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sort tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {SORT_TABS.map((t) => {
          const Icon = t.icon;
          const isActive = sortBy === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSortBy(t.key)}
              className={cn(
                'shrink-0 group flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.22em] border transition-all',
                isActive
                  ? 'bg-white/8 border-white/20 text-white'
                  : 'border-white/8 text-white/45 hover:text-white/80 hover:bg-white/3'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? t.cls : 'text-white/40')} />
              <span className="font-bold">{t.label}</span>
              <span className="text-white/30 text-[9px]">/ {t.code}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2.5 flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/45 font-bold flex items-center gap-2">
            <Trophy className="w-3 h-3 text-yellow-400" />
            / top {rows.length} parieurs
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
            tri par {SORT_TABS.find((t) => t.key === sortBy)?.label.toLowerCase()}
          </div>
        </div>

        {/* Header row (desktop) */}
        <div className="hidden md:grid grid-cols-[64px_1fr_120px_120px_120px_120px] gap-4 px-4 py-2 border-b border-white/5 text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">
          <div>#</div>
          <div>Parieur</div>
          <div className="text-right">Misé</div>
          <div className="text-right">Net</div>
          <div className="text-right">ROI</div>
          <div className="text-right">Hit</div>
        </div>

        <ul>
          {rows.map((r, i) => {
            const rank = i + 1;
            const badge = rankBadge(rank);
            const isProfit = r.netProfit >= 0;
            const isRoiProfit = r.roi >= 0;

            return (
              <li
                key={r.user?.id ?? rank}
                className={cn(
                  'group hover:bg-white/[0.025] transition-colors',
                  i % 2 === 0 ? 'bg-white/[0.005]' : ''
                )}
              >
                <div className="grid grid-cols-[44px_1fr_auto] md:grid-cols-[64px_1fr_120px_120px_120px_120px] gap-3 md:gap-4 px-4 py-3 items-center">
                  {/* Rank */}
                  <div className="flex items-center justify-center">
                    {badge ? (
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg border ring-2 flex items-center justify-center',
                          badge.cls
                        )}
                      >
                        <badge.Icon className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg border border-white/8 bg-black/40 flex items-center justify-center text-[12px] font-mono text-white/40 tabular-nums">
                        {rank}
                      </div>
                    )}
                  </div>

                  {/* User */}
                  <div className="min-w-0 flex items-center gap-3">
                    {r.user?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.user.avatar}
                        alt={displayName(r.user)}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/5 ring-2 ring-white/10 flex items-center justify-center text-[10px] font-black text-white/55 shrink-0">
                        {displayName(r.user).charAt(displayName(r.user).startsWith('@') ? 1 : 0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white tracking-tight truncate">
                        {displayName(r.user)}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">
                        {r.totalBets} paris · {r.wonCount}W · {r.lostCount}L
                      </div>
                    </div>
                  </div>

                  {/* Mobile compact stats */}
                  <div className="md:hidden flex flex-col items-end leading-tight">
                    <span
                      className={cn(
                        'text-sm font-black tabular-nums',
                        isProfit ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {isProfit ? '+' : '−'}
                      {Math.abs(r.netProfit).toLocaleString('fr-FR')}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/35 mt-0.5">
                      {r.roi >= 0 ? '+' : ''}
                      {r.roi.toFixed(1)}% ROI
                    </span>
                  </div>

                  {/* Desktop columns */}
                  <div className="hidden md:block text-right text-sm font-bold text-white/75 tabular-nums">
                    {r.wagered.toLocaleString('fr-FR')}
                  </div>
                  <div
                    className={cn(
                      'hidden md:block text-right text-sm font-black tabular-nums',
                      isProfit ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {isProfit ? '+' : '−'}
                    {Math.abs(r.netProfit).toLocaleString('fr-FR')}
                  </div>
                  <div
                    className={cn(
                      'hidden md:block text-right text-sm font-bold tabular-nums',
                      isRoiProfit ? 'text-emerald-300/85' : 'text-red-300/85'
                    )}
                  >
                    {isRoiProfit ? '+' : ''}
                    {r.roi.toFixed(1)}%
                  </div>
                  <div className="hidden md:block text-right text-sm font-bold text-white/65 tabular-nums">
                    {r.winRate.toFixed(1)}%
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
