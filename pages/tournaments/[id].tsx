import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  Calendar,
  BarChart,
  Target,
  Zap,
  Loader2,
  Crown,
  Hourglass,
  ChevronRight,
  UserRound,
  CircleDot,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  getTournamentById,
  getStandingsByTournament,
  getMatchesByTournament,
} from '@/actions';
import { StandingsTable } from '@/components/tournament/standings-table';
import { BracketView } from '@/components/tournament/bracket-view';
import { MatchList } from '@/components/tournament/match-list';
import { TeamsList } from '@/components/tournament/teams-list';
import { GenerateMatchesButton } from '@/components/tournament/generate-matches-button';
import { CompleteGroupStageButton } from '@/components/tournament/complete-group-stage-button';
import { TournamentStatisticsView } from '@/components/tournament/tournament-statistics';
import { useUser } from '@clerk/nextjs';
import type { TournamentStatistics } from '@/lib/utils/tournament-stats';

import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Badge } from '@/components/ui/badge';

type MatchStage = 'GROUP' | 'PLAYOFF' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';
type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED';

type GroupLite = { id: string; name: string };

type Player = {
  id: string;
  jerseyNumber: number;
  position: string;
  user: { id: string; name: string; email: string };
};

type TeamStanding = {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

type Team = {
  id: string;
  name: string;
  shortName: string;
  logo?: string | null;
  group?: GroupLite | null;
  players?: Player[];
  standings?: TeamStanding[];
};

type Tournament = {
  id: string;
  name: string;
  startDate: string;
  groupCount: number;
  groupStageComplete: boolean;
  teams?: Team[];
  groups?: GroupLite[];
};

type Match = {
  id: string;
  stage: MatchStage;
  status: MatchStatus;
  homeTeam: Team;
  awayTeam: Team;
  matchDate: string;
  homeScore?: number | null;
  awayScore?: number | null;
  group?: GroupLite | null;
};

type Standing = {
  id: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  team: {
    id: string;
    name: string;
    shortName: string;
    groupId?: string | null;
    logo?: string;
    disqualified?: boolean;
    disqualificationReason?: string | null;
    [key: string]: unknown;
  };
};

type ActionResult<T> = { success: boolean; data?: T; error?: string };

type PageProps = {
  tournament: Tournament | null;
  standings: Standing[];
  matches: Match[];
};

type TabId = 'overview' | 'teams' | 'groups' | 'bracket' | 'matches' | 'stats';

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const id = ctx.params?.id;
  if (typeof id !== 'string') return { notFound: true };

  const [tRes, sRes, mRes] = await Promise.all([
    getTournamentById(id) as Promise<ActionResult<Tournament>>,
    getStandingsByTournament(id) as Promise<ActionResult<Standing[]>>,
    getMatchesByTournament(id) as Promise<ActionResult<Match[]>>,
  ]);

  if (!tRes.success || !tRes.data) return { notFound: true };

  return {
    props: {
      tournament: JSON.parse(JSON.stringify(tRes.data)),
      standings: sRes.success && sRes.data ? JSON.parse(JSON.stringify(sRes.data)) : [],
      matches: mRes.success && mRes.data ? JSON.parse(JSON.stringify(mRes.data)) : [],
    },
  };
};

type Accent = 'emerald' | 'yellow' | 'red' | 'purple';
const ACCENT: Record<Accent, { text: string; bg: string; border: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/30' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/30' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/30' },
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

export default function TournamentDetailPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { tournament, standings, matches } = props;
  const { user } = useUser();
  const router = useRouter();
  const isAdmin = user?.publicMetadata?.role === 'ADMIN';
  const userRole = user?.publicMetadata?.role as string | undefined;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [statistics, setStatistics] = useState<TournamentStatistics | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => router.replace(router.asPath);

  useEffect(() => {
    if (activeTab === 'stats' && !statistics && tournament) {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/tournaments/${tournament.id}/statistics`);
          const json = await res.json();
          if (res.ok && json.success && json.data) setStatistics(json.data);
        } catch (error) {
          console.error('Error loading stats:', error);
        }
      });
    }
  }, [activeTab, tournament, statistics]);

  if (!tournament) {
    return (
      <div className="relative bg-black text-white min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
        <Card className="relative max-w-md text-center p-10 bg-white/[0.02] border-white/10">
          <Trophy className="w-14 h-14 text-white/40 mx-auto mb-5" />
          <h2 className="text-2xl font-black mb-3 text-white tracking-tight">Tournoi introuvable</h2>
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-1 text-sm font-mono text-emerald-400 hover:text-emerald-300 uppercase tracking-[0.22em]"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Retour aux tournois
          </Link>
        </Card>
      </div>
    );
  }

  const knockoutMatches = matches.filter((m): m is Match => m.stage !== 'GROUP' && !!m.homeTeam && !!m.awayTeam);
  const groupMatches = matches.filter((m) => m.stage === 'GROUP');
  const allGroupMatchesFinished = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'FINISHED');

  const teamsCount = tournament.teams?.length ?? 0;
  const playersCount = tournament.teams?.reduce((acc, team) => acc + (team.players?.length ?? 0), 0) ?? 0;
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED').length;

  const startDate = new Date(tournament.startDate);
  const now = new Date();
  const isUpcoming = startDate > now;

  const status: { label: string; tone: 'upcoming' | 'live' | 'final' } = isUpcoming
    ? { label: 'À venir', tone: 'upcoming' }
    : tournament.groupStageComplete
    ? { label: 'Phase finale', tone: 'final' }
    : { label: 'En cours', tone: 'live' };

  const tabs: { id: TabId; name: string; icon: typeof Trophy }[] = [
    { id: 'overview', name: "Vue d'ensemble", icon: Target },
    { id: 'teams', name: 'Équipes', icon: Users },
    { id: 'groups', name: 'Groupes', icon: Trophy },
    { id: 'bracket', name: 'Bracket', icon: Zap },
    { id: 'matches', name: 'Matchs', icon: Calendar },
    { id: 'stats', name: 'Statistiques', icon: BarChart },
  ];

  return (
    <>
      <Head>
        <title>{tournament.name} — CDM 26</title>
        <meta name="description" content={`${tournament.name} — phase de poules, bracket, classements et statistiques.`} />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-16 md:py-20 relative">
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour aux tournois
            </Link>

            <SectionEyebrow num="TRN" label={`Tournoi · ${format(startDate, 'MMMM yyyy', { locale: fr })}`} accent="emerald" />

            <div className="flex items-end justify-between gap-6 flex-wrap mt-5">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.92] tracking-tight max-w-3xl">
                <span className="text-gradient-worldcup">{tournament.name}</span>
              </h1>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>

            {/* Meta strip */}
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-6">
              <MetaItem icon={Calendar} label="Coup d'envoi" value={format(startDate, 'PPP', { locale: fr })} accent="emerald" />
              <MetaItem icon={Users} label="Équipes" value={String(teamsCount)} accent="yellow" />
              <MetaItem icon={Trophy} label="Groupes" value={String(tournament.groupCount)} accent="red" />
              <MetaItem icon={CircleDot} label="ID" value={tournament.id.slice(0, 8).toUpperCase()} accent="purple" mono />
              <a
                href="https://www.twitch.tv/blaize"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[10px] font-mono uppercase tracking-[0.22em] hover:bg-purple-500/15 transition"
              >
                <Tv className="w-3 h-3" />
                Twitch live
              </a>
            </div>
          </div>
        </section>

        {/* TABS */}
        <section className="relative bg-black border-b border-white/10 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
              <div className="flex justify-center mb-10">
                <div className="overflow-x-auto max-w-full">
                  <TabsList className="bg-white/[0.03] border border-white/10 p-1 rounded-full h-auto gap-0.5">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="rounded-full px-4 md:px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60 transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{tab.name}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>

              {/* OVERVIEW */}
              <TabsContent value="overview" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-5"
                >
                  <OverviewStat code="TMS-ENG" label="Équipes engagées" value={teamsCount} icon={Users} accent="emerald" beam />
                  <OverviewStat
                    code="MTC-PLY"
                    label="Matchs"
                    sublabel={`${finishedMatches} joués`}
                    value={matches.length}
                    icon={Calendar}
                    accent="yellow"
                  />
                  <OverviewStat code="PLY-TOT" label="Joueurs" value={playersCount} icon={UserRound} accent="red" />
                </motion.div>

                {/* Quick recap card */}
                <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-6 md:p-8 mt-5">
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-3">
                    / Synthèse
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3 leading-tight">
                    <span className="italic font-light text-white/35">État du</span>{' '}
                    <span className="text-gradient-worldcup">tournoi.</span>
                  </h3>
                  <p className="text-white/65 leading-relaxed max-w-2xl">
                    {status.tone === 'live' &&
                      `Phase de poules en cours. ${finishedMatches} match${finishedMatches > 1 ? 's' : ''} joué${finishedMatches > 1 ? 's' : ''} sur ${matches.length}. Les classements et stats se mettent à jour à chaque résultat.`}
                    {status.tone === 'final' &&
                      `Phase à élimination directe en cours. Le bracket est généré, les qualifiés sont calculés, plus que ${matches.length - finishedMatches} match${matches.length - finishedMatches > 1 ? 's' : ''} avant le titre.`}
                    {status.tone === 'upcoming' &&
                      `Le tournoi débute le ${format(startDate, 'PPP', { locale: fr })}. Les inscriptions sont ouvertes, les groupes seront tirés au sort à la clôture.`}
                  </p>
                </Card>
              </TabsContent>

              {/* GROUPS */}
              <TabsContent value="groups" className="mt-0">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  {tournament.groups?.length === 0 ? (
                    <EmptyTabState icon={Trophy} title="Aucun groupe" description="Les groupes apparaîtront ici une fois configurés." />
                  ) : (
                    tournament.groups?.map((group) => {
                      const groupStandings = standings
                        .filter((s) => s.team.groupId === group.id)
                        .sort((a, b) => a.position - b.position);
                      return (
                        <StandingsTable
                          key={group.id}
                          standings={groupStandings}
                          groupName={group.name}
                          userRole={userRole}
                          onRefresh={handleRefresh}
                        />
                      );
                    })
                  )}
                </motion.div>
              </TabsContent>

              {/* BRACKET */}
              <TabsContent value="bracket" className="mt-0">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {knockoutMatches.length > 0 ? (
                    <BracketView matches={knockoutMatches} />
                  ) : (
                    <div className="space-y-6">
                      {isAdmin && tournament.groupStageComplete && (
                        <GenerateMatchesButton
                          tournamentId={tournament.id}
                          type="knockout"
                          groupStageComplete={tournament.groupStageComplete}
                        />
                      )}
                      <EmptyTabState
                        icon={Zap}
                        title="Bracket non généré"
                        description={
                          tournament.groupStageComplete
                            ? "Cliquez sur le bouton ci-dessus pour générer le bracket d'élimination."
                            : "Le bracket d'élimination sera disponible après la phase de poules."
                        }
                      />
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* TEAMS */}
              <TabsContent value="teams" className="mt-0">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <TeamsList teams={tournament.teams || []} />
                </motion.div>
              </TabsContent>

              {/* MATCHES */}
              <TabsContent value="matches" className="mt-0">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {isAdmin && matches.filter((m) => m.stage === 'GROUP').length === 0 && (
                    <GenerateMatchesButton tournamentId={tournament.id} type="group" />
                  )}
                  {isAdmin && !tournament.groupStageComplete && groupMatches.length > 0 && (
                    <CompleteGroupStageButton
                      tournamentId={tournament.id}
                      allGroupMatchesFinished={allGroupMatchesFinished}
                    />
                  )}
                  <MatchList matches={matches} title="Tous les matchs" />
                </motion.div>
              </TabsContent>

              {/* STATS */}
              <TabsContent value="stats" className="mt-0">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  {isPending ? (
                    <Card className="text-center py-20 bg-white/[0.02] border-white/10">
                      <Loader2 className="w-12 h-12 mx-auto mb-4 text-emerald-400 animate-spin" />
                      <h3 className="text-2xl font-black mb-2 text-white tracking-tight">Calcul des statistiques…</h3>
                      <p className="text-white/55">Analyse des matchs et des performances</p>
                    </Card>
                  ) : statistics ? (
                    <>
                      {knockoutMatches.length > 0 && (
                        <div>
                          <SectionEyebrow num="STA" label="Arbre du tournoi" accent="emerald" />
                          <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight mt-4 mb-6 leading-tight">
                            <span className="italic font-light text-white/35">Le</span>{' '}
                            <span className="text-gradient-worldcup">bracket</span>{' '}
                            <span className="italic font-light text-white/35">final.</span>
                          </h3>
                          <BracketView matches={knockoutMatches} />
                        </div>
                      )}
                      <TournamentStatisticsView stats={statistics} />
                    </>
                  ) : (
                    <EmptyTabState
                      icon={BarChart}
                      title="Aucune statistique disponible"
                      description="Les statistiques seront disponibles une fois que des matchs auront été joués."
                    />
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'upcoming' | 'live' | 'final';
  children: React.ReactNode;
}) {
  if (tone === 'live') {
    return (
      <Badge className="bg-red-500/10 border-red-500/30 text-red-300 px-4 py-1.5 uppercase tracking-[0.22em] text-[11px] font-mono font-black gap-2">
        <span className="live-dot" />
        LIVE · {children}
      </Badge>
    );
  }
  if (tone === 'final') {
    return (
      <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 px-4 py-1.5 uppercase tracking-[0.22em] text-[11px] font-mono font-black gap-2">
        <Crown className="w-3 h-3" />
        {children}
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 px-4 py-1.5 uppercase tracking-[0.22em] text-[11px] font-mono font-black gap-2">
      <Hourglass className="w-3 h-3" />
      {children}
    </Badge>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
  accent,
  mono,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  accent: Accent;
  mono?: boolean;
}) {
  const s = ACCENT[accent];
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 ${s.text}`} />
      <div>
        <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono">{label}</div>
        <div className={`text-sm font-black text-white ${mono ? 'font-mono tracking-wider' : 'tracking-tight'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function OverviewStat({
  code,
  label,
  sublabel,
  value,
  icon: Icon,
  accent,
  beam,
}: {
  code: string;
  label: string;
  sublabel?: string;
  value: number;
  icon: typeof Trophy;
  accent: Accent;
  beam?: boolean;
}) {
  const s = ACCENT[accent];
  return (
    <Card className={`relative overflow-hidden bg-white/[0.02] border ${s.border} hover:border-white/30 transition-all p-6`}>
      <div className="flex items-start justify-between mb-5">
        <div className={`w-11 h-11 rounded-xl bg-white/5 border ${s.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${s.text}`} />
        </div>
        <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${s.text}`}>{code}</span>
      </div>
      <div className={`text-5xl md:text-6xl font-black tabular-nums tracking-tighter mb-2 ${s.text}`}>
        <NumberTicker value={value} />
      </div>
      <div className="text-sm font-bold uppercase tracking-wider text-white/80">{label}</div>
      {sublabel && (
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mt-1 font-mono">{sublabel}</div>
      )}
      {beam && <BorderBeam size={140} duration={9} colorFrom="#10b981" colorTo="#facc15" borderWidth={1} />}
    </Card>
  );
}

function EmptyTabState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Trophy;
  title: string;
  description: string;
}) {
  return (
    <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 text-center py-20 px-6">
      <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-6 mx-auto">
        <Icon className="w-12 h-12 text-white/40" />
      </div>
      <h3 className="text-2xl md:text-3xl font-black mb-2 text-white tracking-tight">{title}</h3>
      <p className="text-white/55 max-w-md mx-auto">{description}</p>
    </Card>
  );
}
