import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Coins, Users, ChevronRight, Tv, Radio } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { OddsDisplay, PoolDistributionBar } from './odds-display';

type Team = {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
};

type Pool = {
  totalHomePool: number;
  totalDrawPool: number;
  totalAwayPool: number;
  betCount: number;
  uniqueBettors: number;
  housePercentage: { toString(): string } | number;
};

type Match = {
  id: string;
  matchDate: string | Date;
  stage: string;
  status: string;
  twitchUrl?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  tournament: { id: string; name: string };
  group?: { id: string; name: string } | null;
  bettingPool: Pool | null;
};

const stageCode: Record<string, string> = {
  GROUP: 'GS',
  PLAYOFF: 'PO',
  ROUND_OF_16: 'R16',
  QUARTER_FINAL: 'QF',
  SEMI_FINAL: 'SF',
  FINAL: 'F',
};

function TeamSide({ team, side }: { team: Team; side: 'L' | 'R' }) {
  return (
    <div className={`flex items-center gap-2.5 ${side === 'R' ? 'flex-row-reverse text-right' : ''}`}>
      <div className="flex-shrink-0 h-9 w-9 rounded-md border border-white/10 bg-white/[0.04] overflow-hidden grid place-items-center">
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt={team.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] font-mono font-black text-white/60">{team.shortName.slice(0, 3)}</span>
        )}
      </div>
      <div className={side === 'R' ? 'text-right' : ''}>
        <div className="text-sm font-bold text-white truncate max-w-[140px]">{team.name}</div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/40">{team.shortName}</div>
      </div>
    </div>
  );
}

export function MatchBetCard({ match }: { match: Match }) {
  const date = new Date(match.matchDate);
  const pool = match.bettingPool;
  const total = pool
    ? Number(pool.totalHomePool) + Number(pool.totalDrawPool) + Number(pool.totalAwayPool)
    : 0;

  return (
    <article className="group relative flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.04]">
      {/* Meta strip */}
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.24em] font-mono text-white/45">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-emerald-400/70">/ {stageCode[match.stage] ?? match.stage}</span>
          <span className="text-white/20">·</span>
          <span className="truncate">{match.tournament.name}</span>
          {match.group && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-white/60">{match.group.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {match.status === 'LIVE' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/40 text-red-300 text-[9px] font-mono tracking-[0.22em] animate-pulse">
              <Radio className="h-2.5 w-2.5" />
              LIVE
            </span>
          ) : (
            <>
              <Calendar className="h-3 w-3" />
              <span className="text-white/70">{format(date, "dd MMM · HH'h'mm", { locale: fr })}</span>
            </>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide team={match.homeTeam} side="L" />
        <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/30">vs</span>
        <TeamSide team={match.awayTeam} side="R" />
      </div>

      {/* Odds */}
      <OddsDisplay
        pool={pool}
        homeShort={match.homeTeam.shortName}
        awayShort={match.awayTeam.shortName}
      />

      {/* Pool stats */}
      <div className="flex flex-col gap-1.5">
        <PoolDistributionBar pool={pool ?? {
          totalHomePool: 0, totalDrawPool: 0, totalAwayPool: 0, housePercentage: 0,
        }} />
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Coins className="h-3 w-3 text-yellow-400/70" />
              <span className="tabular-nums text-white/80">{total.toLocaleString('fr-FR')}</span>
              <span>pts</span>
            </span>
            <span className="text-white/20">·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 text-purple-400/70" />
              <span className="tabular-nums text-white/80">{pool?.uniqueBettors ?? 0}</span>
            </span>
            <span className="text-white/20">·</span>
            <span className="tabular-nums text-white/60">{pool?.betCount ?? 0} paris</span>
          </div>
          <div className="flex items-center gap-2">
            {match.twitchUrl && (
              <Badge className="h-5 px-1.5 bg-purple-500/10 text-purple-300 border-purple-500/30 gap-1 font-mono">
                <Tv className="h-2.5 w-2.5" /> LIVE
              </Badge>
            )}
            <Link
              href={`/matches/${match.id}`}
              className="inline-flex items-center gap-0.5 text-white/60 hover:text-white transition"
            >
              Détail <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
