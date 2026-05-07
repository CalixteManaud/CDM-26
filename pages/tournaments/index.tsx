import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Trophy,
  Plus,
  Calendar,
  Users,
  ArrowRight,
  Flame,
  Hourglass,
  Crown,
  ChevronRight,
  CircleDot,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useUser } from '@clerk/nextjs';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Button } from '@/components/ui/button';

type Tournament = {
  id: string;
  name: string;
  startDate: string;
  groupCount: number;
  groupStageComplete: boolean;
  _count?: { teams: number };
};

type ActionResult<T> = { success: boolean; data?: T; error?: string };
type PageProps = { tournaments: Tournament[] };
type FilterId = 'all' | 'active' | 'upcoming';

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  // Dynamic import volontaire : empêche Prisma/Clerk-server de fuiter dans le bundle client (Pages Router).
  const { getTournaments } = await import('@/actions/tournaments');
  const result = (await getTournaments()) as ActionResult<Tournament[]>;
  return {
    props: {
      tournaments: result.success && result.data ? JSON.parse(JSON.stringify(result.data)) : [],
    },
  };
};

type Accent = 'emerald' | 'yellow' | 'red' | 'purple';
const ACCENT: Record<Accent, { text: string; bg: string; border: string; ring: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/25', ring: 'from-emerald-950/40' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/25', ring: 'from-yellow-950/40' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/25', ring: 'from-red-950/40' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/25', ring: 'from-purple-950/40' },
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

export default function TournamentsPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { tournaments } = props;
  const { user } = useUser();
  const router = useRouter();
  const isAdmin = user?.publicMetadata?.role === 'ADMIN';

  const [filter, setFilter] = useState<FilterId>('all');

  useEffect(() => {
    const q = router.query.filter;
    if (q === 'upcoming' || q === 'active' || q === 'all') setFilter(q);
  }, [router.query.filter]);

  const now = new Date();

  const counts = useMemo(() => {
    const active = tournaments.filter((t) => {
      const d = new Date(t.startDate);
      return d <= now && !t.groupStageComplete;
    }).length;
    const upcoming = tournaments.filter((t) => new Date(t.startDate) > now).length;
    const totalTeams = tournaments.reduce((acc, t) => acc + (t._count?.teams ?? 0), 0);
    return { all: tournaments.length, active, upcoming, totalTeams };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournaments]);

  const filtered = tournaments.filter((t) => {
    const d = new Date(t.startDate);
    if (filter === 'all') return true;
    if (filter === 'active') return d <= now && !t.groupStageComplete;
    if (filter === 'upcoming') return d > now;
    return true;
  });

  return (
    <>
      <Head>
        <title>Tournois — CDM 26</title>
        <meta name="description" content="Toutes les compétitions CDM 26. Phase de poules, brackets en temps réel, suivi live sur Twitch." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-20 md:py-24 relative">
            <div className="flex items-end justify-between flex-wrap gap-8">
              <div>
                <SectionEyebrow num="TRN" label="Compétitions FIFA 26" accent="emerald" />
                <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
                  Les <span className="text-gradient-worldcup">tournois</span>
                  <br />
                  <span className="italic font-light text-white/35">de la saison.</span>
                </h1>
                <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
                  Toutes les compétitions disponibles. Suivi des brackets en temps réel,
                  phase de poules + élimination directe, diffusion live sur Twitch.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <CircleDot className="w-3 h-3 mr-1" /> Saison 2026
                  </Badge>
                  <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Tv className="w-3 h-3 mr-1" /> Twitch officiel
                  </Badge>
                </div>
              </div>

              {isAdmin && (
                <Link href="/tournaments/new">
                  <ShimmerButton
                    background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                    shimmerColor="#ffffff"
                    className="px-7 py-4 font-black uppercase tracking-[0.18em] text-xs"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un tournoi
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </ShimmerButton>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="relative bg-black overflow-hidden border-b border-white/10">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-y border-white/10">
              <StatCell code="ALL-TOT" label="Tournois" value={counts.all} icon={Trophy} accent="emerald" />
              <StatCell code="ACT-LIVE" label="En cours" value={counts.active} icon={Flame} accent="red" />
              <StatCell code="SCH-NXT" label="À venir" value={counts.upcoming} icon={Hourglass} accent="yellow" />
              <StatCell code="TMS-ENG" label="Équipes engagées" value={counts.totalTeams} icon={Users} accent="purple" />
            </div>
          </div>
        </section>

        {/* FILTERS + GRID */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
              <div>
                <SectionEyebrow num="01" label="Sélection" accent="yellow" />
                <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                  {filter === 'all' && (
                    <>
                      Toutes les <span className="text-gradient-worldcup">compétitions</span>
                    </>
                  )}
                  {filter === 'active' && (
                    <>
                      Compétitions <span className="text-gradient-worldcup">en cours</span>
                    </>
                  )}
                  {filter === 'upcoming' && (
                    <>
                      Compétitions <span className="text-gradient-worldcup">à venir</span>
                    </>
                  )}
                </h2>
                <p className="text-white/50 mt-3 font-mono text-sm uppercase tracking-[0.22em]">
                  {filtered.length} {filtered.length > 1 ? 'résultats' : 'résultat'}
                </p>
              </div>

              <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterId)}>
                <TabsList className="bg-white/3 border border-white/10 p-1 rounded-full h-auto gap-0.5">
                  <TabsTrigger
                    value="all"
                    className="rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
                  >
                    Tous
                  </TabsTrigger>
                  <TabsTrigger
                    value="active"
                    className="rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
                  >
                    En cours
                  </TabsTrigger>
                  <TabsTrigger
                    value="upcoming"
                    className="rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
                  >
                    À venir
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {filtered.length === 0 ? (
              <EmptyState filter={filter} isAdmin={isAdmin} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((t, i) => (
                  <TournamentCard key={t.id} tournament={t} now={now} idx={i} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function StatCell({
  code,
  label,
  value,
  icon: Icon,
  accent,
}: {
  code: string;
  label: string;
  value: number;
  icon: typeof Trophy;
  accent: Accent;
}) {
  const s = ACCENT[accent];
  return (
    <div className="px-4 md:px-6 py-8 first:pl-0 md:first:pl-6">
      <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-3 flex items-center gap-1.5 font-mono">
        <Icon className="w-3 h-3" />
        {code}
      </div>
      <div className={`text-4xl md:text-6xl font-black mb-2 tracking-tighter tabular-nums ${s.text}`}>
        <NumberTicker value={value} />
      </div>
      <div className="text-xs md:text-sm text-white/70 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}

function TournamentCard({
  tournament,
  now,
  idx,
}: {
  tournament: Tournament;
  now: Date;
  idx: number;
}) {
  const startDate = new Date(tournament.startDate);
  const isUpcoming = startDate > now;
  const teamCount = tournament._count?.teams ?? 0;

  const status: { label: string; tone: 'upcoming' | 'live' | 'final' } = isUpcoming
    ? { label: 'À venir', tone: 'upcoming' }
    : tournament.groupStageComplete
    ? { label: 'Phase finale', tone: 'final' }
    : { label: 'En cours', tone: 'live' };

  const isLive = status.tone === 'live';
  const isFinal = status.tone === 'final';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="relative group"
    >
      <Link href={`/tournaments/${tournament.id}`} className="block h-full">
        <Card
          className={`relative overflow-hidden h-full p-0 bg-linear-to-b ${
            isLive ? 'from-red-950/30' : isFinal ? 'from-purple-950/30' : 'from-white/3'
          } to-transparent border-white/10 group-hover:border-white/30 transition-all duration-300`}
        >
          {/* Top status strip */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono">
              # {tournament.id.slice(0, 6).toUpperCase()}
            </span>
            <StatusInline tone={status.tone}>{status.label}</StatusInline>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="flex items-start gap-3 mb-5">
              <div
                className={`w-11 h-11 rounded-xl bg-white/5 border ${
                  isLive ? 'border-red-500/30' : isFinal ? 'border-purple-500/30' : 'border-white/15'
                } flex items-center justify-center shrink-0`}
              >
                <Trophy
                  className={`w-5 h-5 ${
                    isLive ? 'text-red-400' : isFinal ? 'text-purple-400' : 'text-emerald-400'
                  }`}
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-[1.1] group-hover:text-white">
                {tournament.name}
              </h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="flex items-center gap-2 text-white/50 font-mono text-xs uppercase tracking-[0.18em]">
                  <Calendar className="w-3.5 h-3.5" />
                  Coup d'envoi
                </span>
                <span className="text-white/85 font-bold">
                  {format(startDate, 'd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="flex items-center gap-2 text-white/50 font-mono text-xs uppercase tracking-[0.18em]">
                  <Users className="w-3.5 h-3.5" />
                  Équipes
                </span>
                <span className="text-white font-black tabular-nums text-base">{teamCount}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="flex items-center gap-2 text-white/50 font-mono text-xs uppercase tracking-[0.18em]">
                  <Trophy className="w-3.5 h-3.5" />
                  Groupes
                </span>
                <span className="text-white font-black tabular-nums text-base">{tournament.groupCount}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between bg-white/2">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50 font-mono">
              Voir le tournoi
            </span>
            <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition" />
          </div>

          {isLive && (
            <BorderBeam size={150} duration={7} colorFrom="#ef4444" colorTo="#f59e0b" borderWidth={1.5} />
          )}
          {isFinal && (
            <BorderBeam size={150} duration={9} colorFrom="#a855f7" colorTo="#facc15" borderWidth={1.5} />
          )}
        </Card>
      </Link>
    </motion.div>
  );
}

function StatusInline({
  tone,
  children,
}: {
  tone: 'upcoming' | 'live' | 'final';
  children: React.ReactNode;
}) {
  if (tone === 'live') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 font-mono">
        <span className="live-dot" />
        LIVE · {children}
      </span>
    );
  }
  if (tone === 'final') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-purple-300 font-mono">
        <Crown className="w-3 h-3" />
        {children}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400 font-mono">
      <Hourglass className="w-3 h-3" />
      {children}
    </span>
  );
}

function EmptyState({ filter, isAdmin }: { filter: FilterId; isAdmin: boolean }) {
  const message =
    filter === 'all'
      ? "Aucun tournoi n'est encore disponible. Lance la première compétition de la saison."
      : filter === 'active'
      ? 'Aucune compétition en cours pour le moment. Les prochaines journées arrivent vite.'
      : 'Pas de tournoi planifié dans le futur. Reviens bientôt ou crée-en un.';

  return (
    <Card className="relative overflow-hidden bg-white/2 border-white/10 py-20 text-center">
      <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-6 mx-auto">
        <Trophy className="w-12 h-12 text-white/40" />
      </div>
      <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">Aucun tournoi trouvé</h3>
      <p className="text-white/55 max-w-md mx-auto mb-8 px-4">{message}</p>
      {isAdmin && (
        <Link href="/tournaments/new" className="inline-flex">
          <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
            <Plus className="w-4 h-4 mr-1.5" />
            Créer un tournoi
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      )}
    </Card>
  );
}
