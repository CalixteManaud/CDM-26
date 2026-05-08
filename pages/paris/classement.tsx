import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Award, Coins, Flame, ArrowRight, Activity } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { ParisSubnav } from '@/components/betting/paris-subnav';
import { BettorsLeaderboard } from '@/components/betting/bettors-leaderboard';

type ActionResult<T> = { success: boolean; data?: T; error?: string };
type Row = Parameters<typeof BettorsLeaderboard>[0]['rows'][number];

type PageProps = {
  rows: Row[];
  totalSettled: number;
  totalProfitDistributed: number;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const { getBettorsLeaderboard } = await import('@/actions/betting');
  const result = (await getBettorsLeaderboard(50)) as ActionResult<Row[]>;
  const rows = result.success && result.data ? JSON.parse(JSON.stringify(result.data)) : [];

  const totalSettled = rows.reduce((s: number, r: Row) => s + r.totalBets, 0);
  const totalProfitDistributed = rows.reduce(
    (s: number, r: Row) => s + (r.netProfit > 0 ? r.netProfit : 0),
    0
  );

  return { props: { rows, totalSettled, totalProfitDistributed } };
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

export default function LeaderboardPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { rows, totalSettled, totalProfitDistributed } = props;

  return (
    <>
      <Head>
        <title>Classement parieurs — CDM 26</title>
        <meta name="description" content="Classement saison des parieurs CDM 26 — bénéfice net, ROI, win rate." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        <ParisSubnav active="leaderboard" />

        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-20 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-purple-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-16 md:py-20 relative">
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <SectionEyebrow num="TOP" label="Classement saison" accent="purple" />
                <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
                  Le <span className="text-gradient-worldcup">leaderboard</span>
                  <br />
                  <span className="italic font-light text-white/35">des parieurs.</span>
                </h1>
                <p className="text-white/60 mt-6 max-w-2xl text-base md:text-lg leading-relaxed">
                  Classement basé sur les paris résolus. Tri par bénéfice net, ROI, win rate ou volume misé.
                  Les paris en cours ne comptent pas tant qu'ils ne sont pas settled.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Trophy className="w-3 h-3 mr-1" /> Saison 26
                  </Badge>
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Activity className="w-3 h-3 mr-1" /> {rows.length} parieurs classés
                  </Badge>
                </div>
              </div>
              <Link href="/paris">
                <ShimmerButton
                  background="linear-gradient(110deg, #9333ea 0%, #facc15 50%, #dc2626 100%)"
                  shimmerColor="#ffffff"
                  className="px-7 py-4 font-black uppercase tracking-[0.18em] text-xs"
                >
                  <Flame className="w-4 h-4 mr-2" />
                  Rejoindre le classement
                  <ArrowRight className="w-4 h-4 ml-2" />
                </ShimmerButton>
              </Link>
            </div>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="relative bg-black overflow-hidden border-b border-white/10">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border-y border-white/10">
              <StatCell code="USR" label="Parieurs classés" value={rows.length} icon={Award} accent="purple" />
              <StatCell code="BET-S" label="Paris résolus" value={totalSettled} icon={Activity} accent="emerald" beam />
              <StatCell code="WIN-PTS" label="Points distribués (top)" value={totalProfitDistributed} icon={Coins} accent="yellow" />
            </div>
          </div>
        </section>

        {/* LEADERBOARD */}
        <section className="relative bg-black border-b border-white/10 py-14">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <SectionEyebrow num="01" label="Top 50" accent="yellow" />
              <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                Les <span className="text-gradient-worldcup">meilleurs</span>
              </h2>
              <p className="text-white/50 mt-3 font-mono text-sm uppercase tracking-[0.22em]">
                / change le tri en haut du tableau
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <BettorsLeaderboard rows={rows} />
            </motion.div>
          </div>
        </section>

        {/* META FOOTER */}
        <section className="relative bg-black py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-4 text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
              <div className="flex items-center gap-3">
                <Trophy className="h-3 w-3" />
                <span>/ classement mis à jour à chaque settlement de match</span>
              </div>
              <div>v1 · CDM 26 betting leaderboard</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
