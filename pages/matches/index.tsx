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
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
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
  twitchUrl?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  group?: Group | null;
  tournament: Tournament;
}

type ActionResult<T> = { success: boolean; data?: T; error?: string };
type PageProps = { matches: Match[] };

// Stage → code court + couleur de l'onglet du scorebug (la barre verticale qui
// signale la compétition, comme sur un bandeau de diffusion).
const stageMeta: Record<MatchStage, { label: string; code: string; bar: string; text: string }> = {
  GROUP: { label: 'Phase de poules', code: 'GS', bar: 'bg-emerald-500', text: 'text-emerald-300' },
  PLAYOFF: { label: 'Barrages', code: 'PO', bar: 'bg-blue-500', text: 'text-blue-300' },
  ROUND_OF_16: { label: '8es de finale', code: 'R16', bar: 'bg-teal-400', text: 'text-teal-300' },
  QUARTER_FINAL: { label: 'Quarts', code: 'QF', bar: 'bg-yellow-500', text: 'text-yellow-300' },
  SEMI_FINAL: { label: 'Demi-finales', code: 'SF', bar: 'bg-orange-500', text: 'text-orange-300' },
  FINAL: { label: 'Finale', code: 'F', bar: 'bg-red-500', text: 'text-red-300' },
};

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

function SectionEyebrow({ label, code, accent }: { label: string; code: string; accent: Accent }) {
  const s = ACCENT[accent];
  return (
    <div className={`inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold ${s.text}`}>
      <span className={`block w-12 h-px ${s.bg}`} />
      <span className="font-mono">/ {code}</span>
      <span className="text-white/30">—</span>
      <span>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule helpers
// ─────────────────────────────────────────────────────────────────────────────

type DaySection = { key: string; date: Date; matches: Match[] };

function dayLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return 'Demain';
  if (isYesterday(date)) return 'Hier';
  const s = format(date, 'EEEE d MMMM', { locale: fr });
  return s.charAt(0).toUpperCase() + s.slice(1);
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

  const liveTicker = useMemo(
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

  // ── Construction de la grille de programme ────────────────────────────────
  const { live, upcoming, past } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const liveList = filteredMatches.filter((m) => m.status === 'LIVE');
    const rest = filteredMatches.filter((m) => m.status !== 'LIVE');

    const byDay = new Map<string, DaySection>();
    for (const m of rest) {
      const d = new Date(m.matchDate);
      const key = format(d, 'yyyy-MM-dd');
      if (!byDay.has(key)) {
        byDay.set(key, { key, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), matches: [] });
      }
      byDay.get(key)!.matches.push(m);
    }
    const days = Array.from(byDay.values());

    const ts = (m: Match) => new Date(m.matchDate).getTime();
    const up = days
      .filter((d) => d.date.getTime() >= todayStart.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((d) => ({ ...d, matches: [...d.matches].sort((x, y) => ts(x) - ts(y)) }));
    const pa = days
      .filter((d) => d.date.getTime() < todayStart.getTime())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((d) => ({ ...d, matches: [...d.matches].sort((x, y) => ts(y) - ts(x)) }));

    return { live: liveList, upcoming: up, past: pa };
  }, [filteredMatches]);

  const hasAnything = live.length > 0 || upcoming.length > 0 || past.length > 0;

  return (
    <>
      <Head>
        <title>Programme — CDM 26</title>
        <meta name="description" content="Le programme de la Coupe du Monde FIFA 26 : qui joue, à quelle heure, en direct sur Twitch. Scores live et résultats." />
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
                <SectionEyebrow code="PRG" label="Programme · FIFA 26" accent={counts.live > 0 ? 'red' : 'emerald'} />
              </motion.div>
              <motion.h1
                variants={reduce ? undefined : fadeUp}
                className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight"
              >
                Le <span className="text-gradient-worldcup">programme.</span>
                <br />
                <span className="italic font-light text-white/35">Ce qui se joue, ce soir.</span>
              </motion.h1>
              <motion.p
                variants={reduce ? undefined : fadeUp}
                className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed"
              >
                Chaque rencontre à l&apos;heure dite, en direct sur Twitch. Suis le fil de la
                soirée — qui entre en lice, le score en temps réel, et où regarder.
              </motion.p>
              <motion.div variants={reduce ? undefined : fadeUp} className="mt-7 flex flex-wrap items-center gap-3">
                {counts.live > 0 ? (
                  <button
                    onClick={() => setStatusFilter('LIVE')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 uppercase tracking-[0.22em] text-[10px] font-mono px-3 py-1 hover:bg-red-500/20 transition"
                  >
                    <span className="live-dot mr-0.5" />
                    {counts.live} match{counts.live > 1 ? 's' : ''} à l&apos;antenne · voir
                  </button>
                ) : (
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <CircleDot className="w-3 h-3 mr-1" /> Saison 2026
                  </Badge>
                )}
                <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                  <Tv className="w-3 h-3 mr-1" /> En direct sur Twitch
                </Badge>
              </motion.div>

              {/* Bandeau défilant façon antenne */}
              {counts.live > 0 && (
                <motion.div
                  variants={reduce ? undefined : fadeUp}
                  className="relative mt-10 rounded-xl border border-red-500/25 bg-red-950/15 overflow-hidden"
                >
                  <div className="absolute left-0 inset-y-0 z-10 flex items-center gap-1.5 px-3.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] font-mono">
                    <Radio className="w-3 h-3" />
                    On Air
                  </div>
                  <div className="absolute right-0 inset-y-0 z-10 w-16 bg-linear-to-l from-black to-transparent pointer-events-none" />
                  <Marquee className="[--duration:26s] py-2.5 pl-[5.5rem]" pauseOnHover>
                    {liveTicker.map((m) => (
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
                label="À l'antenne"
                value={counts.live}
                icon={Flame}
                accent="red"
                pulse={counts.live > 0}
                reduce={!!reduce}
              />
              <StatCell code="FIN-DON" label="Joués" value={counts.finished} icon={CheckCircle2} accent="yellow" reduce={!!reduce} />
            </motion.div>
          </div>
        </section>

        {/* ───────────────────────── PROGRAMME ───────────────────────── */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="mb-10 space-y-6">
              <div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.9]">
                  À l&apos;<span className="text-gradient-worldcup">affiche</span>
                </h2>
                <p className="text-white/45 mt-2.5 font-mono text-[11px] uppercase tracking-[0.28em]">
                  {filteredMatches.length} {filteredMatches.length > 1 ? 'rencontres' : 'rencontre'} · dans l&apos;ordre de la soirée
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <TabsList className="bg-white/3 border border-white/10 p-1 rounded-full h-auto gap-0.5 w-full sm:w-auto">
                    <TabsTrigger
                      value="all"
                      className="rounded-full px-4 md:px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60"
                    >
                      Tout
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
                      Joués
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {tournaments.length > 1 && (
                  <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                    <SelectTrigger className="w-full sm:w-60 h-10 rounded-full bg-white/3 border-white/10 hover:border-white/25 text-white text-[13px]">
                      <Trophy className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
                      <SelectValue placeholder="Tous les tournois" />
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

            {!hasAnything ? (
              <EmptyState />
            ) : (
              <div className="space-y-12">
                {live.length > 0 && (
                  <ScheduleDay
                    title="En direct"
                    meta="à l'antenne maintenant"
                    matches={live}
                    variant="live"
                    reduce={!!reduce}
                  />
                )}

                {upcoming.map((d) => (
                  <ScheduleDay
                    key={d.key}
                    title={dayLabel(d.date)}
                    meta={format(d.date, 'd MMM yyyy', { locale: fr })}
                    matches={d.matches}
                    variant="upcoming"
                    reduce={!!reduce}
                  />
                ))}

                {past.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 pt-2">
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.32em] text-white/35">
                        Résultats · déjà joués
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    {past.map((d) => (
                      <ScheduleDay
                        key={d.key}
                        title={dayLabel(d.date)}
                        meta={format(d.date, 'd MMM yyyy', { locale: fr })}
                        matches={d.matches}
                        variant="past"
                        reduce={!!reduce}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE DAY — un jour de programme = en-tête + rail horaire + scorebugs
// ─────────────────────────────────────────────────────────────────────────────

function ScheduleDay({
  title,
  meta,
  matches,
  variant,
  reduce,
}: {
  title: string;
  meta: string;
  matches: Match[];
  variant: 'live' | 'upcoming' | 'past';
  reduce: boolean;
}) {
  const isLive = variant === 'live';
  return (
    <div>
      {/* Day header */}
      <div className="flex items-center gap-3 mb-5">
        {isLive && <span className="live-dot" />}
        <span className={cn('text-lg md:text-2xl font-black tracking-tight', isLive ? 'text-red-300' : 'text-white')}>
          {title}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/40">{meta}</span>
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35 tabular-nums">
          {matches.length} match{matches.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Rail + rows */}
      <div className="relative">
        <div className={cn('hidden md:block absolute left-[4.25rem] top-1.5 bottom-1.5 w-px', isLive ? 'bg-red-500/30' : 'bg-white/10')} />
        <div className="space-y-2.5">
          {matches.map((m, i) => (
            <Scorebug key={m.id} match={m} idx={i} reduce={reduce} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOREBUG — la signature : un match rendu comme le bandeau d'un stream
// ─────────────────────────────────────────────────────────────────────────────

function Scorebug({ match, idx, reduce }: { match: Match; idx: number; reduce: boolean }) {
  const date = new Date(match.matchDate);
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const isCanceled = match.status === 'CANCELED';
  const hs = match.homeScore ?? null;
  const as = match.awayScore ?? null;
  const homeWin = isFinished && hs != null && as != null && hs > as;
  const awayWin = isFinished && hs != null && as != null && as > hs;
  const stage = stageMeta[match.stage];

  const dotColor = isLive ? 'bg-red-500' : isFinished ? 'bg-white/35' : isCanceled ? 'bg-white/15' : 'bg-emerald-400';
  const statusShort = isLive ? 'live' : isFinished ? 'ft' : isCanceled ? 'annulé' : 'à venir';

  const barTone = isLive
    ? 'bg-red-950/25 border-red-500/30 group-hover:border-red-500/50'
    : isCanceled
    ? 'bg-white/[0.02] border-white/5 opacity-60'
    : 'bg-white/[0.025] border-white/10 group-hover:border-white/25';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: Math.min(idx * 0.03, 0.25), duration: 0.4 }}
      className="group"
    >
      <Link
        href={`/matches/${match.id}`}
        className="grid grid-cols-1 md:grid-cols-[4.25rem_1fr] gap-2 md:gap-0 items-stretch"
      >
        {/* Time gutter (desktop) — la colonne vertébrale mono, nœud posé sur le rail */}
        <div className="hidden md:flex relative flex-col items-end justify-center pr-5">
          <span className={cn('font-mono text-base font-black tabular-nums leading-none', isLive ? 'text-red-300' : 'text-white/85')}>
            {format(date, 'HH:mm')}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/35 mt-1">{statusShort}</span>
          <span
            className={cn(
              'absolute right-[-4.5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-black',
              dotColor,
              isLive && !reduce && 'animate-pulse'
            )}
          />
        </div>

        {/* Scorebug bar */}
        <div className={cn('relative overflow-hidden rounded-lg border pl-4 pr-3 py-3 transition-colors', barTone)}>
          {/* stage colour tab */}
          <span className={cn('absolute left-0 inset-y-0 w-1', stage.bar, isCanceled && 'opacity-40')} />

          {/* mobile meta strip */}
          <div className="md:hidden flex items-center justify-between mb-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {format(date, 'HH:mm')}
            </span>
            <InlineStatus status={match.status} />
          </div>

          {/* HOME · score · AWAY */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-4">
            {/* home */}
            <div className="flex items-center justify-end gap-2 md:gap-3 min-w-0">
              <div className={cn('min-w-0 text-right', awayWin && 'opacity-55')}>
                <div className={cn('font-black text-sm md:text-base truncate tracking-tight leading-tight', homeWin ? 'text-emerald-200' : 'text-white')}>
                  {match.homeTeam.name}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
                  {match.homeTeam.shortName}
                </div>
              </div>
              <TeamMiniLogo team={match.homeTeam} dim={awayWin} />
            </div>

            {/* center */}
            <div className="px-1.5 md:px-3 shrink-0">
              {isFinished && hs != null && as != null ? (
                <div className="flex items-center gap-1.5 text-2xl md:text-3xl font-black tabular-nums leading-none">
                  <span className={homeWin ? 'text-white' : 'text-white/40'}>{hs}</span>
                  <span className="text-white/20 text-lg italic">:</span>
                  <span className={awayWin ? 'text-white' : 'text-white/40'}>{as}</span>
                </div>
              ) : isLive ? (
                <motion.div
                  animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex items-center gap-1.5 text-2xl md:text-3xl font-black tabular-nums text-red-400 leading-none drop-shadow-[0_0_14px_rgba(239,68,68,0.4)]"
                >
                  <span>{hs ?? 0}</span>
                  <span className="text-red-500/40 text-lg italic animate-pulse">:</span>
                  <span>{as ?? 0}</span>
                </motion.div>
              ) : isCanceled ? (
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/30 line-through">annulé</span>
              ) : (
                <div className="flex items-center gap-1 text-sm md:text-base font-black text-white/25 italic tracking-wider">
                  <Swords className="w-3.5 h-3.5" />
                  VS
                </div>
              )}
            </div>

            {/* away */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <TeamMiniLogo team={match.awayTeam} dim={homeWin} />
              <div className={cn('min-w-0', homeWin && 'opacity-55')}>
                <div className={cn('font-black text-sm md:text-base truncate tracking-tight leading-tight', awayWin ? 'text-emerald-200' : 'text-white')}>
                  {match.awayTeam.name}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
                  {match.awayTeam.shortName}
                </div>
              </div>
            </div>
          </div>

          {/* lower-third meta */}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 min-w-0">
              <span className="truncate max-w-[140px] md:max-w-[220px]">{match.tournament.name}</span>
              <span className="text-white/20">·</span>
              <span className={stage.text}>{stage.code}</span>
              {match.group && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" />
                    {match.group.name}
                  </span>
                </>
              )}
            </span>

            {isLive ? (
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#9146ff]/15 border border-[#9146ff]/40 px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-[0.2em] text-[#c9a8ff]">
                <Tv className="w-3 h-3" />
                Regarder
              </span>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
            )}
          </div>

          {/* sheen on hover */}
          {!reduce && !isCanceled && (
            <div className="pointer-events-none absolute inset-0 z-10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-linear-to-r from-transparent via-white/[0.06] to-transparent" />
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small pieces
// ─────────────────────────────────────────────────────────────────────────────

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
        'w-9 h-9 md:w-10 md:h-10 rounded-lg overflow-hidden ring-1 ring-white/10 bg-white/5 shrink-0 transition-transform duration-300 group-hover:scale-105',
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

function InlineStatus({ status }: { status: MatchStatus }) {
  if (status === 'LIVE') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 font-mono">
        <span className="live-dot" />
        Live
      </span>
    );
  }
  if (status === 'FINISHED') {
    return <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">FT</span>;
  }
  if (status === 'CANCELED') {
    return <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-red-300 line-through">Annulé</span>;
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
      <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">Programme vide</h3>
      <p className="text-white/55 max-w-md mx-auto px-4">
        Aucune rencontre pour ce filtre. Change de statut ou de tournoi pour voir d&apos;autres
        soirées.
      </p>
    </Card>
  );
}
