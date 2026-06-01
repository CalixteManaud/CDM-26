import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useMemo, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  Calendar,
  Trophy,
  Clock,
  Shield,
  Hourglass,
  Flame,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Tv,
  Swords,
  Radio,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import Marquee from '@/components/ui/marquee';

type StatusFilter = 'all' | 'SCHEDULED' | 'LIVE' | 'FINISHED';
type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED';
type MatchStage =
  | 'GROUP'
  | 'PLAYOFF'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'FINAL';

interface Tournament {
  id: string;
  name: string;
  startDate: string;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface Match {
  id: string;
  matchDate: string;
  stage: MatchStage;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam: Team;
  awayTeam: Team;
  group?: Group | null;
  tournament: Tournament;
}

type ActionResult<T> = { success: boolean; data?: T; error?: string };
type PageProps = { matches: Match[] };

const stageMeta: Record<MatchStage, { label: string; code: string; accent: string }> = {
  GROUP: { label: 'Phase de poules', code: 'GS', accent: 'text-emerald-400 border-emerald-500/30' },
  PLAYOFF: { label: 'Barrages', code: 'PO', accent: 'text-blue-400 border-blue-500/30' },
  ROUND_OF_16: { label: '8es de finale', code: 'R16', accent: 'text-emerald-400 border-emerald-500/30' },
  QUARTER_FINAL: { label: 'Quarts', code: 'QF', accent: 'text-yellow-400 border-yellow-500/30' },
  SEMI_FINAL: { label: 'Demi-finales', code: 'SF', accent: 'text-orange-400 border-orange-500/30' },
  FINAL: { label: 'Finale', code: 'F', accent: 'text-red-400 border-red-500/30' },
};

const stageOrder: MatchStage[] = [
  'GROUP',
  'PLAYOFF',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'FINAL',
];

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const { getAllMatches } = await import('@/actions/matches');
  const result = (await getAllMatches()) as ActionResult<Match[]>;
  return {
    props: {
      matches: result.success && result.data ? JSON.parse(JSON.stringify(result.data)) : [],
    },
  };
};

type Accent = 'emerald' | 'yellow' | 'red' | 'purple' | 'blue';
const ACCENT: Record<Accent, { text: string; bg: string; border: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/30' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/30' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/30' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-400', border: 'border-blue-500/30' },
};

const containerStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
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

export default function MatchesPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tournamentFilter, setTournamentFilter] = useState<string>('all');
  const reduce = useReducedMotion();

  const tournaments = useMemo(() => {
    const map = new Map<string, Tournament>();
    props.matches.forEach((m) => {
      if (!map.has(m.tournament.id)) map.set(m.tournament.id, m.tournament);
    });
    return Array.from(map.values());
  }, [props.matches]);

  const counts = useMemo(() => {
    const byStatus = props.matches.reduce(
      (acc, m) => {
        acc[m.status] = (acc[m.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<MatchStatus, number>
    );
    return {
      total: props.matches.length,
      scheduled: byStatus.SCHEDULED ?? 0,
      live: byStatus.LIVE ?? 0,
      finished: byStatus.FINISHED ?? 0,
    };
  }, [props.matches]);

  const liveMatches = useMemo(
    () => props.matches.filter((m) => m.status === 'LIVE'),
    [props.matches]
  );

  const filteredMatches = useMemo(() => {
    return props.matches.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (tournamentFilter !== 'all' && m.tournament.id !== tournamentFilter) return false;
      return true;
    });
  }, [props.matches, statusFilter, tournamentFilter]);

  const groupedByTournament = useMemo(() => {
    const grouped = new Map<string, Match[]>();
    filteredMatches.forEach((m) => {
      const key = m.tournament.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    });
    return grouped;
  }, [filteredMatches]);

  return (
    <>
      <Head>
        <title>Matchs — CDM 26</title>
        <meta name="description" content="Calendrier complet de la Coupe du Monde FIFA 26 — résultats, scores live, streams Twitch." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* ───────────────────────── HERO ───────────────────────── */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <motion.div
            aria-hidden
            className={`absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent ${
              counts.live > 0 ? 'via-red-500/70' : 'via-emerald-500/60'
            } to-transparent`}
            animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Halo d'ambiance — rouge si live en cours, sinon vert pelouse */}
          <motion.div
            aria-hidden
            className={cn(
              'absolute -top-1/3 right-0 w-2/3 h-[140%] pointer-events-none blur-3xl',
              counts.live > 0
                ? 'bg-[radial-gradient(50%_50%_at_70%_30%,rgba(220,38,38,0.16),transparent_70%)]'
                : 'bg-[radial-gradient(50%_50%_at_70%_30%,rgba(16,185,129,0.14),transparent_70%)]'
            )}
            animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="container mx-auto px-4 py-20 md:py-24 relative">
            <motion.div
              variants={reduce ? undefined : containerStagger}
              initial={reduce ? false : 'hidden'}
              animate={reduce ? undefined : 'show'}
            >
              <motion.div variants={reduce ? undefined : fadeUp}>
                <SectionEyebrow num="MTC" label="Calendrier · FIFA 26" accent={counts.live > 0 ? 'red' : 'emerald'} />
              </motion.div>
              <motion.h1
                variants={reduce ? undefined : fadeUp}
                className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight"
              >
                Tous les <span className="text-gradient-worldcup">matchs.</span>
                <br />
                <span className="italic font-light text-white/35">Tous les soirs.</span>
              </motion.h1>
              <motion.p
                variants={reduce ? undefined : fadeUp}
                className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed"
              >
                Le calendrier complet — phase de poules, élimination directe, scores live et
                streams Twitch officiels.
              </motion.p>
              <motion.div variants={reduce ? undefined : fadeUp} className="mt-7 flex flex-wrap items-center gap-3">
                {counts.live > 0 ? (
                  <button
                    onClick={() => setStatusFilter('LIVE')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 uppercase tracking-[0.22em] text-[10px] font-mono px-3 py-1 hover:bg-red-500/20 transition"
                  >
                    <span className="live-dot mr-0.5" />
                    {counts.live} match{counts.live > 1 ? 's' : ''} live · voir
                  </button>
                ) : (
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <CircleDot className="w-3 h-3 mr-1" /> Saison 2026
                  </Badge>
                )}
                <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                  <Tv className="w-3 h-3 mr-1" /> Streams Twitch
                </Badge>
              </motion.div>

              {/* Ticker live façon broadcast */}
              {counts.live > 0 && (
                <motion.div
                  variants={reduce ? undefined : fadeUp}
                  className="relative mt-10 rounded-xl border border-red-500/25 bg-red-950/15 overflow-hidden"
                >
                  <div className="absolute left-0 inset-y-0 z-10 flex items-center gap-1.5 px-3.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] font-mono">
                    <Radio className="w-3 h-3" />
                    Live
                  </div>
                  <div className="absolute right-0 inset-y-0 z-10 w-16 bg-linear-to-l from-black to-transparent pointer-events-none" />
                  <Marquee className="[--duration:26s] py-2.5 pl-[5.5rem]" pauseOnHover>
                    {liveMatches.map((m) => (
                      <LiveTickerItem key={m.id} match={m} />
                    ))}
                  </Marquee>
                </motion.div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ───────────────────────── STATS ───────────────────────── */}
        <section className="relative bg-black overflow-hidden border-b border-white/10">
          <div className="container mx-auto px-4 py-12">
            <motion.div
              variants={reduce ? undefined : containerStagger}
              initial={reduce ? false : 'hidden'}
              whileInView={reduce ? undefined : 'show'}
              viewport={{ once: true, margin: '-40px' }}
              className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-y border-white/10"
            >
              <StatCell code="MTC-TOT" label="Total" value={counts.total} icon={Calendar} accent="emerald" reduce={!!reduce} />
              <StatCell code="SCH-NXT" label="À venir" value={counts.scheduled} icon={Hourglass} accent="blue" reduce={!!reduce} />
              <StatCell
                code="LIV-NOW"
                label="En cours"
                value={counts.live}
                icon={Flame}
                accent="red"
                pulse={counts.live > 0}
                reduce={!!reduce}
              />
              <StatCell code="FIN-DON" label="Terminés" value={counts.finished} icon={CheckCircle2} accent="yellow" reduce={!!reduce} />
            </motion.div>
          </div>
        </section>

        {/* ───────────────────────── FILTRES + LISTE ───────────────────────── */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
              <div>
                <SectionEyebrow num="01" label="Sélection" accent="yellow" />
                <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                  {statusFilter === 'all' && (
                    <>
                      Toutes les <span className="text-gradient-worldcup">rencontres</span>
                    </>
                  )}
                  {statusFilter === 'LIVE' && (
                    <>
                      Matchs <span className="text-gradient-worldcup">en cours</span>
                    </>
                  )}
                  {statusFilter === 'SCHEDULED' && (
                    <>
                      <span className="italic font-light text-white/35">Encore</span>{' '}
                      <span className="text-gradient-worldcup">à jouer.</span>
                    </>
                  )}
                  {statusFilter === 'FINISHED' && (
                    <>
                      <span className="italic font-light text-white/35">Déjà</span>{' '}
                      <span className="text-gradient-worldcup">disputés.</span>
                    </>
                  )}
                </h2>
                <p className="text-white/50 mt-3 font-mono text-sm uppercase tracking-[0.22em]">
                  {filteredMatches.length} {filteredMatches.length > 1 ? 'résultats' : 'résultat'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <TabsList className="bg-white/3 border border-white/10 p-1 rounded-full h-auto gap-0.5 w-full md:w-auto">
                    <TabsTrigger
                      value="all"
                      className="rounded-full px-4 md:px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
                    >
                      Tous
                    </TabsTrigger>
                    <TabsTrigger
                      value="SCHEDULED"
                      className="rounded-full px-4 md:px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
                    >
                      À venir
                    </TabsTrigger>
                    <TabsTrigger
                      value="LIVE"
                      className="rounded-full px-4 md:px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-red-500 data-[state=active]:text-white text-white/60 gap-1.5"
                    >
                      {counts.live > 0 && <span className="live-dot" />}
                      Live
                    </TabsTrigger>
                    <TabsTrigger
                      value="FINISHED"
                      className="rounded-full px-4 md:px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
                    >
                      Terminés
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {tournaments.length > 1 && (
                  <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                    <SelectTrigger className="w-full sm:w-72 h-11 bg-white/3 border-white/15 hover:border-white/30 text-white">
                      <Trophy className="w-4 h-4 text-emerald-400 mr-1" />
                      <SelectValue placeholder="Filtrer par tournoi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les tournois</SelectItem>
                      {tournaments.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {filteredMatches.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-12">
                {Array.from(groupedByTournament.entries()).map(([tournamentId, matches]) => {
                  const tournament = matches[0].tournament;
                  const grouped = matches.reduce(
                    (acc, m) => {
                      if (!acc[m.stage]) acc[m.stage] = [];
                      acc[m.stage].push(m);
                      return acc;
                    },
                    {} as Record<MatchStage, Match[]>
                  );

                  return (
                    <div key={tournamentId} className="space-y-6">
                      <Link href={`/tournaments/${tournamentId}`}>
                        <motion.div
                          initial={reduce ? false : { opacity: 0, y: 12 }}
                          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer bg-white/3 border border-white/10 hover:border-white/30 transition-all group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
                              / TOURNOI
                            </div>
                            <h2 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight group-hover:text-emerald-300 transition-colors">
                              {tournament.name}
                            </h2>
                          </div>
                          <Badge className="ml-2 bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                            {matches.length} match{matches.length > 1 ? 's' : ''}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                        </motion.div>
                      </Link>

                      {stageOrder.map((stage) => {
                        const list = grouped[stage];
                        if (!list || list.length === 0) return null;
                        const meta = stageMeta[stage];
                        return (
                          <div key={stage} className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/3 border ${meta.accent} text-[10px] font-mono uppercase tracking-[0.25em]`}
                              >
                                <Shield className="w-3 h-3" />
                                <span>/ {meta.code}</span>
                                <span className="text-white/30">—</span>
                                <span>{meta.label}</span>
                              </div>
                              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
                                {list.length} match{list.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {list.map((m, idx) => (
                                <MatchCard key={m.id} match={m} idx={idx} reduce={!!reduce} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
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
  pulse,
  reduce,
}: {
  code: string;
  label: string;
  value: number;
  icon: typeof Trophy;
  accent: Accent;
  pulse?: boolean;
  reduce: boolean;
}) {
  const s = ACCENT[accent];
  return (
    <motion.div
      variants={reduce ? undefined : fadeUp}
      className={cn('px-4 md:px-6 py-8 first:pl-0 md:first:pl-6 relative', pulse && 'bg-red-500/[0.04]')}
    >
      {pulse && (
        <motion.span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          animate={reduce ? undefined : { boxShadow: ['inset 0 0 0 0 rgba(239,68,68,0)', 'inset 0 0 24px -6px rgba(239,68,68,0.45)', 'inset 0 0 0 0 rgba(239,68,68,0)'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-3 flex items-center gap-1.5 font-mono">
        <Icon className={`w-3 h-3 ${pulse ? 'animate-pulse' : ''}`} />
        {code}
      </div>
      <div className={`text-4xl md:text-6xl font-black mb-2 tracking-tighter tabular-nums ${s.text}`}>
        {reduce ? value : <NumberTicker value={value} />}
      </div>
      <div className="text-xs md:text-sm text-white/70 font-bold uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

function MatchCard({ match, idx, reduce }: { match: Match; idx: number; reduce: boolean }) {
  const date = new Date(match.matchDate);
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const isCanceled = match.status === 'CANCELED';
  const homeScore = match.homeScore ?? null;
  const awayScore = match.awayScore ?? null;
  const homeWin = isFinished && homeScore != null && awayScore != null && homeScore > awayScore;
  const awayWin = isFinished && homeScore != null && awayScore != null && awayScore > homeScore;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.4 }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="relative group"
    >
      <Link href={`/matches/${match.id}`} className="block h-full">
        <Card
          className={`relative overflow-hidden h-full p-0 bg-linear-to-b ${
            isLive ? 'from-red-950/30' : 'from-white/3'
          } to-transparent border-white/10 group-hover:border-white/30 transition-all duration-300`}
        >
          {/* Sheen diagonal au hover */}
          {!reduce && (
            <div className="pointer-events-none absolute inset-0 z-20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-linear-to-r from-transparent via-white/[0.07] to-transparent" />
          )}

          {/* Top status strip */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-[0.22em]">
              <Calendar className="w-3 h-3" />
              {format(date, 'd MMM yyyy', { locale: fr })}
              <span className="text-white/20">·</span>
              <Clock className="w-3 h-3" />
              {format(date, 'HH:mm')}
            </span>
            <StatusInline status={match.status} />
          </div>

          {/* Match score */}
          <div className="px-5 py-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <TeamMiniLogo team={match.homeTeam} dim={awayWin} />
                <div className={cn('min-w-0', awayWin && 'opacity-55')}>
                  <div className={cn('font-black text-sm truncate tracking-tight leading-tight', homeWin ? 'text-emerald-200' : 'text-white')}>
                    {match.homeTeam.name}
                  </div>
                  <div className="text-[10px] font-mono text-white/45 uppercase tracking-[0.22em]">
                    {match.homeTeam.shortName}
                  </div>
                </div>
              </div>

              <div className="px-2">
                {isFinished && homeScore != null && awayScore != null ? (
                  <div className="flex items-center gap-1.5 text-3xl font-black tabular-nums leading-none">
                    <span className={homeWin ? 'text-white' : 'text-white/40'}>
                      {reduce ? homeScore : <NumberTicker value={homeScore} className={homeWin ? 'text-white' : 'text-white/40'} />}
                    </span>
                    <span className="text-white/20 text-xl italic">:</span>
                    <span className={awayWin ? 'text-white' : 'text-white/40'}>
                      {reduce ? awayScore : <NumberTicker value={awayScore} delay={0.1} className={awayWin ? 'text-white' : 'text-white/40'} />}
                    </span>
                  </div>
                ) : isLive ? (
                  <motion.div
                    animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex items-center gap-1.5 text-3xl font-black tabular-nums text-red-400 leading-none drop-shadow-[0_0_14px_rgba(239,68,68,0.4)]"
                  >
                    <span>{homeScore ?? 0}</span>
                    <span className="text-red-500/40 text-xl italic animate-pulse">:</span>
                    <span>{awayScore ?? 0}</span>
                  </motion.div>
                ) : isCanceled ? (
                  <div className="text-sm font-mono uppercase tracking-[0.22em] text-white/30 line-through">
                    Annulé
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-base md:text-lg font-black text-white/30 italic tracking-wider">
                    <Swords className="w-4 h-4" />
                    VS
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 min-w-0 justify-end text-right">
                <div className={cn('min-w-0', homeWin && 'opacity-55')}>
                  <div className={cn('font-black text-sm truncate tracking-tight leading-tight', awayWin ? 'text-emerald-200' : 'text-white')}>
                    {match.awayTeam.name}
                  </div>
                  <div className="text-[10px] font-mono text-white/45 uppercase tracking-[0.22em]">
                    {match.awayTeam.shortName}
                  </div>
                </div>
                <TeamMiniLogo team={match.awayTeam} dim={homeWin} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/10 bg-white/2">
            {match.group ? (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-[0.22em]">
                <Shield className="w-3 h-3" />
                {match.group.name}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.22em]">
                # {match.id.slice(0, 6).toUpperCase()}
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
          </div>

          {/* BorderBeam : rouge permanent en live, vert→or révélé au hover sinon */}
          {isLive ? (
            <BorderBeam size={140} duration={5} colorFrom="#ef4444" colorTo="#f59e0b" borderWidth={1.5} />
          ) : (
            !reduce && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <BorderBeam size={130} duration={7} colorFrom="#10b981" colorTo="#facc15" borderWidth={1.2} />
              </div>
            )
          )}
        </Card>
      </Link>
    </motion.div>
  );
}

function LiveTickerItem({ match }: { match: Match }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center gap-2.5 text-xs font-mono whitespace-nowrap text-white/80 hover:text-white transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
      <span className="font-black uppercase tracking-[0.15em]">{match.homeTeam.shortName}</span>
      <span className="font-black tabular-nums text-red-300">{match.homeScore ?? 0}</span>
      <span className="text-white/30">–</span>
      <span className="font-black tabular-nums text-red-300">{match.awayScore ?? 0}</span>
      <span className="font-black uppercase tracking-[0.15em]">{match.awayTeam.shortName}</span>
      <span className="text-white/20 ml-1">·</span>
    </Link>
  );
}

function TeamMiniLogo({ team, dim }: { team: Team; dim?: boolean }) {
  return (
    <div
      className={cn(
        'w-10 h-10 rounded-lg overflow-hidden ring-1 ring-white/10 bg-white/5 shrink-0 transition-transform duration-300 group-hover:scale-105',
        dim && 'grayscale opacity-50'
      )}
    >
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt={team.name} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-xs">
          {team.shortName.substring(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function StatusInline({ status }: { status: MatchStatus }) {
  if (status === 'LIVE') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 font-mono">
        <span className="live-dot" />
        LIVE
      </span>
    );
  }
  if (status === 'FINISHED') {
    return <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">FT</span>;
  }
  if (status === 'CANCELED') {
    return (
      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-red-300 line-through">
        Annulé
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400 font-mono">
      <Hourglass className="w-3 h-3" />
      À venir
    </span>
  );
}

function EmptyState() {
  return (
    <Card className="relative overflow-hidden bg-white/2 border-white/10 py-20 text-center">
      <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-6 mx-auto">
        <Calendar className="w-12 h-12 text-white/40" />
      </div>
      <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">Aucun match</h3>
      <p className="text-white/55 max-w-md mx-auto px-4">
        Sélectionne un autre statut ou tournoi pour voir d&apos;autres rencontres.
      </p>
    </Card>
  );
}
