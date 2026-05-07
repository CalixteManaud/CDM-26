import { Coins, Users, Lock, Flame } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';

import { OddsDisplay, PoolDistributionBar } from './odds-display';
import { RecentBetsFeed } from './recent-bets-feed';
import { PlaceBetForm } from './place-bet-form';

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
  status: string;
  homeTeam: { id: string; name: string; shortName: string; logo: string | null };
  awayTeam: { id: string; name: string; shortName: string; logo: string | null };
  bettingPool: Pool | null;
};

type Bet = Parameters<typeof RecentBetsFeed>[0]['bets'][number];

type Props = {
  match: Match;
  recentBets: Bet[];
  /** twitchUsername de l'user courant (null si non lié, undefined si pas connecté) */
  userTwitchUsername?: string | null;
  /** True si l'user a déjà parié via le chat Twitch sur ce match */
  blockedByTwitch?: boolean;
  /** True si l'user a déjà parié via le site sur ce match */
  alreadyBetSite?: boolean;
};

function isOpen(match: Match): boolean {
  return match.status === 'SCHEDULED' && new Date(match.matchDate) > new Date();
}

export function MatchBetWidget({
  match,
  recentBets,
  userTwitchUsername = null,
  blockedByTwitch = false,
  alreadyBetSite = false,
}: Props) {
  const open = isOpen(match);
  const pool = match.bettingPool;
  const total = pool
    ? Number(pool.totalHomePool) + Number(pool.totalDrawPool) + Number(pool.totalAwayPool)
    : 0;

  return (
    <Card className="relative overflow-hidden bg-white/2 border-white/10 p-7 md:p-8">
      {open && total > 0 && (
        <BorderBeam size={120} duration={11} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1.2} />
      )}

      <div className="flex items-start gap-4 mb-7">
        <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
          <Coins className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-yellow-400 mb-1.5">
            § Marché — Paris mutuel
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
            {open ? 'Cotes en direct' : 'Marché clôturé'}
          </h3>
        </div>
        {open ? (
          <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono shrink-0">
            <Flame className="w-2.5 h-2.5 mr-1" /> Ouvert
          </Badge>
        ) : (
          <Badge className="bg-white/5 border-white/15 text-white/55 uppercase tracking-[0.22em] text-[10px] font-mono shrink-0">
            <Lock className="w-2.5 h-2.5 mr-1" /> Fermé
          </Badge>
        )}
      </div>

      {!pool || total === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-8 text-center">
          <div className="text-base font-bold text-white/70">Aucun pari pour l'instant</div>
          {open ? (
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
              / sois le premier — tape !parier dans le chat
            </div>
          ) : (
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
              / aucun pari n'a été placé sur ce match
            </div>
          )}
        </div>
      ) : (
        <>
          <OddsDisplay
            pool={pool}
            homeShort={match.homeTeam.shortName}
            awayShort={match.awayTeam.shortName}
          />

          <div className="mt-5 space-y-2">
            <PoolDistributionBar pool={pool} />
            <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="w-3 h-3 text-yellow-400/70" />
                  <span className="tabular-nums text-white/85 font-bold">{total.toLocaleString('fr-FR')}</span>
                  <span>pts en jeu</span>
                </span>
                <span className="text-white/20">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-purple-400/70" />
                  <span className="tabular-nums text-white/85 font-bold">{pool.uniqueBettors}</span>
                  <span>parieurs</span>
                </span>
                <span className="text-white/20">·</span>
                <span className="tabular-nums text-white/70">{pool.betCount} paris</span>
              </div>
              <span className="text-white/40">
                Maison : <span className="text-white/70 tabular-nums">{Number(pool.housePercentage).toFixed(1)}%</span>
              </span>
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_280px]">
            {open ? (
              <PlaceBetForm
                matchId={match.id}
                homeShort={match.homeTeam.shortName}
                awayShort={match.awayTeam.shortName}
                pool={pool}
                userTwitchUsername={userTwitchUsername}
                blockedByTwitch={blockedByTwitch}
                alreadyBetSite={alreadyBetSite}
              />
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/30 p-5">
                <div className="text-[11px] font-mono uppercase tracking-[0.3em] font-bold text-white/45 mb-3">
                  / marché clôturé
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Les paris ne sont plus acceptés sur ce match. Settlement automatique à la
                  soumission du score final.
                </p>
              </div>
            )}

            {recentBets.length > 0 && (
              <RecentBetsFeed bets={recentBets} variant="widget" />
            )}
          </div>

          {open && (
            <div className="mt-4 rounded-md border border-purple-500/20 bg-purple-500/[0.04] px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-purple-200/70 flex items-center gap-2">
              <span className="text-purple-300">/</span>
              alternative — tape{' '}
              <code className="text-yellow-300 font-mono normal-case tracking-normal text-[11px]">
                !parier HOME|DRAW|AWAY {'<points>'}
              </code>
              dans le chat twitch (un seul canal par match)
            </div>
          )}
        </>
      )}
    </Card>
  );
}
