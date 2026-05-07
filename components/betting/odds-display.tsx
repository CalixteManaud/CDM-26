import { cn } from '@/lib/utils';
import { computeLiveOdds } from '@/lib/utils/odds';

type Pool = {
  totalHomePool: number;
  totalDrawPool: number;
  totalAwayPool: number;
  betCount?: number;
  uniqueBettors?: number;
  housePercentage: { toString(): string } | number;
};

type Props = {
  pool: Pool | null | undefined;
  homeShort: string;
  awayShort: string;
  variant?: 'default' | 'compact';
  className?: string;
};

function fmtOdds(value: number | null): string {
  if (value == null) return '—';
  return value.toFixed(2);
}

export function OddsDisplay({ pool, homeShort, awayShort, variant = 'default', className }: Props) {
  const odds = pool
    ? computeLiveOdds(pool)
    : { home: null, draw: null, away: null };

  const cells: Array<{
    code: 'HOME' | 'DRAW' | 'AWAY';
    label: string;
    value: number | null;
    accent: string;
  }> = [
    { code: 'HOME', label: homeShort, value: odds.home, accent: 'text-emerald-400 border-emerald-500/30' },
    { code: 'DRAW', label: 'Nul', value: odds.draw, accent: 'text-yellow-400 border-yellow-500/30' },
    { code: 'AWAY', label: awayShort, value: odds.away, accent: 'text-red-400 border-red-500/30' },
  ];

  if (variant === 'compact') {
    return (
      <div className={cn('grid grid-cols-3 gap-1.5', className)}>
        {cells.map((c) => (
          <div
            key={c.code}
            className={cn(
              'flex flex-col items-center justify-center rounded-md border bg-white/[0.02] px-2 py-1.5',
              c.accent.split(' ')[1],
            )}
          >
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-white/40">{c.code}</span>
            <span className={cn('text-sm font-black tabular-nums', c.accent.split(' ')[0])}>{fmtOdds(c.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {cells.map((c) => (
        <div
          key={c.code}
          className={cn(
            'group flex flex-col items-center justify-center gap-1 rounded-lg border bg-white/[0.02] px-3 py-3 transition hover:bg-white/[0.05]',
            c.accent.split(' ')[1],
          )}
        >
          <span className="text-[10px] uppercase tracking-[0.24em] font-mono text-white/50">{c.code}</span>
          <span className={cn('text-xl font-black tabular-nums', c.accent.split(' ')[0])}>
            {fmtOdds(c.value)}
          </span>
          <span className="text-[10px] text-white/40 truncate max-w-full font-mono uppercase">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

type PoolBarProps = {
  pool: Pool;
  className?: string;
};

export function PoolDistributionBar({ pool, className }: PoolBarProps) {
  const home = Number(pool.totalHomePool);
  const draw = Number(pool.totalDrawPool);
  const away = Number(pool.totalAwayPool);
  const total = home + draw + away;

  if (total === 0) {
    return (
      <div className={cn('h-1.5 rounded-full bg-white/[0.04]', className)} />
    );
  }

  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className={cn('flex h-1.5 overflow-hidden rounded-full bg-white/[0.04]', className)}>
      {home > 0 && <div className="bg-emerald-500/70" style={{ width: pct(home) }} />}
      {draw > 0 && <div className="bg-yellow-500/70" style={{ width: pct(draw) }} />}
      {away > 0 && <div className="bg-red-500/70" style={{ width: pct(away) }} />}
    </div>
  );
}
