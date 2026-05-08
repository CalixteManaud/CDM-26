import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Trophy,
  Lock,
  Tv,
  ArrowRight,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { ParisSubnav } from '@/components/betting/paris-subnav';
import { MyBetsHistory } from '@/components/betting/my-bets-history';

type ActionResult<T> = { success: boolean; data?: T; error?: string };

type Bet = Parameters<typeof MyBetsHistory>[0]['bets'][number];

type Stats = {
  totalBets: number;
  wonCount: number;
  lostCount: number;
  pendingCount: number;
  voidCount: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  winRate: number;
  roi: number;
};

type PageProps =
  | { signedIn: false; userTwitchUsername: null; bets: Bet[]; stats: null }
  | { signedIn: true; userTwitchUsername: string | null; bets: Bet[]; stats: Stats };

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getCurrentDbUserFromReq } = await import('@/lib/auth/page-auth');
  const dbUser = await getCurrentDbUserFromReq(ctx.req);

  if (!dbUser) {
    return {
      props: { signedIn: false, userTwitchUsername: null, bets: [], stats: null },
    };
  }

  const { getUserBetsHistory } = await import('@/actions/betting');
  const result = (await getUserBetsHistory(dbUser.id)) as ActionResult<{
    bets: Bet[];
    stats: Stats;
  }>;

  if (!result.success || !result.data) {
    return {
      props: {
        signedIn: true,
        userTwitchUsername: dbUser.twitchUsername,
        bets: [],
        stats: {
          totalBets: 0,
          wonCount: 0,
          lostCount: 0,
          pendingCount: 0,
          voidCount: 0,
          totalWagered: 0,
          totalWon: 0,
          netProfit: 0,
          winRate: 0,
          roi: 0,
        },
      },
    };
  }

  return {
    props: {
      signedIn: true,
      userTwitchUsername: dbUser.twitchUsername,
      bets: JSON.parse(JSON.stringify(result.data.bets)),
      stats: result.data.stats,
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
  formatted,
  icon: Icon,
  accent,
  beam,
  hint,
}: {
  code: string;
  label: string;
  value: number;
  formatted?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  beam?: boolean;
  hint?: string;
}) {
  const s = ACCENT[accent];
  return (
    <div className="relative px-4 md:px-8 py-7 group overflow-hidden">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-3">
        <Icon className={`h-3.5 w-3.5 ${s.text}`} />
        / {code}
      </div>
      <div className={`text-4xl md:text-5xl font-black tracking-tight tabular-nums leading-none ${s.text}`}>
        {formatted ?? <NumberTicker value={value} />}
      </div>
      <div className="text-[11px] uppercase tracking-[0.22em] font-mono text-white/55 mt-3">{label}</div>
      {hint && <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/30 mt-1">{hint}</div>}
      {beam && <BorderBeam size={70} duration={9} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1.2} />}
    </div>
  );
}

export default function MyBetsPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!props.signedIn) {
    return (
      <>
        <Head>
          <title>Mes paris — CDM 26</title>
        </Head>
        <div className="relative bg-black text-white min-h-screen">
          <ParisSubnav active="mine" />
          <div className="container mx-auto px-4 py-24">
            <div className="max-w-xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/4 border border-white/10 mb-6">
                <Lock className="w-7 h-7 text-yellow-300" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                <span className="text-gradient-worldcup">Connexion</span> requise
              </h1>
              <p className="text-white/55 mt-4 text-base leading-relaxed">
                Connecte-toi pour voir tes paris, ton historique de gains/pertes et ton ROI personnel.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                <Link href="/sign-in">
                  <ShimmerButton
                    background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                    shimmerColor="#ffffff"
                    className="px-7 py-4 font-black uppercase tracking-[0.18em] text-xs"
                  >
                    Connexion
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </ShimmerButton>
                </Link>
                <Link
                  href="/sign-up"
                  className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/55 hover:text-white"
                >
                  / créer un compte
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { stats, bets, userTwitchUsername } = props;
  const isProfit = stats.netProfit >= 0;
  const NetIcon = isProfit ? TrendingUp : TrendingDown;

  return (
    <>
      <Head>
        <title>Mes paris — CDM 26</title>
        <meta name="description" content="Historique personnel des paris CDM 26 + stats (ROI, win rate, gains)." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        <ParisSubnav active="mine" />

        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-20 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-16 md:py-20 relative">
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <SectionEyebrow num="ME" label="Bilan personnel" accent="emerald" />
                <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
                  Mes <span className="text-gradient-worldcup">paris</span>
                  <br />
                  <span className="italic font-light text-white/35">en chiffres.</span>
                </h1>
                <p className="text-white/60 mt-6 max-w-2xl text-base md:text-lg leading-relaxed">
                  Tous tes paris (Twitch chat + site), tes gains et pertes, ton ROI.
                  Les paris en cours apparaissent en haut, les anciens en dessous.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {userTwitchUsername ? (
                    <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                      <Tv className="w-3 h-3 mr-1" /> @{userTwitchUsername}
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                      <Tv className="w-3 h-3 mr-1" /> Twitch non lié
                    </Badge>
                  )}
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Activity className="w-3 h-3 mr-1" /> {stats.totalBets} paris
                  </Badge>
                </div>
              </div>
              <Link href="/paris">
                <ShimmerButton
                  background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                  shimmerColor="#ffffff"
                  className="px-7 py-4 font-black uppercase tracking-[0.18em] text-xs"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Placer un nouveau pari
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
              <StatCell
                code="STAKE"
                label="Total misé"
                value={stats.totalWagered}
                formatted={`${stats.totalWagered.toLocaleString('fr-FR')}`}
                icon={Coins}
                accent="yellow"
              />
              <StatCell
                code="NET"
                label={isProfit ? 'Bénéfice net' : 'Pertes nettes'}
                value={Math.abs(stats.netProfit)}
                formatted={`${isProfit ? '+' : '−'}${Math.abs(stats.netProfit).toLocaleString('fr-FR')}`}
                icon={NetIcon}
                accent={isProfit ? 'emerald' : 'red'}
                beam
                hint={`ROI ${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}
              />
              <StatCell
                code="HIT"
                label="Win rate"
                value={Math.round(stats.winRate)}
                formatted={`${stats.winRate.toFixed(1)}%`}
                icon={Target}
                accent="purple"
                hint={`${stats.wonCount}W · ${stats.lostCount}L`}
              />
              <StatCell
                code="OPEN"
                label="En cours"
                value={stats.pendingCount}
                icon={Trophy}
                accent="emerald"
                hint={stats.pendingCount > 0 ? 'résultats à venir' : '—'}
              />
            </div>
          </div>
        </section>

        {/* HISTORY */}
        <section className="relative bg-black border-b border-white/10 py-14">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <SectionEyebrow num="01" label="Historique" accent="yellow" />
              <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                Tous mes <span className="text-gradient-worldcup">paris</span>
              </h2>
              <p className="text-white/50 mt-3 font-mono text-sm uppercase tracking-[0.22em]">
                / 200 paris max · classés du plus récent au plus ancien
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <MyBetsHistory bets={bets} />
            </motion.div>
          </div>
        </section>

        {/* META FOOTER */}
        <section className="relative bg-black py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-4 text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
              <div className="flex items-center gap-3">
                <Trophy className="h-3 w-3" />
                <span>/ stats calculées sur l'ensemble de tes paris settled</span>
              </div>
              <div>v1 · CDM 26 betting account</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
