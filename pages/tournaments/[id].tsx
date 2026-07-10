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
  Archive,
  ArchiveRestore,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

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
import { ResetGroupStageButton } from '@/components/tournament/reset-group-stage-button';
import { TournamentStatisticsView } from '@/components/tournament/tournament-statistics';
import { ImportTeamsDialog } from '@/components/tournament/import-teams-dialog';
import { UnassignedTeamsAlert } from '@/components/tournament/unassigned-teams-alert';
import { useUser } from '@clerk/nextjs';
import type { TournamentStatistics } from '@/lib/utils/tournament-stats';

import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  disqualified?: boolean;
  group?: GroupLite | null;
  players?: Player[];
  standings?: TeamStanding[];
};

type Tournament = {
  id: string;
  name: string;
  startDate: string;
  groupCount: number;
  teamsPerGroup: number;
  groupStageComplete: boolean;
  archivedAt: string | null;
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
        <Card className="relative max-w-md text-center p-10 bg-white/2 border-white/10">
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
  const hasGroupMatches = groupMatches.length > 0;
  const groupHasResults = groupMatches.some((m) => m.status === 'FINISHED');

  // Équipes actives (non disqualifiées) pas encore assignées à un groupe : elles
  // seront exclues des matchs / classements tant que le tirage n'est pas fait.
  const unassignedTeams = (tournament.teams ?? []).filter((t) => !t.disqualified && !t.group);
  const assignedTeamsCount = (tournament.teams ?? []).filter((t) => !t.disqualified && t.group).length;
  // « Groupes faits » = le tirage a réparti les équipes : au moins une équipe
  // assignée ET aucune équipe active laissée sans groupe.
  const groupsReady = assignedTeamsCount > 0 && unassignedTeams.length === 0;

  const teamsCount = tournament.teams?.length ?? 0;
  const capacity = (tournament.groupCount ?? 0) * (tournament.teamsPerGroup ?? 0);
  const remainingSlots = Math.max(0, capacity - teamsCount);
  const playersCount = tournament.teams?.reduce((acc, team) => acc + (team.players?.length ?? 0), 0) ?? 0;
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED').length;

  const startDate = new Date(tournament.startDate);
  const now = new Date();
  const isUpcoming = startDate > now;
  const isArchived = !!tournament.archivedAt;

  const status: { label: string; tone: 'upcoming' | 'live' | 'final' | 'archived' } = isArchived
    ? { label: 'Archivé', tone: 'archived' }
    : isUpcoming
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
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
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
              <div className="ml-auto flex items-center gap-2">
                {isAdmin && (
                  <ArchiveTournamentButton
                    tournamentId={tournament.id}
                    isArchived={isArchived}
                    tournamentName={tournament.name}
                    onDone={handleRefresh}
                  />
                )}
                <a
                  href="https://www.twitch.tv/blaize"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[10px] font-mono uppercase tracking-[0.22em] hover:bg-purple-500/15 transition"
                >
                  <Tv className="w-3 h-3" />
                  Twitch live
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ALERTE ADMIN — équipes sans groupe (exclues des matchs tant que pas tirées) */}
        {isAdmin && !isArchived && teamsCount > 0 && unassignedTeams.length > 0 && (
          <section className="relative bg-black">
            <div className="container mx-auto px-4 pt-8">
              <UnassignedTeamsAlert
                tournamentId={tournament.id}
                unassignedTeams={unassignedTeams}
                hasGroupMatches={hasGroupMatches}
                onViewTeams={() => setActiveTab('teams')}
              />
            </div>
          </section>
        )}

        {/* TABS */}
        <section className="relative bg-black border-b border-white/10 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
              <div className="flex justify-center mb-10">
                <div className="overflow-x-auto max-w-full">
                  <TabsList className="bg-white/3 border border-white/10 p-1 rounded-full h-auto gap-0.5">
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
                <Card className="relative overflow-hidden bg-white/2 border-white/10 p-6 md:p-8 mt-5">
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
                      // Avant le 1er match : aucun standing pour ce groupe → on affiche
                      // la composition (équipes assignées par le tirage au sort)
                      // pour que l'admin voie immédiatement le résultat du tirage.
                      if (groupStandings.length === 0) {
                        const groupTeams = (tournament.teams ?? []).filter(
                          (t) => t.group?.id === group.id
                        );
                        return (
                          <GroupRoster
                            key={group.id}
                            groupName={group.name}
                            teams={groupTeams}
                          />
                        );
                      }
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
                      {isAdmin && !isArchived && tournament.groupStageComplete && (
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
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {isAdmin && !isArchived && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`text-[11px] font-mono uppercase tracking-[0.22em] ${
                          remainingSlots <= 0 ? 'text-red-300' : 'text-white/50'
                        }`}
                      >
                        {teamsCount}/{capacity} équipes
                        {remainingSlots > 0
                          ? ` · ${remainingSlots} place${remainingSlots > 1 ? 's' : ''} libre${remainingSlots > 1 ? 's' : ''}`
                          : ' · complet'}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {remainingSlots > 0 ? (
                          <Link href={`/teams/new?tournament=${tournament.id}`}>
                            <Button className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs">
                              <UserPlus className="w-4 h-4 mr-2" />
                              Ajouter une équipe
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            disabled
                            className="bg-white/10 text-white/50 font-black uppercase tracking-[0.18em] text-xs"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Tournoi complet
                          </Button>
                        )}
                        <ImportTeamsDialog
                          targetTournamentId={tournament.id}
                          onDone={handleRefresh}
                          remainingSlots={remainingSlots}
                          existingTeams={(tournament.teams ?? []).map((t) => ({
                            name: t.name,
                            shortName: t.shortName,
                          }))}
                        />
                      </div>
                    </div>
                  )}
                  {isAdmin &&
                    !isArchived &&
                    teamsCount > 0 &&
                    matches.filter((m) => m.stage === 'GROUP').length === 0 &&
                    !(tournament.teams ?? []).some((t) => t.group?.id) && (
                      <Link href={`/tournaments/${tournament.id}/draw`} className="block">
                        <Card className="relative overflow-hidden bg-linear-to-br from-emerald-950/30 via-black to-purple-950/20 border-white/10 hover:border-emerald-500/40 transition-all p-6 md:p-7 group cursor-pointer">
                          <div className="grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                              <Sparkles className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-mono uppercase tracking-[0.3em] mb-1.5 text-emerald-400">
                                § Cérémonie · TIRAGE AU SORT
                              </div>
                              <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1.5 leading-tight">
                                Lancer le tirage au sort
                              </h3>
                              <p className="text-sm text-white/60 leading-relaxed">
                                Cérémonie animée façon UEFA / FIFA — chapeaux, boules, groupes qui s&apos;allument.
                                Les équipes sont assignées en temps réel.
                              </p>
                            </div>
                            <Button
                              type="button"
                              className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6 shrink-0"
                            >
                              Lancer
                              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
                            </Button>
                          </div>
                          <BorderBeam
                            size={180}
                            duration={9}
                            colorFrom="#10b981"
                            colorTo="#a855f7"
                            borderWidth={1}
                          />
                        </Card>
                      </Link>
                    )}
                  {userRole === 'PARTICIPANT' && !isArchived && !tournament.groupStageComplete && (
                    <Link href={`/tournaments/${tournament.id}/rejoindre`} className="block">
                      <Card className="relative overflow-hidden bg-linear-to-br from-emerald-950/30 via-black to-yellow-950/10 border-white/10 hover:border-emerald-500/40 transition-all p-6 md:p-7 group cursor-pointer">
                        <div className="grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono uppercase tracking-[0.3em] mb-1.5 text-emerald-400">
                              § Inscription · REJOINDRE
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1.5 leading-tight">
                              Rejoindre une équipe
                            </h3>
                            <p className="text-sm text-white/60 leading-relaxed">
                              Choisis une équipe engagée, propose ton numéro et ton poste. Un coach ou un admin
                              validera ta demande.
                            </p>
                          </div>
                          <Button
                            type="button"
                            className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6 shrink-0"
                          >
                            Postuler
                            <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
                          </Button>
                        </div>
                        <BorderBeam size={180} duration={9} colorFrom="#10b981" colorTo="#facc15" borderWidth={1} />
                      </Card>
                    </Link>
                  )}
                  <TeamsList teams={tournament.teams || []} />
                </motion.div>
              </TabsContent>

              {/* MATCHES */}
              <TabsContent value="matches" className="mt-0">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {isAdmin && !isArchived && groupMatches.length === 0 && groupsReady && (
                    <GenerateMatchesButton
                      tournamentId={tournament.id}
                      type="group"
                      unassignedCount={unassignedTeams.length}
                    />
                  )}
                  {isAdmin && !isArchived && groupMatches.length === 0 && !groupsReady && teamsCount > 0 && (
                    <Link href={`/tournaments/${tournament.id}/draw`} className="block">
                      <Card className="relative overflow-hidden bg-white/2 border-white/10 hover:border-emerald-500/40 transition-all p-6 md:p-7 group cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-yellow-400 mb-1.5">
                              § Étape requise · TIRAGE AU SORT
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1.5 leading-tight">
                              Fais le tirage avant de générer les matchs
                            </h3>
                            <p className="text-sm text-white/60 leading-relaxed">
                              Les matchs de poules ne peuvent être générés qu&apos;une fois toutes les
                              équipes réparties dans les groupes. Lance le tirage au sort pour
                              continuer.
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/30 group-hover:translate-x-1 group-hover:text-emerald-300 transition shrink-0 self-center" />
                        </div>
                      </Card>
                    </Link>
                  )}
                  {isAdmin && !isArchived && !tournament.groupStageComplete && groupMatches.length > 0 && (
                    <CompleteGroupStageButton
                      tournamentId={tournament.id}
                      allGroupMatchesFinished={allGroupMatchesFinished}
                    />
                  )}
                  {isAdmin && !isArchived && groupMatches.length > 0 && !groupHasResults && (
                    <ResetGroupStageButton tournamentId={tournament.id} matchCount={groupMatches.length} />
                  )}
                  <MatchList matches={matches} title="Tous les matchs" />
                </motion.div>
              </TabsContent>

              {/* STATS */}
              <TabsContent value="stats" className="mt-0">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  {isPending ? (
                    <Card className="text-center py-20 bg-white/2 border-white/10">
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
  tone: 'upcoming' | 'live' | 'final' | 'archived';
  children: React.ReactNode;
}) {
  if (tone === 'archived') {
    return (
      <Badge className="bg-white/5 border-white/15 text-white/60 px-4 py-1.5 uppercase tracking-[0.22em] text-[11px] font-mono font-black gap-2">
        <Archive className="w-3 h-3" />
        {children}
      </Badge>
    );
  }
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
    <Card className={`relative overflow-hidden bg-white/2 border ${s.border} hover:border-white/30 transition-all p-6`}>
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
    <Card className="relative overflow-hidden bg-white/2 border-white/10 text-center py-20 px-6">
      <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-6 mx-auto">
        <Icon className="w-12 h-12 text-white/40" />
      </div>
      <h3 className="text-2xl md:text-3xl font-black mb-2 text-white tracking-tight">{title}</h3>
      <p className="text-white/55 max-w-md mx-auto">{description}</p>
    </Card>
  );
}

function ArchiveTournamentButton({
  tournamentId,
  isArchived,
  tournamentName,
  onDone,
}: {
  tournamentId: string;
  isArchived: boolean;
  tournamentName: string;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const Icon = isArchived ? ArchiveRestore : Archive;
  const label = isArchived ? 'Désarchiver' : 'Archiver';
  const title = isArchived ? 'Désarchiver ce tournoi ?' : 'Archiver ce tournoi ?';
  const description = isArchived
    ? `« ${tournamentName} » sera de nouveau visible dans la listing principale.`
    : `« ${tournamentName} » sera déplacé vers l'historique. Les données (matchs, classements, paris) sont conservées et le tournoi pourra être désarchivé à tout moment.`;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: !isArchived }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Erreur lors de l'opération");
        return;
      }
      toast.success(isArchived ? 'Tournoi désarchivé' : 'Tournoi archivé');
      setOpen(false);
      onDone();
    } catch (error) {
      console.error('Archive toggle failed:', error);
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-auto px-3 py-1.5 rounded-full border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 text-[10px] font-mono uppercase tracking-[0.22em]"
        >
          <Icon className="w-3 h-3 mr-1.5" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {isArchived ? 'Désarchivage…' : 'Archivage…'}
              </>
            ) : (
              <>
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {isArchived ? 'Confirmer' : 'Archiver'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Composition d'un groupe AVANT le 1er match.
 * Liste plate des équipes assignées (par le tirage au sort), sans stats.
 * Dès qu'un match du groupe est terminé, ce composant est remplacé par
 * `<StandingsTable>` qui affiche le vrai classement.
 */
function GroupRoster({ groupName, teams }: { groupName: string; teams: Team[] }) {
  return (
    <Card className="relative overflow-hidden bg-linear-to-br from-white/3 via-black to-black border-white/10 p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400">
              § COMPOSITION
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {groupName}
            </h3>
          </div>
        </div>
        <Badge className="bg-white/5 border-white/15 text-white/65 uppercase tracking-[0.22em] text-[10px] font-mono">
          <Hourglass className="w-3 h-3 mr-1" />
          En attente du 1er match
        </Badge>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/2 py-10 text-center">
          <p className="text-sm text-white/55">
            Aucune équipe assignée à ce groupe. Lance un tirage au sort depuis l&apos;onglet
            Équipes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {teams.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/4 border border-white/10"
            >
              <span className="text-[10px] font-mono tabular-nums text-white/35 w-6">
                {String(i + 1).padStart(2, '0')}
              </span>
              {t.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.logo}
                  alt={t.name}
                  className="w-8 h-8 rounded-full ring-1 ring-white/15 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/8 border border-white/15 flex items-center justify-center text-[10px] font-black text-white/80">
                  {t.shortName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{t.name}</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">
                  {t.shortName}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
