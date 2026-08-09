import Link from 'next/link';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Calendar, Coins, Users, ChevronRight, Tv, Radio, Ticket } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { isBettingOpen } from '@/lib/utils/odds';
import { OddsDisplay, PoolDistributionBar } from './odds-display';
import { PlaceBetForm } from './place-bet-form';
import { MyMatchBets } from './my-match-bets';
import { MatchMarketsLazy } from './match-markets-lazy';

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
  ROUND_OF_32: 'R32',
  ROUND_OF_16: 'R16',
  QUARTER_FINAL: 'QF',
  SEMI_FINAL: 'SF',
  THIRD_PLACE: '3e',
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

export function MatchBetCard({
  match,
  userTwitchUsername = null,
  defaultOpen = false,
  onActivity,
}: {
  match: Match;
  /** twitchUsername lié de l'user courant (null si pas lié). */
  userTwitchUsername?: string | null;
  /** Ouvre le dialog de pari au montage (deep-link ?bet=<matchId>). */
  defaultOpen?: boolean;
  /** Notifie le parent après un pari/modif pour rafraîchir le wallet de page. */
  onActivity?: () => void;
}) {
  const date = new Date(match.matchDate);
  const pool = match.bettingPool;
  const total = pool
    ? Number(pool.totalHomePool) + Number(pool.totalDrawPool) + Number(pool.totalAwayPool)
    : 0;
  const open = isBettingOpen(match);

  const [dialogOpen, setDialogOpen] = useState(defaultOpen);
  // Signal de refresh partagé entre le formulaire (placement) et la liste éditable.
  const [signal, setSignal] = useState(0);
  const bump = () => {
    setSignal((s) => s + 1);
    onActivity?.();
  };

  useEffect(() => {
    if (defaultOpen) setDialogOpen(true);
  }, [defaultOpen]);

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

      {/* CTA pari — placement + édition se font ici, sur /paris */}
      {open ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="ff-board mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--tote-amber)]/40 bg-[var(--tote-amber)]/[0.07] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--tote-amber)] transition hover:border-[var(--tote-amber)]/70 hover:bg-[var(--tote-amber)]/[0.13]"
            >
              <Ticket className="h-4 w-4" />
              Parier
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-white/10 bg-[var(--tote-base)] p-0">
            {/* Scorebug — l'en-tête du ticket */}
            <div className="relative overflow-hidden border-b border-white/10 bg-black/40 px-6 pb-5 pt-6">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--tote-amber)]/70 to-transparent"
              />
              <div className="ff-board flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/45">
                <span className="flex items-center gap-2">
                  <span className="rounded border border-white/12 bg-black/40 px-1.5 py-0.5 text-white/60">
                    {stageCode[match.stage] ?? match.stage}
                  </span>
                  <span className="truncate max-w-[150px]">{match.tournament.name}</span>
                </span>
                {match.status === 'LIVE' ? (
                  <span className="flex items-center gap-1.5 text-red-300">
                    <span className="tote-lamp inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> Direct
                  </span>
                ) : (
                  <span>{format(date, "dd MMM · HH'h'mm", { locale: fr })}</span>
                )}
              </div>

              <DialogHeader className="mt-4 space-y-0">
                <DialogTitle className="ff-display flex items-center justify-center gap-3 text-3xl font-black uppercase tracking-wide text-[var(--tote-chalk)] md:text-4xl">
                  <Crest team={match.homeTeam} />
                  <span>{match.homeTeam.shortName}</span>
                  <span className="ff-board text-base font-normal text-white/25">vs</span>
                  <span>{match.awayTeam.shortName}</span>
                  <Crest team={match.awayTeam} />
                </DialogTitle>
                <DialogDescription className="ff-board pt-2 text-center text-[10px] uppercase tracking-[0.22em] text-white/40">
                  Pari mutuel · {total.toLocaleString('fr-FR')} pts en jeu · {pool?.uniqueBettors ?? 0} parieurs
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Corps du ticket */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-5 px-6 pb-6 pt-5"
            >
              <PlaceBetForm
                matchId={match.id}
                homeShort={match.homeTeam.shortName}
                awayShort={match.awayTeam.shortName}
                pool={pool}
                userTwitchUsername={userTwitchUsername}
                onPlaced={bump}
              />
              <MyMatchBets
                matchId={match.id}
                homeShort={match.homeTeam.shortName}
                awayShort={match.awayTeam.shortName}
                refreshSignal={signal}
                onChanged={bump}
              />
              {/* Marchés additionnels — déplacés depuis la page match */}
              <MatchMarketsLazy matchId={match.id} refreshSignal={signal} />
            </motion.div>
          </DialogContent>
        </Dialog>
      ) : (
        <div className="ff-board mt-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.22em] text-white/40">
          Paris fermés sur ce match
        </div>
      )}
    </article>
  );
}

function Crest({ team }: { team: Team }) {
  if (team.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={team.logo}
        alt={team.name}
        className="h-9 w-9 rounded-md border border-white/12 object-cover"
      />
    );
  }
  return (
    <span className="ff-board grid h-9 w-9 place-items-center rounded-md border border-white/12 bg-white/5 text-[10px] font-bold text-white/55">
      {team.shortName.slice(0, 3)}
    </span>
  );
}
