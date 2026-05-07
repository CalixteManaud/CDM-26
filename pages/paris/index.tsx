import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Coins,
  Users,
  Activity,
  Flame,
  CircleDot,
  Tv,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';

import { MatchBetCard } from '@/components/betting/match-bet-card';
import { TopOddsLeaderboard } from '@/components/betting/top-odds-leaderboard';
import { RecentBetsFeed } from '@/components/betting/recent-bets-feed';
import { HowToBetCard } from '@/components/betting/how-to-bet-card';

type ActionResult<T> = { success: boolean; data?: T; error?: string };

type Match = Parameters<typeof MatchBetCard>[0]['match'];
type TopRow = Parameters<typeof TopOddsLeaderboard>[0]['rows'][number];
type Bet = Parameters<typeof RecentBetsFeed>[0]['bets'][number];

type Stats = {
  totalWagered: number;
  totalBets: number;
  pendingBets: number;
  uniqueBettors: number;
};

type PageProps = {
  matches: Match[];
  topOdds: TopRow[];
  recentBets: Bet[];
  stats: Stats;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const { getOpenBettingMatches, getTopLiveOdds, getRecentBets, getGlobalBettingStats } =
    await import('@/actions/betting');

  const [matchesRes, topRes, recentRes, statsRes] = await Promise.all([
    getOpenBettingMatches() as Promise<ActionResult<Match[]>>,
    getTopLiveOdds(8) as Promise<ActionResult<TopRow[]>>,
    getRecentBets(15) as Promise<ActionResult<Bet[]>>,
    getGlobalBettingStats() as Promise<ActionResult<Stats>>,
  ]);

  return {
    props: {
      matches: matchesRes.success && matchesRes.data ? JSON.parse(JSON.stringify(matchesRes.data)) : [],
      topOdds: topRes.success && topRes.data ? JSON.parse(JSON.stringify(topRes.data)) : [],
      recentBets: recentRes.success && recentRes.data ? JSON.parse(JSON.stringify(recentRes.data)) : [],
      stats: statsRes.success && statsRes.data
        ? statsRes.data
        : { totalWagered: 0, totalBets: 0, pendingBets: 0, uniqueBettors: 0 },
    },
  };
};

type Accent = 'emerald' | 'yellow' | 'red' | 'purple';
const ACCENT: Record<Accent, { text: string; bg: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400' },
  red: { text: 'text-red-400', bg: 'bg-red-400' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400' },
};

function SectionEyebrow({ num, label, accent }: { num: string; label: string; accent: Accent }) {
  const s = ACCENT[accent];
  return (
    <div className={`inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold ${s.text}`}>
      <span className={`block w-12 h-px ${s.bg}`} />
      <span className="font-mono">/ {num}</span>
      <span className="text-white/30">—</span>
      <span>{label}</span>
    </div>
  );
}

function StatCell({
  code,
  label,
  value,
  icon: Icon,
  accent,
  beam,
}: {
  code: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  beam?: boolean;
}) {
  const s = ACCENT[accent];
  return (
    <div className="relative px-4 md:px-8 py-7 group overflow-hidden">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-3">
        <Icon className={`h-3.5 w-3.5 ${s.text}`} />
        / {code}
      </div>
      <div className="text-4xl md:text-5xl font-black tracking-tight text-white tabular-nums leading-none">
        <NumberTicker value={value} />
      </div>
      <div className="text-[11px] uppercase tracking-[0.22em] font-mono text-white/55 mt-3">{label}</div>
      {beam && <BorderBeam size={70} duration={9} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1.2} />}
    </div>
  );
}

export default function ParisPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { matches, topOdds, recentBets, stats } = props;

  return (
    <>
      <Head>
        <title>Paris en direct — CDM 26</title>
        <meta
          name="description"
          content="Toutes les cotes en direct CDM 26. Pari mutuel via les points de chaîne Twitch et Wizebot. Les plus grosses cotes, le flux des mises et l'état des pools."
        />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-yellow-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-20 md:py-24 relative">
            <div className="flex items-end justify-between flex-wrap gap-8">
              <div>
                <SectionEyebrow num="BET" label="Paris en pari mutuel" accent="yellow" />
                <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
                  Les <span className="text-gradient-worldcup">cotes</span>
                  <br />
                  <span className="italic font-light text-white/35">en direct.</span>
                </h1>
                <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
                  Pari mutuel sur les points de chaîne Twitch via Wizebot. Les cotes bougent en temps réel
                  selon l'état du pool. Pas de bookmaker — tu joues contre les autres viewers.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <CircleDot className="w-3 h-3 mr-1" /> Live
                  </Badge>
                  <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Tv className="w-3 h-3 mr-1" /> Wizebot · Twitch
                  </Badge>
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Coins className="w-3 h-3 mr-1" /> Pari mutuel
                  </Badge>
                </div>
              </div>

              <Link href="#open-matches">
                <ShimmerButton
                  background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                  shimmerColor="#ffffff"
                  className="px-7 py-4 font-black uppercase tracking-[0.18em] text-xs"
                >
                  <Flame className="w-4 h-4 mr-2" />
                  Voir les paris ouverts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </ShimmerButton>
              </Link>
            </div>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="relative bg-black overflow-hidden border-b border-white/10">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-y border-white/10">
              <StatCell code="POT-TOT" label="Points en jeu" value={stats.totalWagered} icon={Coins} accent="yellow" beam />
              <StatCell code="BET-NB" label="Paris placés" value={stats.totalBets} icon={Activity} accent="emerald" />
              <StatCell code="BET-PND" label="En cours" value={stats.pendingBets} icon={Flame} accent="red" />
              <StatCell code="USR-NB" label="Parieurs uniques" value={stats.uniqueBettors} icon={Users} accent="purple" />
            </div>
          </div>
        </section>

        {/* MAIN GRID — open matches + side panel */}
        <section id="open-matches" className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-[1fr_380px] gap-10">
              {/* LEFT — open matches */}
              <div>
                <div className="mb-8">
                  <SectionEyebrow num="01" label="Marché ouvert" accent="emerald" />
                  <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                    Matchs <span className="text-gradient-worldcup">à parier</span>
                  </h2>
                  <p className="text-white/50 mt-3 font-mono text-sm uppercase tracking-[0.22em]">
                    {matches.length} {matches.length > 1 ? 'rencontres ouvertes' : 'rencontre ouverte'}
                  </p>
                </div>

                {matches.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/2 p-12 text-center">
                    <Flame className="h-10 w-10 text-white/15 mx-auto mb-4" />
                    <div className="text-base font-bold text-white/70">Aucun match ouvert aux paris</div>
                    <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
                      / les marchés ouvriront avant chaque match SCHEDULED
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {matches.map((m, i) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      >
                        <MatchBetCard match={m} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT — side panel */}
              <aside className="space-y-6">
                <TopOddsLeaderboard rows={topOdds} />
                <HowToBetCard />
              </aside>
            </div>
          </div>
        </section>

        {/* RECENT BETS — full width */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <SectionEyebrow num="02" label="Activité globale" accent="purple" />
              <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                Le <span className="text-gradient-worldcup">flux</span> des paris
              </h2>
              <p className="text-white/50 mt-3 font-mono text-sm uppercase tracking-[0.22em]">
                / dernières mises placées par les viewers
              </p>
            </div>

            <RecentBetsFeed bets={recentBets} />
          </div>
        </section>

        {/* META FOOTER */}
        <section className="relative bg-black py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-4 text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-3 w-3" />
                <span>/ pari mutuel · house cut configurable par match</span>
              </div>
              <div>v1 · CDM 26 betting market</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
