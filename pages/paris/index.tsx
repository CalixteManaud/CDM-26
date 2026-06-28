import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Star, Crown, ArrowRight, Flame, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { MatchBetCard } from '@/components/betting/match-bet-card';
import { OpenMatchesFilter } from '@/components/betting/open-matches-filter';
import { BettingWallet } from '@/components/betting/betting-wallet';
import { ToteBoard } from '@/components/betting/tote-board';
import { TopOddsLeaderboard } from '@/components/betting/top-odds-leaderboard';
import { LiveBetsTable } from '@/components/betting/live-bets-table';
import { HowToBetCard } from '@/components/betting/how-to-bet-card';
import { ParisSubnav } from '@/components/betting/paris-subnav';

type ActionResult<T> = { success: boolean; data?: T; error?: string };

type Match = Parameters<typeof MatchBetCard>[0]['match'];
type TopRow = Parameters<typeof TopOddsLeaderboard>[0]['rows'][number];
type Bet = Parameters<typeof LiveBetsTable>[0]['initial'][number];

type Stats = {
  totalWagered: number;
  totalBets: number;
  pendingBets: number;
  uniqueBettors: number;
};

type TournamentMarketSummary = {
  id: string;
  name: string;
  startDate: string;
  marketsCount: number;
  marketTypes: string[];
  totalPool: number;
  totalBets: number;
};

type PageProps = {
  matches: Match[];
  topOdds: TopRow[];
  recentBets: Bet[];
  stats: Stats;
  tournamentMarkets: TournamentMarketSummary[];
  userTwitchUsername: string | null;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const {
    getOpenBettingMatches,
    getTopLiveOdds,
    getRecentBetsFeed,
    getGlobalBettingStats,
    getTournamentsWithOpenMarkets,
  } = await import('@/actions/betting');
  const { getCurrentDbUserFromReq } = await import('@/lib/auth/page-auth');

  const [matchesRes, topRes, recentRes, statsRes, tournamentsRes, dbUser] = await Promise.all([
    getOpenBettingMatches() as Promise<ActionResult<Match[]>>,
    getTopLiveOdds(8) as Promise<ActionResult<TopRow[]>>,
    getRecentBetsFeed(40) as Promise<ActionResult<Bet[]>>,
    getGlobalBettingStats() as Promise<ActionResult<Stats>>,
    getTournamentsWithOpenMarkets() as Promise<ActionResult<TournamentMarketSummary[]>>,
    getCurrentDbUserFromReq(ctx.req),
  ]);

  return {
    props: {
      userTwitchUsername: dbUser?.twitchUsername ?? null,
      matches: matchesRes.success && matchesRes.data ? JSON.parse(JSON.stringify(matchesRes.data)) : [],
      topOdds: topRes.success && topRes.data ? JSON.parse(JSON.stringify(topRes.data)) : [],
      recentBets: recentRes.success && recentRes.data ? JSON.parse(JSON.stringify(recentRes.data)) : [],
      stats: statsRes.success && statsRes.data
        ? statsRes.data
        : { totalWagered: 0, totalBets: 0, pendingBets: 0, uniqueBettors: 0 },
      tournamentMarkets:
        tournamentsRes.success && tournamentsRes.data
          ? JSON.parse(JSON.stringify(tournamentsRes.data))
          : [],
    },
  };
};

/** En-tête de section façon panneau de tableau : lampe ambre + libellé condensé. */
function BoardLabel({ label, sub, count }: { label: string; sub?: string; count?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <span className="tote-lamp inline-block h-2 w-2 rounded-full bg-[var(--tote-amber)] [box-shadow:0_0_10px_2px_rgba(251,191,36,.55)]" />
        <h2 className="ff-display text-3xl font-black uppercase leading-none tracking-tight text-[var(--tote-chalk)] md:text-5xl">
          {label}
        </h2>
        {sub && (
          <span className="ff-board mb-0.5 text-[11px] uppercase tracking-[0.24em] text-white/40">
            {sub}
          </span>
        )}
      </div>
      {count != null && (
        <span className="ff-board text-sm tabular-nums text-white/45">{count}</span>
      )}
    </div>
  );
}

/** Bandeau « handle » : les totaux du tableau, statiques (le mouvement reste au board). */
function HandleStrip({ stats }: { stats: Stats }) {
  const items: Array<{ label: string; value: number; accent: string; unit?: string }> = [
    { label: 'En jeu', value: stats.totalWagered, accent: 'text-[var(--tote-amber)]', unit: 'pts' },
    { label: 'Mises', value: stats.totalBets, accent: 'text-emerald-300' },
    { label: 'En cours', value: stats.pendingBets, accent: 'text-red-300' },
    { label: 'Parieurs', value: stats.uniqueBettors, accent: 'text-purple-300' },
  ];
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.07] border-x border-white/[0.07] md:grid-cols-4 md:divide-y-0">
      {items.map((it) => (
        <div key={it.label} className="px-5 py-6">
          <div className="ff-board text-[10px] uppercase tracking-[0.26em] text-white/40">{it.label}</div>
          <div className={cn('ff-board mt-2 text-3xl font-bold tabular-nums md:text-4xl', it.accent)}>
            {it.value.toLocaleString('fr-FR')}
            {it.unit && <span className="ml-1 text-sm font-normal text-white/30">{it.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ParisPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { matches, topOdds, recentBets, stats, tournamentMarkets, userTwitchUsername } = props;
  // Bumpé après chaque pari/modif pour rafraîchir le solde Wizebot + le quota du jour.
  const [walletSignal, setWalletSignal] = useState(0);
  const onBetActivity = () => setWalletSignal((s) => s + 1);

  return (
    <>
      <Head>
        <title>Paris en direct — CDM 26</title>
        <meta
          name="description"
          content="Le tableau des cotes en direct CDM 26. Pari mutuel sur le site avec tes points de chaîne Twitch (Wizebot) : tu joues contre la foule, les cotes bougent à chaque mise."
        />
      </Head>

      <div className="relative min-h-screen bg-felt text-[var(--tote-chalk)]">
        <ParisSubnav active="live" />

        {/* HERO — LE TOTEBOARD */}
        <section className="border-b border-white/10">
          <div className="container mx-auto px-4 py-14 md:py-20">
            <ToteBoard matches={matches} />

            {/* La caisse — solde + reste du jour, accolé au tableau */}
            <div className="mt-6">
              <div className="ff-board mb-2 text-[10px] uppercase tracking-[0.28em] text-white/35">
                Ta caisse
              </div>
              <BettingWallet refreshSignal={walletSignal} />
            </div>
          </div>
        </section>

        {/* HANDLE — totaux du marché */}
        <section className="border-b border-white/10">
          <div className="container mx-auto px-4 py-8">
            <HandleStrip stats={stats} />
          </div>
        </section>

        {/* LE TAPIS — le marché ouvert */}
        <section className="border-b border-white/10 py-14">
          <div className="container mx-auto px-4">
            <BoardLabel label="Le tapis" sub="le marché ouvert" count={matches.length} />

            <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
              <div>
                {matches.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[var(--tote-raised)] p-12 text-center">
                    <Flame className="mx-auto mb-4 h-10 w-10 text-white/15" />
                    <div className="ff-display text-2xl font-bold uppercase tracking-wide text-white/70">
                      Aucun match ouvert
                    </div>
                    <div className="ff-board mt-2 text-[11px] uppercase tracking-[0.22em] text-white/35">
                      Les marchés s&apos;ouvrent avant chaque match
                    </div>
                  </div>
                ) : (
                  <OpenMatchesFilter
                    matches={matches}
                    userTwitchUsername={userTwitchUsername}
                    onActivity={onBetActivity}
                  />
                )}
              </div>

              <aside className="space-y-6">
                <TopOddsLeaderboard rows={topOdds} />
                <HowToBetCard />
              </aside>
            </div>
          </div>
        </section>

        {/* LE LONG JEU — paris longue durée (tournoi) */}
        {tournamentMarkets.length > 0 && (
          <section className="border-b border-white/10 py-14">
            <div className="container mx-auto px-4">
              <BoardLabel label="Le long jeu" sub="vainqueur · top buteur · MVP" />

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tournamentMarkets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/paris/tournoi/${t.id}`}
                    className="group block overflow-hidden rounded-2xl border border-white/10 bg-[var(--tote-raised)] transition-all hover:border-[var(--tote-amber)]/40"
                  >
                    <div className="border-b border-white/[0.07] bg-black/20 px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Trophy className="h-4 w-4 shrink-0 text-[var(--tote-amber)]" />
                          <span className="ff-display truncate text-lg font-bold uppercase tracking-wide text-[var(--tote-chalk)]">
                            {t.name}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-white/25 transition-all group-hover:translate-x-1 group-hover:text-[var(--tote-amber)]" />
                      </div>
                    </div>
                    <div className="space-y-3 px-5 py-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {t.marketTypes.includes('TOURNAMENT_WINNER') && (
                          <span className="ff-board inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-emerald-300">
                            <Crown className="h-3 w-3" /> Vainqueur
                          </span>
                        )}
                        {t.marketTypes.includes('TOURNAMENT_TOP_SCORER') && (
                          <span className="ff-board inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/5 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-yellow-300">
                            <Star className="h-3 w-3" /> Top buteur
                          </span>
                        )}
                        {t.marketTypes.includes('TOURNAMENT_MVP') && (
                          <span className="ff-board inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/5 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-purple-300">
                            <Trophy className="h-3 w-3" /> MVP
                          </span>
                        )}
                      </div>
                      <div className="ff-board flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
                        <span className="text-white/45">
                          {t.totalBets} paris · {t.totalPool.toLocaleString('fr-FR')} pts
                        </span>
                        <span className="font-bold text-[var(--tote-amber)]">
                          {t.marketsCount} marché{t.marketsCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* LA BANDE — les mises en direct */}
        <section className="border-b border-white/10 py-14">
          <div className="container mx-auto px-4">
            <BoardLabel label="La bande" sub="les mises en direct" />
            <div className="mt-8">
              <LiveBetsTable initial={recentBets} limit={40} />
            </div>
          </div>
        </section>

        {/* PIED — mention pari mutuel */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="ff-board flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase tracking-[0.28em] text-white/30">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-3 w-3" />
                <span>Pari mutuel · part de la maison configurable par match</span>
              </div>
              <div>CDM 26 · tableau des cotes</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
