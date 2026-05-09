import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  X,
  AlertTriangle,
  Trophy,
  Coins,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

type BetRow = {
  id: string;
  outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';
  pointsWagered: number;
  oddsAtPlacement: { toString(): string } | number;
  status: string;
  actualPayout: number;
  createdAt: string | Date;
  settledAt: string | Date | null;
  match: {
    id: string;
    matchDate: string | Date;
    status: string;
    stage: string;
    homeScore: number | null;
    awayScore: number | null;
    homeTeam: { id: string; name: string; shortName: string; logo: string | null };
    awayTeam: { id: string; name: string; shortName: string; logo: string | null };
    tournament: { id: string; name: string };
  };
};

type Filter = 'ALL' | 'PENDING' | 'WON' | 'LOST' | 'OTHER';

const FILTERS: Array<{ key: Filter; label: string; code: string; cls: string }> = [
  { key: 'ALL', label: 'Tous', code: 'ALL', cls: 'text-white/70' },
  { key: 'PENDING', label: 'En cours', code: 'PND', cls: 'text-yellow-300' },
  { key: 'WON', label: 'Gagnés', code: 'WON', cls: 'text-emerald-300' },
  { key: 'LOST', label: 'Perdus', code: 'LOST', cls: 'text-red-300' },
  { key: 'OTHER', label: 'Autres', code: 'OTHER', cls: 'text-white/50' },
];

const outcomeMeta: Record<BetRow['outcome'], { text: string; cls: string }> = {
  HOME_WIN: { text: 'Domicile', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5' },
  DRAW: { text: 'Match nul', cls: 'text-yellow-300 border-yellow-500/30 bg-yellow-500/5' },
  AWAY_WIN: { text: 'Extérieur', cls: 'text-red-300 border-red-500/30 bg-red-500/5' },
};

const statusMeta: Record<string, { icon: typeof Clock; cls: string; ring: string; label: string }> = {
  PENDING: { icon: Clock, cls: 'text-yellow-300', ring: 'ring-yellow-500/20', label: 'En attente' },
  WON: { icon: CheckCircle2, cls: 'text-emerald-400', ring: 'ring-emerald-500/30', label: 'Gagné' },
  LOST: { icon: X, cls: 'text-red-400', ring: 'ring-red-500/20', label: 'Perdu' },
  VOID: { icon: AlertTriangle, cls: 'text-white/40', ring: 'ring-white/10', label: 'Annulé' },
  CREDIT_FAILED: { icon: AlertTriangle, cls: 'text-orange-400', ring: 'ring-orange-500/30', label: 'Crédit en échec' },
  CANCELED: { icon: X, cls: 'text-white/40', ring: 'ring-white/10', label: 'Annulé' },
};

function matchScoreLine(b: BetRow): string | null {
  if (b.match.homeScore == null || b.match.awayScore == null) return null;
  return `${b.match.homeScore} – ${b.match.awayScore}`;
}

function pickedTeamLabel(b: BetRow): string {
  if (b.outcome === 'HOME_WIN') return b.match.homeTeam.shortName;
  if (b.outcome === 'AWAY_WIN') return b.match.awayTeam.shortName;
  return 'Nul';
}

export function MyBetsHistory({ bets }: { bets: BetRow[] }) {
  const [filter, setFilter] = useState<Filter>('ALL');

  const filtered = useMemo(() => {
    if (filter === 'ALL') return bets;
    if (filter === 'OTHER') {
      return bets.filter((b) => b.status === 'VOID' || b.status === 'CANCELED' || b.status === 'CREDIT_FAILED');
    }
    return bets.filter((b) => b.status === filter);
  }, [bets, filter]);

  const counts = useMemo(() => {
    const c = { ALL: bets.length, PENDING: 0, WON: 0, LOST: 0, OTHER: 0 };
    for (const b of bets) {
      if (b.status === 'PENDING') c.PENDING++;
      else if (b.status === 'WON') c.WON++;
      else if (b.status === 'LOST') c.LOST++;
      else c.OTHER++;
    }
    return c;
  }, [bets]);

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          const count = counts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 group relative flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.22em] border transition-all',
                isActive
                  ? 'bg-white/8 border-white/20 text-white'
                  : 'border-white/8 text-white/45 hover:text-white/80 hover:bg-white/3'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', isActive ? f.cls.replace('text-', 'bg-') : 'bg-white/15')} />
              <span className="font-bold">{f.label}</span>
              <span className="text-white/35 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <Activity className="h-10 w-10 text-white/15 mx-auto mb-4" />
          <div className="text-base font-bold text-white/70">
            {filter === 'ALL' ? 'Aucun pari pour le moment' : `Aucun pari "${FILTERS.find((f) => f.key === filter)?.label}"`}
          </div>
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
            / commence par un match sur <Link href="/paris" className="text-yellow-300 hover:text-yellow-200 underline underline-offset-2">la page paris</Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2.5 flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/45 font-bold flex items-center gap-2">
              <Coins className="w-3 h-3 text-yellow-400" />
              / {filtered.length} {filtered.length > 1 ? 'paris' : 'pari'}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
              tri par date
            </div>
          </div>

          <ul className="divide-y divide-white/5">
            {filtered.map((b) => {
              const status = statusMeta[b.status] ?? statusMeta.PENDING;
              const StatusIcon = status.icon;
              const oc = outcomeMeta[b.outcome];
              const odds = Number(b.oddsAtPlacement);
              const score = matchScoreLine(b);
              const isWin = b.status === 'WON' || b.status === 'CREDIT_FAILED';
              const isLoss = b.status === 'LOST';
              const profit = b.actualPayout - b.pointsWagered;

              return (
                <li
                  key={b.id}
                  className={cn(
                    'p-4 md:p-5 hover:bg-white/[0.03] transition-colors',
                    isWin && 'bg-emerald-500/[0.02]',
                    isLoss && 'bg-red-500/[0.02]'
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Status badge */}
                    <div
                      className={cn(
                        'shrink-0 w-10 h-10 rounded-lg ring-2 flex items-center justify-center bg-black/40',
                        status.ring
                      )}
                    >
                      <StatusIcon className={cn('w-4 h-4', status.cls)} />
                    </div>

                    {/* Main */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <Link
                            href={`/matches/${b.match.id}`}
                            className="group flex items-center gap-2 text-sm font-black text-white tracking-tight hover:text-yellow-200"
                          >
                            <span>{b.match.homeTeam.shortName}</span>
                            <span className="text-white/30 font-mono text-xs">vs</span>
                            <span>{b.match.awayTeam.shortName}</span>
                            <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-white/60 ml-0.5" />
                          </Link>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(b.match.matchDate), 'dd MMM yyyy · HH:mm', { locale: fr })}
                            <span className="text-white/20">·</span>
                            <Trophy className="w-3 h-3" />
                            <span className="truncate max-w-[160px]">{b.match.tournament.name}</span>
                            {score && (
                              <>
                                <span className="text-white/20">·</span>
                                <span className="text-white/60 font-bold">{score}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status pill */}
                        <span
                          className={cn(
                            'shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono uppercase tracking-[0.22em] font-black',
                            status.cls,
                            status.ring.replace('ring-', 'border-')
                          )}
                        >
                          {status.label}
                        </span>
                      </div>

                      {/* Pari row */}
                      <div className="mt-3 flex items-center justify-between gap-4 flex-wrap rounded-lg bg-black/30 border border-white/5 p-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-[0.22em] font-black',
                              oc.cls
                            )}
                          >
                            {oc.text} · {pickedTeamLabel(b)}
                          </span>
                        </div>
                        <div className="flex items-center gap-5">
                          <Stat label="Mise" value={`${b.pointsWagered.toLocaleString('fr-FR')} pts`} />
                          <Stat label="Cote" value={`×${odds.toFixed(2)}`} />
                          {b.status === 'PENDING' ? (
                            <Stat
                              label="Gain potentiel"
                              value={`${Math.round(b.pointsWagered * odds).toLocaleString('fr-FR')} pts`}
                              cls="text-yellow-300"
                            />
                          ) : isWin ? (
                            <Stat
                              label="Gain"
                              value={`+${profit.toLocaleString('fr-FR')} pts`}
                              cls="text-emerald-400"
                            />
                          ) : isLoss ? (
                            <Stat
                              label="Perte"
                              value={`−${b.pointsWagered.toLocaleString('fr-FR')} pts`}
                              cls="text-red-400"
                            />
                          ) : (
                            <Stat label="Résultat" value="—" cls="text-white/35" />
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.22em] text-white/30">
                        placé il y a {formatDistanceToNow(new Date(b.createdAt), { locale: fr })}
                        {b.settledAt && (
                          <>
                            <span className="mx-2">·</span>
                            résolu il y a {formatDistanceToNow(new Date(b.settledAt), { locale: fr })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className={cn('text-sm font-black tabular-nums tracking-tight', cls ?? 'text-white')}>{value}</span>
      <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/40 mt-0.5">{label}</span>
    </div>
  );
}
