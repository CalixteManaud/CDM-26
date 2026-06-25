import { Coins, Users, Lock, Flame, Radio } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { isBettingOpen, bettingPhase } from '@/lib/utils/odds';

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
  /** True si l'user a déjà placé un pari sur ce match */
  alreadyBetSite?: boolean;
};

export function MatchBetWidget({
  match,
  recentBets,
  userTwitchUsername = null,
  alreadyBetSite = false,
}: Props) {
  const open = isBettingOpen(match);
  const phase = bettingPhase(match);
  const pool = match.bettingPool;
  const total = pool
    ? Number(pool.totalHomePool) + Number(pool.totalDrawPool) + Number(pool.totalAwayPool)
    : 0;

  return (
    <Card className="relative overflow-hidden bg-white/2 border-white/10 p-6 md:p-8">
      {open && total > 0 && (
        <BorderBeam size={120} duration={11} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1.2} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 grid place-items-center shrink-0">
            <Coins className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight">Pari mutuel</h3>
            <p className="text-[11px] text-white/45 mt-0.5">Cote = ta part du pool, calculée en direct</p>
          </div>
        </div>
        {phase === 'LIVE' ? (
          <Badge className="bg-red-500/15 border-red-500/40 text-red-300 uppercase tracking-[0.22em] text-[10px] font-mono shrink-0 animate-pulse">
            <Radio className="w-2.5 h-2.5 mr-1" /> Live
          </Badge>
        ) : open ? (
          <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono shrink-0">
            <Flame className="w-2.5 h-2.5 mr-1" /> Ouvert
          </Badge>
        ) : (
          <Badge className="bg-white/5 border-white/15 text-white/55 uppercase tracking-[0.22em] text-[10px] font-mono shrink-0">
            <Lock className="w-2.5 h-2.5 mr-1" /> Fermé
          </Badge>
        )}
      </div>

      {/* Pool — distribution + chiffres (dès qu'il y a des paris) */}
      {pool && total > 0 && (
        <div className="space-y-2.5 mb-6">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em]">
            <span className="text-emerald-300/80">{match.homeTeam.shortName}</span>
            <span className="text-yellow-300/80">Nul</span>
            <span className="text-red-300/80">{match.awayTeam.shortName}</span>
          </div>
          <PoolDistributionBar pool={pool} className="h-2" />
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-white/45 pt-1">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <Coins className="w-3 h-3 text-yellow-400/70" />
                <span className="tabular-nums text-white/85 font-bold">{total.toLocaleString('fr-FR')}</span>
                <span>pts</span>
              </span>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3 h-3 text-purple-400/70" />
                <span className="tabular-nums text-white/85 font-bold">{pool.uniqueBettors}</span>
                <span>parieurs</span>
              </span>
            </div>
            <span className="text-white/40">
              Maison <span className="text-white/70 tabular-nums">{Number(pool.housePercentage).toFixed(1)}%</span>
            </span>
          </div>
        </div>
      )}

      {/* Cotes en lecture seule — uniquement marché fermé (sinon le coupon les porte) */}
      {pool && total > 0 && !open && (
        <OddsDisplay
          pool={pool}
          homeShort={match.homeTeam.shortName}
          awayShort={match.awayTeam.shortName}
          className="mb-6"
        />
      )}

      {/* Placeholder "premier pari" — uniquement si marché ouvert ET vide */}
      {(!pool || total === 0) && open && (
        <div className="rounded-xl border border-dashed border-yellow-500/30 bg-yellow-500/[0.03] p-6 text-center">
          <div className="text-base font-bold text-white/85">Sois le premier à parier sur ce match</div>
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
            / le pool s&apos;ouvrira dès ta première mise — cote = 1.00 (pari mutuel pur jusqu&apos;au prochain parieur)
          </div>
        </div>
      )}

      {/* Placeholder "marché clôturé sans pari" — pari fermé et personne n'a parié */}
      {(!pool || total === 0) && !open && (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-8 text-center">
          <div className="text-base font-bold text-white/70">Aucun pari pour l&apos;instant</div>
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
            / aucun pari n&apos;a été placé sur ce match
          </div>
        </div>
      )}

      {/* Form de pari + flux récent — toujours rendu si marché ouvert */}
      <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_280px]">
        {open ? (
          <PlaceBetForm
            matchId={match.id}
            homeShort={match.homeTeam.shortName}
            awayShort={match.awayTeam.shortName}
            pool={pool}
            userTwitchUsername={userTwitchUsername}
            alreadyBetSite={alreadyBetSite}
          />
        ) : (
          total > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/30 p-5">
              <div className="text-[11px] font-mono uppercase tracking-[0.3em] font-bold text-white/45 mb-3">
                / marché clôturé
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Les paris ne sont plus acceptés sur ce match. Settlement automatique à la
                soumission du score final.
              </p>
            </div>
          )
        )}

        {recentBets.length > 0 && (
          <RecentBetsFeed bets={recentBets} variant="widget" />
        )}
      </div>
    </Card>
  );
}
