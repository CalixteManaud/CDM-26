import Link from 'next/link';
import { Flame, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { BorderBeam } from '@/components/ui/border-beam';

type Team = { id: string; name: string; shortName: string; logo: string | null };

type Row = {
  matchId: string;
  matchDate: string | Date;
  tournament: { id: string; name: string };
  homeTeam: Team;
  awayTeam: Team;
  outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';
  label: string;
  odds: number;
};

const outcomeAccent: Record<Row['outcome'], string> = {
  HOME_WIN: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  DRAW: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  AWAY_WIN: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export function TopOddsLeaderboard({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <Flame className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <div className="text-sm font-mono uppercase tracking-[0.24em] text-white/40">
          / aucune cote en direct pour l'instant
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <BorderBeam size={120} duration={10} colorFrom="#f59e0b" colorTo="#dc2626" />

      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] font-bold text-yellow-400">
          <Flame className="h-3.5 w-3.5" />
          / les plus grosses cotes
        </div>
      </div>

      <ol className="divide-y divide-white/5">
        {rows.map((r, i) => (
          <li key={`${r.matchId}-${r.outcome}`}>
            <Link
              href={`/matches/${r.matchId}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.04]"
            >
              <span className="text-[11px] font-mono font-black tabular-nums text-white/30 w-5 text-center">
                {String(i + 1).padStart(2, '0')}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold text-white truncate">
                  <span>{r.homeTeam.shortName}</span>
                  <span className="text-white/30 font-mono text-[10px]">vs</span>
                  <span>{r.awayTeam.shortName}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mt-0.5">
                  <span>{format(new Date(r.matchDate), "dd MMM · HH'h'mm", { locale: fr })}</span>
                  <span className="text-white/20">·</span>
                  <span className="truncate">{r.tournament.name}</span>
                </div>
              </div>

              <div className={`flex flex-col items-end px-2.5 py-1.5 rounded-md border ${outcomeAccent[r.outcome]}`}>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/50">{r.label}</span>
                <span className="text-base font-black tabular-nums leading-none">{r.odds.toFixed(2)}</span>
              </div>

              <ChevronRight className="h-3.5 w-3.5 text-white/30" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
