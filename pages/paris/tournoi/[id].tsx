import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy,
  Star,
  Crown,
  ArrowRight,
  Activity,
  Coins,
  ChevronLeft,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { ParisSubnav } from '@/components/betting/paris-subnav';
import { TournamentMarketCard } from '@/components/betting/tournament-market-card';
import type { Market } from '@/components/betting/market-card';

type ActionResult<T> = { success: boolean; data?: T; error?: string };

type Tournament = {
  id: string;
  name: string;
  startDate: string;
  groupCount: number;
  teamsPerGroup: number;
};

type PageProps = {
  tournament: Tournament | null;
  markets: Market[];
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const id = ctx.params?.id;
  if (typeof id !== 'string') return { notFound: true };

  const { getTournamentById } = await import('@/actions/tournaments');
  const { getTournamentMarkets } = await import('@/actions/markets');

  const [tRes, mRes] = await Promise.all([
    getTournamentById(id),
    getTournamentMarkets(id),
  ]);

  if (!tRes.success || !tRes.data) return { notFound: true };

  return {
    props: {
      tournament: JSON.parse(JSON.stringify(tRes.data)),
      markets: mRes.success && mRes.data ? JSON.parse(JSON.stringify(mRes.data)) : [],
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

export default function TournamentBettingPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { tournament, markets } = props;
  if (!tournament) return null;

  const totalPool = markets.reduce(
    (s, m) => s + m.pools.reduce((a, p) => a + p.totalPool, 0),
    0
  );
  const totalBets = markets.reduce(
    (s, m) => s + m.pools.reduce((a, p) => a + p.betCount, 0),
    0
  );
  const totalOptions = markets.reduce((s, m) => s + m.pools.length, 0);

  const topScorer = markets.find((m) => m.type === 'TOURNAMENT_TOP_SCORER');
  const mvp = markets.find((m) => m.type === 'TOURNAMENT_MVP');
  const winner = markets.find((m) => m.type === 'TOURNAMENT_WINNER');

  return (
    <>
      <Head>
        <title>{tournament.name} — Paris longue durée — CDM 26</title>
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        <ParisSubnav active="live" />

        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-20 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-yellow-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-16 md:py-20 relative">
            <Link
              href="/paris"
              className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-white/45 hover:text-white mb-6"
            >
              <ChevronLeft className="w-3 h-3" />
              Retour aux paris
            </Link>

            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <SectionEyebrow num="LONG" label="Paris longue durée" accent="yellow" />
                <h1 className="text-4xl md:text-6xl font-black mt-5 leading-[0.92] tracking-tight">
                  <span className="text-gradient-worldcup">{tournament.name}</span>
                  <br />
                  <span className="italic font-light text-white/35">les marchés du tournoi.</span>
                </h1>
                <p className="text-white/60 mt-6 max-w-2xl text-base md:text-lg leading-relaxed">
                  Vainqueur du tournoi, meilleur buteur, MVP. Les paris ferment au coup d'envoi
                  du premier match concerné. Cotes en pari mutuel — elles bougent à chaque mise.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Trophy className="w-3 h-3 mr-1" /> {markets.length} marchés
                  </Badge>
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Activity className="w-3 h-3 mr-1" /> {totalOptions} options
                  </Badge>
                </div>
              </div>
              <Link href={`/tournaments/${tournament.id}`}>
                <ShimmerButton
                  background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                  shimmerColor="#ffffff"
                  className="px-7 py-4 font-black uppercase tracking-[0.18em] text-xs"
                >
                  Voir le tournoi
                  <ArrowRight className="w-4 h-4 ml-2" />
                </ShimmerButton>
              </Link>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="relative bg-black overflow-hidden border-b border-white/10">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border-y border-white/10">
              <StatCell code="POT" label="Points en jeu" value={totalPool} icon={Coins} accent="yellow" beam />
              <StatCell code="BETS" label="Paris placés" value={totalBets} icon={Activity} accent="emerald" />
              <StatCell code="OPT" label="Options ouvertes" value={totalOptions} icon={Star} accent="purple" />
            </div>
          </div>
        </section>

        {/* MARKETS */}
        <section className="relative bg-black border-b border-white/10 py-14">
          <div className="container mx-auto px-4 space-y-8">
            {markets.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
                <Crown className="h-10 w-10 text-white/15 mx-auto mb-4" />
                <div className="text-base font-bold text-white/70">
                  Aucun marché ouvert sur ce tournoi
                </div>
                <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
                  / un admin doit créer les marchés via /admin/markets
                </div>
              </div>
            ) : (
              <>
                {winner && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="mb-3">
                      <SectionEyebrow num="01" label="Vainqueur du tournoi" accent="emerald" />
                    </div>
                    <TournamentMarketCard market={winner} />
                  </motion.div>
                )}
                {topScorer && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <div className="mb-3">
                      <SectionEyebrow num="02" label="Meilleur buteur" accent="yellow" />
                    </div>
                    <TournamentMarketCard market={topScorer} />
                  </motion.div>
                )}
                {mvp && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="mb-3">
                      <SectionEyebrow num="03" label="MVP" accent="purple" />
                    </div>
                    <TournamentMarketCard market={mvp} />
                  </motion.div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="relative bg-black py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-4 text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
              <div className="flex items-center gap-3">
                <Trophy className="h-3 w-3" />
                <span>/ marchés réglés à la fin du tournoi · settle admin</span>
              </div>
              <div>v1 · CDM 26 long-term betting</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
