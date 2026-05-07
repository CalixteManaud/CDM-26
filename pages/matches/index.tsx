import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-20 md:py-24 relative">
            <div className="flex items-end justify-between flex-wrap gap-8">
              <div>
                <SectionEyebrow num="MTC" label="Calendrier · FIFA 26" accent="red" />
                <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
                  Tous les <span className="text-gradient-worldcup">matchs.</span>
                  <br />
                  <span className="italic font-light text-white/35">Tous les soirs.</span>
                </h1>
                <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
                  Le calendrier complet — phase de poules, élimination directe, scores live et
                  streams Twitch officiels.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  {counts.live > 0 ? (
                    <Badge className="bg-red-500/10 border-red-500/30 text-red-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                      <span className="live-dot mr-1.5" />
                      {counts.live} match{counts.live > 1 ? 's' : ''} live
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                      <CircleDot className="w-3 h-3 mr-1" /> Saison 2026
                    </Badge>
                  )}
                  <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Tv className="w-3 h-3 mr-1" /> Streams Twitch
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="relative bg-black overflow-hidden border-b border-white/10">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-y border-white/10">
              <StatCell code="MTC-TOT" label="Total" value={counts.total} icon={Calendar} accent="emerald" />
              <StatCell code="SCH-NXT" label="À venir" value={counts.scheduled} icon={Hourglass} accent="blue" />
              <StatCell
                code="LIV-NOW"
                label="En cours"
                value={counts.live}
                icon={Flame}
                accent="red"
                pulse={counts.live > 0}
              />
              <StatCell code="FIN-DON" label="Terminés" value={counts.finished} icon={CheckCircle2} accent="yellow" />
            </div>
          </div>
        </section>

        {/* FILTERS + LIST */}
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
                  <TabsList className="bg-white/[0.03] border border-white/10 p-1 rounded-full h-auto gap-0.5 w-full md:w-auto">
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
                    <SelectTrigger className="w-full sm:w-72 h-11 bg-white/[0.03] border-white/15 hover:border-white/30 text-white">
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
                          initial={{ opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer bg-white/[0.03] border border-white/10 hover:border-white/30 transition-all group"
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
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border ${meta.accent} text-[10px] font-mono uppercase tracking-[0.25em]`}
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
                                <MatchCard key={m.id} match={m} idx={idx} />
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
}: {
  code: string;
  label: string;
  value: number;
  icon: typeof Trophy;
  accent: Accent;
  pulse?: boolean;
}) {
  const s = ACCENT[accent];
  return (
    <div className={`px-4 md:px-6 py-8 first:pl-0 md:first:pl-6 ${pulse ? 'relative' : ''}`}>
      <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-3 flex items-center gap-1.5 font-mono">
        <Icon className={`w-3 h-3 ${pulse ? 'animate-pulse' : ''}`} />
        {code}
      </div>
      <div className={`text-4xl md:text-6xl font-black mb-2 tracking-tighter tabular-nums ${s.text}`}>
        <NumberTicker value={value} />
      </div>
      <div className="text-xs md:text-sm text-white/70 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}

function MatchCard({ match, idx }: { match: Match; idx: number }) {
  const date = new Date(match.matchDate);
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const isCanceled = match.status === 'CANCELED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: idx * 0.04, duration: 0.4 }}
      whileHover={{ y: -2 }}
      className="relative group"
    >
      <Link href={`/matches/${match.id}`} className="block h-full">
        <Card
          className={`relative overflow-hidden h-full p-0 bg-gradient-to-b ${
            isLive ? 'from-red-950/30' : 'from-white/[0.03]'
          } to-transparent border-white/10 group-hover:border-white/30 transition-all duration-300`}
        >
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
                <TeamMiniLogo team={match.homeTeam} />
                <div className="min-w-0">
                  <div className="font-black text-white text-sm truncate tracking-tight leading-tight">
                    {match.homeTeam.name}
                  </div>
                  <div className="text-[10px] font-mono text-white/45 uppercase tracking-[0.22em]">
                    {match.homeTeam.shortName}
                  </div>
                </div>
              </div>

              <div className="px-2">
                {isFinished && match.homeScore != null && match.awayScore != null ? (
                  <div className="flex items-center gap-1.5 text-3xl font-black tabular-nums text-white leading-none">
                    <span>{match.homeScore}</span>
                    <span className="text-white/20 text-xl italic">:</span>
                    <span>{match.awayScore}</span>
                  </div>
                ) : isLive ? (
                  <div className="flex items-center gap-1.5 text-3xl font-black tabular-nums text-red-400 leading-none">
                    <span>{match.homeScore ?? 0}</span>
                    <span className="text-red-500/40 text-xl italic animate-pulse">:</span>
                    <span>{match.awayScore ?? 0}</span>
                  </div>
                ) : isCanceled ? (
                  <div className="text-sm font-mono uppercase tracking-[0.22em] text-white/30 line-through">
                    Annulé
                  </div>
                ) : (
                  <div className="text-base md:text-lg font-black text-white/30 italic tracking-wider">VS</div>
                )}
              </div>

              <div className="flex items-center gap-2.5 min-w-0 justify-end text-right">
                <div className="min-w-0">
                  <div className="font-black text-white text-sm truncate tracking-tight leading-tight">
                    {match.awayTeam.name}
                  </div>
                  <div className="text-[10px] font-mono text-white/45 uppercase tracking-[0.22em]">
                    {match.awayTeam.shortName}
                  </div>
                </div>
                <TeamMiniLogo team={match.awayTeam} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/10 bg-white/[0.02]">
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

          {isLive && (
            <BorderBeam size={140} duration={5} colorFrom="#ef4444" colorTo="#f59e0b" borderWidth={1.5} />
          )}
        </Card>
      </Link>
    </motion.div>
  );
}

function TeamMiniLogo({ team }: { team: Team }) {
  if (team.logo) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-white/10 bg-white/5 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logo} alt={team.name} loading="lazy" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-xs shrink-0 ring-1 ring-white/10">
      {team.shortName.substring(0, 2).toUpperCase()}
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
    <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 py-20 text-center">
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

