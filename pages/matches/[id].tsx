import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  Calendar,
  Trophy,
  Users,
  Target,
  Shield,
  Save,
  Video,
  ExternalLink,
  Edit2,
  Hourglass,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  X,
  Clock,
  ChevronRight,
  CircleDot,
  Tv,
  Crown,
  Swords,
  Radio,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';

import { cn } from '@/lib/utils';
import { PlayerStatsForm } from '@/components/match/player-stats-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BorderBeam } from '@/components/ui/border-beam';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Ripple } from '@/components/ui/ripple';
import { MatchBetWidget } from '@/components/betting/match-bet-widget';
import { MatchMarketsList } from '@/components/betting/match-markets-list';
import type { Market } from '@/components/betting/market-card';
import { LivePoller } from '@/components/betting/live-poller';
import { MatchStatusSwitcher } from '@/components/match/match-status-switcher';
import { MatchEventComposer } from '@/components/match/match-event-composer';
import { MatchEventFeed } from '@/components/match/match-event-feed';
import type { MatchEvent as MatchEventRow } from '@/components/match/match-event-feed';
import { StreamEmbed } from '@/components/match/stream-embed';

type Player = {
  id: string;
  jerseyNumber: number;
  position: string;
  user: { id: string; name: string };
};

type TeamSide = {
  id: string;
  name: string;
  shortName: string;
  logo?: string | null;
  disqualified?: boolean;
  disqualificationReason?: string | null;
  coach?: { id: string; clerkId: string; name: string } | null;
  players: Player[];
};

type Match = {
  id: string;
  matchDate: string;
  stage: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  twitchUrl?: string | null;
  discordUrl?: string | null;
  youtubeUrl?: string | null;
  streamTitle?: string | null;
  homeTeam: TeamSide;
  awayTeam: TeamSide;
  group?: { id: string; name: string } | null;
  tournament: { id: string; name: string };
};

type BettingDetails = {
  match: Parameters<typeof MatchBetWidget>[0]['match'];
  recentBets: Parameters<typeof MatchBetWidget>[0]['recentBets'];
} | null;

type UserBettingState = {
  twitchUsername: string | null;
  alreadyBetSite: boolean;
} | null;

type PageProps = {
  match: Match | null;
  betting: BettingDetails;
  userBetting: UserBettingState;
  markets: Market[];
  events: MatchEventRow[];
};

const stageMeta: Record<string, { label: string; code: string }> = {
  GROUP: { label: 'Phase de poules', code: 'GS' },
  PLAYOFF: { label: 'Barrages', code: 'PO' },
  ROUND_OF_16: { label: '8es de finale', code: 'R16' },
  QUARTER_FINAL: { label: 'Quarts', code: 'QF' },
  SEMI_FINAL: { label: 'Demi-finales', code: 'SF' },
  FINAL: { label: 'Finale', code: 'F' },
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const matchId = ctx.params?.id;
  if (typeof matchId !== 'string') return { notFound: true };

  const { getMatchById } = await import('@/actions/matches');
  const { getMatchBettingDetails, getUserBetStatusForMatch } = await import('@/actions/betting');
  const { getMatchMarkets } = await import('@/actions/markets');
  const { getMatchEvents } = await import('@/actions/match-events');
  const { getCurrentDbUserFromReq } = await import('@/lib/auth/page-auth');

  const [result, bettingRes, marketsRes, eventsRes, dbUser] = await Promise.all([
    getMatchById(matchId),
    getMatchBettingDetails(matchId),
    getMatchMarkets(matchId),
    getMatchEvents(matchId),
    getCurrentDbUserFromReq(ctx.req),
  ]);

  if (!result.success || !result.data) return { notFound: true };

  let userBetting: UserBettingState = null;
  if (dbUser) {
    const statusRes = await getUserBetStatusForMatch({ userId: dbUser.id, matchId });
    userBetting = {
      twitchUsername: dbUser.twitchUsername ?? null,
      alreadyBetSite: statusRes.success ? statusRes.data!.alreadyBetSite : false,
    };
  }

  return {
    props: {
      match: JSON.parse(JSON.stringify(result.data)),
      betting:
        bettingRes.success && bettingRes.data
          ? JSON.parse(JSON.stringify(bettingRes.data))
          : null,
      userBetting,
      markets:
        marketsRes.success && marketsRes.data
          ? JSON.parse(JSON.stringify(marketsRes.data))
          : [],
      events:
        eventsRes.success && eventsRes.data
          ? JSON.parse(JSON.stringify(eventsRes.data))
          : [],
    },
  };
};

interface PlayerStat {
  playerId: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

type Accent = 'emerald' | 'yellow' | 'red' | 'purple' | 'blue';
const ACCENT: Record<Accent, { text: string; bg: string; border: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/30' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/30' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/30' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-400', border: 'border-blue-500/30' },
};

type Outcome = 'win' | 'lose' | 'draw' | 'pending';

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

// Burst de confettis aux couleurs World Cup quand un match se termine sur un
// vainqueur. Import dynamique de canvas-confetti (déjà en dep) côté client only.
function useWinnerConfetti(enabled: boolean) {
  const fired = useRef(false);
  useEffect(() => {
    if (!enabled || fired.current) return;
    fired.current = true;
    let cancelled = false;
    (async () => {
      try {
        const confetti = (await import('canvas-confetti')).default;
        if (cancelled) return;
        const colors = ['#10b981', '#facc15', '#dc2626', '#ffffff'];
        const end = Date.now() + 1500;
        const frame = () => {
          confetti({ particleCount: 5, angle: 60, spread: 62, startVelocity: 58, origin: { x: 0, y: 0.9 }, colors, scalar: 0.9, ticks: 220 });
          confetti({ particleCount: 5, angle: 120, spread: 62, startVelocity: 58, origin: { x: 1, y: 0.9 }, colors, scalar: 0.9, ticks: 220 });
          if (Date.now() < end && !cancelled) requestAnimationFrame(frame);
        };
        confetti({ particleCount: 90, spread: 100, startVelocity: 45, origin: { y: 0.35 }, colors, scalar: 1.1 });
        frame();
      } catch {
        /* canvas-confetti indisponible — on ignore silencieusement */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

export default function MatchDetailPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'ADMIN';
  const [isPending, startTransition] = useTransition();
  const reduce = useReducedMotion();

  const [formData, setFormData] = useState({
    homeScore: props.match?.homeScore?.toString() || '',
    awayScore: props.match?.awayScore?.toString() || '',
  });

  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);

  const [editingStream, setEditingStream] = useState(false);
  const [streamData, setStreamData] = useState({
    twitchUrl: props.match?.twitchUrl || '',
    discordUrl: props.match?.discordUrl || '',
    youtubeUrl: props.match?.youtubeUrl || '',
    streamTitle: props.match?.streamTitle || '',
  });

  const match = props.match;
  const isHomeCoach = match?.homeTeam?.coach?.clerkId === user?.id;
  const isAwayCoach = match?.awayTeam?.coach?.clerkId === user?.id;
  const canEditMatch = isAdmin || isHomeCoach || isAwayCoach;

  // Issue du match (avant le early-return : les hooks doivent rester inconditionnels)
  const finished = match?.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null;
  const homeWin = !!finished && (match!.homeScore ?? 0) > (match!.awayScore ?? 0);
  const awayWin = !!finished && (match!.awayScore ?? 0) > (match!.homeScore ?? 0);
  useWinnerConfetti(!reduce && (homeWin || awayWin));

  if (!match) {
    return (
      <div className="relative bg-black text-white min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
        <Card className="relative max-w-md text-center p-10 bg-white/2 border-white/10">
          <Trophy className="w-14 h-14 text-white/40 mx-auto mb-5" />
          <h2 className="text-2xl font-black mb-3 text-white tracking-tight">Match introuvable</h2>
          <Link
            href="/matches"
            className="inline-flex items-center gap-1 text-sm font-mono text-emerald-400 hover:text-emerald-300 uppercase tracking-[0.22em]"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Retour aux matchs
          </Link>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (match.homeTeam.disqualified || match.awayTeam.disqualified) {
      const dq = match.homeTeam.disqualified ? match.homeTeam.name : match.awayTeam.name;
      toast.error(`Impossible de soumettre le résultat : ${dq} est disqualifiée. Attendez les barrages.`);
      return;
    }

    if (!formData.homeScore || !formData.awayScore) {
      toast.error('Veuillez entrer les deux scores');
      return;
    }

    const homeScore = Number(formData.homeScore);
    const awayScore = Number(formData.awayScore);
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      toast.error('Scores invalides');
      return;
    }

    const homeGoals = playerStats
      .filter((s) => match.homeTeam.players.some((p) => p.id === s.playerId))
      .reduce((sum, s) => sum + s.goals, 0);
    const awayGoals = playerStats
      .filter((s) => match.awayTeam.players.some((p) => p.id === s.playerId))
      .reduce((sum, s) => sum + s.goals, 0);

    if (homeGoals !== homeScore || awayGoals !== awayScore) {
      toast.error(`Buts saisis (${homeGoals}-${awayGoals}) ≠ score (${homeScore}-${awayScore})`);
      return;
    }

    const validPlayerStats = playerStats.filter((s) => s.playerId !== '');

    startTransition(async () => {
      try {
        const res = await fetch(`/api/matches/${match.id}/submit-result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeScore, awayScore, playerStats: validPlayerStats }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Erreur lors de la soumission');

        toast.success('Résultat enregistré avec succès !');
        if (json?.progression?.progressed) toast.success(json.progression.message, { duration: 5000 });
        if (json?.tournament?.complete) {
          toast.success(`🏆 Tournoi terminé ! Vainqueur : ${json.tournament.winnerTeam.name}`, {
            duration: 7000,
          });
        }
        router.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
      }
    });
  };

  const handleStreamUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch(`/api/matches/${match.id}/update-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            twitchUrl: streamData.twitchUrl.trim() || null,
            discordUrl: streamData.discordUrl.trim() || null,
            youtubeUrl: streamData.youtubeUrl.trim() || null,
            streamTitle: streamData.streamTitle.trim() || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Erreur lors de la mise à jour');

        toast.success('Liens de diffusion mis à jour !');
        setEditingStream(false);
        router.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
      }
    });
  };

  const hasStreamLinks = match.twitchUrl || match.discordUrl || match.youtubeUrl;
  const isDisqualified = match.homeTeam.disqualified || match.awayTeam.disqualified;
  const date = new Date(match.matchDate);
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';
  // Player embarqué uniquement si le match est live ou à venir et qu'un stream existe
  const canEmbedStream = (isLive || isScheduled) && !!(match.twitchUrl || match.youtubeUrl);
  const stage = stageMeta[match.stage] ?? { label: match.stage, code: match.stage.slice(0, 3) };

  const homeOutcome: Outcome = isFinished ? (homeWin ? 'win' : awayWin ? 'lose' : 'draw') : 'pending';
  const awayOutcome: Outcome = isFinished ? (awayWin ? 'win' : homeWin ? 'lose' : 'draw') : 'pending';

  // Variants d'entrée du hero — désactivées si l'utilisateur préfère moins d'animation
  const heroContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
  };
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <>
      <Head>
        <title>{match.homeTeam.name} vs {match.awayTeam.name} — CDM 26</title>
        <meta
          name="description"
          content={`${match.homeTeam.name} vs ${match.awayTeam.name} — ${stage.label}, ${match.tournament.name}`}
        />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* ───────────────────────── HERO ───────────────────────── */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          {/* Atmosphère */}
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          {/* Halos colorés par camp (vert domicile / rouge extérieur) */}
          <motion.div
            aria-hidden
            className="absolute inset-y-0 left-0 w-2/3 pointer-events-none bg-[radial-gradient(60%_80%_at_0%_50%,rgba(16,185,129,0.18),transparent_70%)]"
            animate={reduce ? undefined : { opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-y-0 right-0 w-2/3 pointer-events-none bg-[radial-gradient(60%_80%_at_100%_50%,rgba(220,38,38,0.18),transparent_70%)]"
            animate={reduce ? undefined : { opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          />
          {/* Ligne d'énergie supérieure */}
          <motion.div
            aria-hidden
            className={`absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent ${
              isLive ? 'via-red-500/80' : isFinished ? 'via-yellow-500/70' : 'via-emerald-500/60'
            } to-transparent`}
            animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="container mx-auto px-4 py-14 md:py-20 relative">
            <Link
              href={`/tournaments/${match.tournament.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour au tournoi
            </Link>

            <motion.div variants={reduce ? undefined : heroContainer} initial={reduce ? false : 'hidden'} animate={reduce ? undefined : 'show'}>
              {/* Eyebrow */}
              <motion.div variants={reduce ? undefined : fadeUp} className="flex flex-wrap items-center gap-3 mb-10">
                <SectionEyebrow num={stage.code} label={stage.label} accent={isLive ? 'red' : isFinished ? 'yellow' : 'emerald'} />
                <StatusPill status={match.status} reduce={!!reduce} />
                {match.group && (
                  <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Shield className="w-3 h-3 mr-1" />
                    {match.group.name}
                  </Badge>
                )}
                <Link href={`/tournaments/${match.tournament.id}`}>
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono cursor-pointer hover:bg-emerald-500/15">
                    <Trophy className="w-3 h-3 mr-1" />
                    {match.tournament.name}
                  </Badge>
                </Link>
              </motion.div>

              {/* Affiche : logo domicile / SCORE / logo extérieur */}
              <motion.div
                variants={reduce ? undefined : fadeUp}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-10 max-w-5xl mx-auto"
              >
                <TeamColumn team={match.homeTeam} align="right" side="home" outcome={homeOutcome} reduce={!!reduce} />
                <HeroScore status={match.status} homeScore={match.homeScore} awayScore={match.awayScore} reduce={!!reduce} />
                <TeamColumn team={match.awayTeam} align="left" side="away" outcome={awayOutcome} reduce={!!reduce} />
              </motion.div>

              {/* Bandeau date */}
              <motion.div
                variants={reduce ? undefined : fadeUp}
                className="mt-12 flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono uppercase tracking-[0.3em] text-white/45"
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                </span>
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-yellow-400" />
                  <span className="font-black tabular-nums text-white/85">{format(date, 'HH:mm')}</span>
                </span>
                <span className="text-white/20">·</span>
                <span># {match.id.slice(0, 8).toUpperCase()}</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ───────────────────────── CONTENU ───────────────────────── */}
        <section className="relative bg-black border-b border-white/10 py-14">
          <div className="container mx-auto px-4 max-w-4xl space-y-6">
            {/* DQ banner */}
            {isDisqualified && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="relative overflow-hidden bg-red-950/20 border-red-500/30 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-red-400 mb-1.5">
                        § Match suspendu · DISQUALIFICATION
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-2 leading-tight">
                        Équipe disqualifiée
                      </h3>
                      <p className="text-sm text-white/70 mb-2 leading-relaxed">
                        {match.homeTeam.disqualified ? (
                          <>
                            <strong className="text-white">{match.homeTeam.name}</strong> a été disqualifiée
                            {match.homeTeam.disqualificationReason && <> : {match.homeTeam.disqualificationReason}</>}
                          </>
                        ) : (
                          <>
                            <strong className="text-white">{match.awayTeam.name}</strong> a été disqualifiée
                            {match.awayTeam.disqualificationReason && <> : {match.awayTeam.disqualificationReason}</>}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-white/55 leading-relaxed">
                        Des matchs de barrage ont été créés entre les 4 meilleurs 3èmes pour déterminer
                        l'équipe de remplacement. Ce match sera mis à jour automatiquement une fois les
                        barrages terminés.
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Live polling pendant le match — refresh cotes + feed toutes les 12s */}
            <LivePoller active={match.status === 'LIVE'} intervalMs={12_000} />

            {/* Les toasts d'events sont gérés globalement par GlobalLiveNotifier
                (monté dans pages/_app.tsx) — visible sur toutes les pages. */}

            {/* Pilotage admin/coach — status + event composer */}
            {canEditMatch && (
              <>
                <MatchStatusSwitcher matchId={match.id} currentStatus={match.status as 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED'} />
                {match.status === 'LIVE' && (
                  <MatchEventComposer
                    matchId={match.id}
                    homeTeam={match.homeTeam}
                    awayTeam={match.awayTeam}
                    homePlayers={match.homeTeam.players}
                    awayPlayers={match.awayTeam.players}
                  />
                )}
              </>
            )}

            {/* Feed live — visible par tout le monde */}
            <MatchEventFeed
              events={props.events}
              matchId={match.id}
              canManage={canEditMatch}
            />

            {/* Betting widget */}
            {props.betting && !isDisqualified && (
              <MatchBetWidget
                match={props.betting.match}
                recentBets={props.betting.recentBets}
                userTwitchUsername={props.userBetting?.twitchUsername ?? null}
                alreadyBetSite={props.userBetting?.alreadyBetSite ?? false}
              />
            )}

            {/* Marchés additionnels (score exact, total buts, BTTS) */}
            {!isDisqualified && props.markets.length > 0 && (
              <MatchMarketsList markets={props.markets} />
            )}

            {/* Submit result */}
            {canEditMatch && (
              <Card className="relative overflow-hidden bg-white/2 border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 mb-1.5">
                      § {isFinished ? 'Modification' : 'Soumission'} du résultat
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                      {isFinished ? 'Modifier le score' : 'Saisir le score final'}
                    </h3>
                  </div>
                  {!isAdmin && (isHomeCoach || isAwayCoach) && (
                    <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono shrink-0">
                      Coach · {isHomeCoach ? match.homeTeam.shortName : match.awayTeam.shortName}
                    </Badge>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <ScoreInput
                      id="homeScore"
                      code={match.homeTeam.shortName}
                      label="Domicile"
                      value={formData.homeScore}
                      onChange={(v) => setFormData((p) => ({ ...p, homeScore: v }))}
                      accent="emerald"
                    />
                    <ScoreInput
                      id="awayScore"
                      code={match.awayTeam.shortName}
                      label="Extérieur"
                      value={formData.awayScore}
                      onChange={(v) => setFormData((p) => ({ ...p, awayScore: v }))}
                      accent="red"
                    />
                  </div>

                  {formData.homeScore && formData.awayScore && (
                    <div className="border-t border-white/10 pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="w-4 h-4 text-yellow-400" />
                        <h4 className="text-sm font-black text-white tracking-tight uppercase">
                          Statistiques des joueurs
                        </h4>
                        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
                          (optionnel)
                        </span>
                      </div>
                      <p className="text-xs text-white/55 mb-4 leading-relaxed">
                        Saisis les buteurs, passeurs et cartons. La somme des buts doit correspondre au score.
                      </p>
                      <PlayerStatsForm
                        homeTeam={match.homeTeam}
                        awayTeam={match.awayTeam}
                        homeScore={Number(formData.homeScore)}
                        awayScore={Number(formData.awayScore)}
                        onStatsChange={setPlayerStats}
                        initialStats={playerStats}
                      />
                    </div>
                  )}

                  <ShimmerButton
                    type="submit"
                    disabled={isPending || !!isDisqualified}
                    shimmerColor="#ffffff"
                    background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                    className="w-full px-7 py-5 font-black uppercase tracking-[0.18em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enregistrement…
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Enregistrer le résultat
                      </>
                    )}
                  </ShimmerButton>

                  {match.stage === 'GROUP' && (
                    <p className="text-[10px] text-center text-white/40 font-mono uppercase tracking-[0.25em]">
                      Le classement sera automatiquement recalculé
                    </p>
                  )}
                </form>
              </Card>
            )}

            {/* Stream Links */}
            {(hasStreamLinks || canEditMatch) && (
              <Card className="relative overflow-hidden bg-linear-to-br from-purple-950/20 via-black to-black border-purple-500/20 p-7 md:p-8">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-purple-400 mb-1.5">
                        § Diffusion live
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                        Streams <span className="text-gradient-twitch">Twitch</span>
                      </h3>
                    </div>
                  </div>
                  {canEditMatch && !editingStream && (
                    <Button
                      onClick={() => setEditingStream(true)}
                      size="sm"
                      variant="outline"
                      className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-[10px] h-8"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      {hasStreamLinks ? 'Modifier' : 'Ajouter'}
                    </Button>
                  )}
                </div>

                {editingStream && canEditMatch ? (
                  <form onSubmit={handleStreamUpdate} className="space-y-4">
                    <StreamFieldGroup
                      id="streamTitle"
                      label="Titre de la diffusion"
                      optional
                      value={streamData.streamTitle}
                      onChange={(v) => setStreamData((p) => ({ ...p, streamTitle: v }))}
                      placeholder="Ex : Match commenté par…"
                      type="text"
                    />
                    <StreamFieldGroup
                      id="twitchUrl"
                      label="URL Twitch"
                      accent="text-purple-300"
                      value={streamData.twitchUrl}
                      onChange={(v) => setStreamData((p) => ({ ...p, twitchUrl: v }))}
                      placeholder="https://twitch.tv/…"
                      type="url"
                    />
                    <StreamFieldGroup
                      id="youtubeUrl"
                      label="URL YouTube"
                      accent="text-red-300"
                      value={streamData.youtubeUrl}
                      onChange={(v) => setStreamData((p) => ({ ...p, youtubeUrl: v }))}
                      placeholder="https://youtube.com/watch?v=…"
                      type="url"
                    />
                    <StreamFieldGroup
                      id="discordUrl"
                      label="Invitation Discord"
                      accent="text-blue-300"
                      value={streamData.discordUrl}
                      onChange={(v) => setStreamData((p) => ({ ...p, discordUrl: v }))}
                      placeholder="https://discord.gg/…"
                      type="url"
                    />

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            Enregistrement…
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-1.5" />
                            Enregistrer
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingStream(false);
                          setStreamData({
                            twitchUrl: match.twitchUrl || '',
                            discordUrl: match.discordUrl || '',
                            youtubeUrl: match.youtubeUrl || '',
                            streamTitle: match.streamTitle || '',
                          });
                        }}
                        className="border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                    </div>
                  </form>
                ) : hasStreamLinks ? (
                  <div className="space-y-4">
                    {canEmbedStream && (
                      <StreamEmbed twitchUrl={match.twitchUrl} youtubeUrl={match.youtubeUrl} live={isLive} />
                    )}
                    {match.streamTitle && (
                      <p className="text-sm text-white/85 italic border-l-2 border-purple-500/40 pl-4 leading-relaxed">
                        « {match.streamTitle} »
                      </p>
                    )}
                    <div className="grid gap-2.5">
                      {match.twitchUrl && (
                        <StreamLink
                          href={match.twitchUrl}
                          title="Twitch"
                          subtitle="Regarder le live officiel"
                          tone="purple"
                        />
                      )}
                      {match.youtubeUrl && (
                        <StreamLink
                          href={match.youtubeUrl}
                          title="YouTube"
                          subtitle="Regarder le replay"
                          tone="red"
                        />
                      )}
                      {match.discordUrl && (
                        <StreamLink
                          href={match.discordUrl}
                          title="Discord"
                          subtitle="Rejoindre le vocal"
                          tone="blue"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white/55">
                    Aucun lien de diffusion pour le moment.
                    {canEditMatch && ' Clique sur « Ajouter » pour configurer.'}
                  </p>
                )}

                {hasStreamLinks && isLive && (
                  <BorderBeam size={150} duration={6} colorFrom="#9146ff" colorTo="#ef4444" borderWidth={1.5} />
                )}
              </Card>
            )}
          </div>
        </section>

        {/* Footer broadcast meta */}
        <section className="relative bg-black py-8">
          <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
            <span className="flex items-center gap-1.5">
              <Tv className="w-3 h-3 text-purple-400" />
              CDM 26
            </span>
            <span className="text-white/20">·</span>
            <span>Saison 2026</span>
            <span className="text-white/20">·</span>
            <span className="flex items-center gap-1.5">
              <CircleDot className="w-3 h-3" />
              {stage.code} · {stage.label}
            </span>
            <span className="text-white/20">·</span>
            <span># {match.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </section>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TeamColumn({
  team,
  align,
  side,
  outcome,
  reduce,
}: {
  team: TeamSide;
  align: 'left' | 'right';
  side: 'home' | 'away';
  outcome: Outcome;
  reduce: boolean;
}) {
  const dir = align === 'right' ? -1 : 1;
  const isWin = outcome === 'win';
  const isLose = outcome === 'lose';

  const variants: Variants = {
    hidden: { opacity: 0, x: dir * 60, filter: 'blur(8px)' },
    show: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: { type: 'spring', stiffness: 80, damping: 15 },
    },
  };

  return (
    <motion.div variants={reduce ? undefined : variants}>
      <Link href={`/teams/${team.id}`} className="group block">
        <div
          className={cn(
            'flex flex-col gap-4',
            align === 'right'
              ? 'items-center md:items-end text-center md:text-right'
              : 'items-center md:items-start text-center md:text-left',
          )}
        >
          <div className="relative">
            {isWin && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 8, scale: 0.6 }}
                animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 12 }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 z-10"
              >
                <Crown className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.7)] fill-yellow-400/30" />
              </motion.div>
            )}
            <TeamLogoXl team={team} side={side} glow={isWin} dim={isLose} reduce={reduce} />
          </div>
          <div className={cn(isLose && 'opacity-60')}>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1">
              {align === 'right' ? 'Domicile' : 'Extérieur'}
            </div>
            <div
              className={cn(
                'font-black text-2xl md:text-4xl tracking-tight leading-tight transition',
                isWin ? 'text-yellow-200' : 'text-white group-hover:text-emerald-300',
              )}
            >
              {team.name}
            </div>
            <div className="text-[10px] md:text-xs font-mono text-white/45 uppercase tracking-[0.3em] mt-1">
              {team.shortName}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function TeamLogoXl({
  team,
  side,
  glow,
  dim,
  reduce,
}: {
  team: TeamSide;
  side: 'home' | 'away';
  glow?: boolean;
  dim?: boolean;
  reduce: boolean;
}) {
  const ringGlow = glow
    ? 'ring-2 ring-yellow-400/70 shadow-[0_0_40px_-4px_rgba(250,204,21,0.55)]'
    : 'ring-1 ring-white/15 shadow-2xl';
  const fallbackGradient =
    side === 'home'
      ? 'from-emerald-500 via-emerald-400 to-yellow-500 shadow-emerald-500/20'
      : 'from-red-500 via-rose-500 to-purple-500 shadow-red-500/20';

  const float = reduce
    ? undefined
    : { y: [0, side === 'home' ? -8 : -6, 0] };

  return (
    <motion.div
      animate={float}
      transition={{ duration: side === 'home' ? 5 : 5.6, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={reduce ? undefined : { scale: 1.05, rotate: side === 'home' ? -2 : 2 }}
      className={cn(
        'relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-white/5 transition-all',
        ringGlow,
        dim && 'grayscale opacity-50',
      )}
    >
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
      ) : (
        <div
          className={cn(
            'w-full h-full bg-linear-to-br flex items-center justify-center text-black font-black text-3xl md:text-4xl',
            fallbackGradient,
          )}
        >
          {team.shortName.substring(0, 2).toUpperCase()}
        </div>
      )}
      {glow && (
        <div className="absolute inset-0 bg-linear-to-t from-yellow-400/20 to-transparent pointer-events-none" />
      )}
    </motion.div>
  );
}

function HeroScore({
  status,
  homeScore,
  awayScore,
  reduce,
}: {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  reduce: boolean;
}) {
  const scoreVariant: Variants = {
    hidden: { opacity: 0, scale: 0.6 },
    show: { opacity: 1, scale: 1, transition: { delay: 0.25, type: 'spring', stiffness: 150, damping: 12 } },
  };

  if (status === 'FINISHED' && homeScore !== null && awayScore !== null) {
    return (
      <motion.div variants={reduce ? undefined : scoreVariant} className="flex flex-col items-center">
        <div className="flex items-center gap-2 md:gap-5 text-5xl md:text-8xl font-black tabular-nums text-white tracking-tighter leading-none">
          {reduce ? (
            <span>{homeScore}</span>
          ) : (
            <NumberTicker value={homeScore} delay={0.45} className="text-white !tracking-tighter drop-shadow-[0_0_22px_rgba(255,255,255,0.18)]" />
          )}
          <span className="text-white/15 italic text-3xl md:text-6xl">:</span>
          {reduce ? (
            <span>{awayScore}</span>
          ) : (
            <NumberTicker value={awayScore} delay={0.6} className="text-white !tracking-tighter drop-shadow-[0_0_22px_rgba(255,255,255,0.18)]" />
          )}
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-[10px] uppercase tracking-[0.35em] text-yellow-300/80 mt-3 font-mono inline-flex items-center gap-1.5"
        >
          <Trophy className="w-3 h-3" />
          Score final · FT
        </motion.div>
      </motion.div>
    );
  }

  if (status === 'LIVE') {
    return (
      <motion.div variants={reduce ? undefined : scoreVariant} className="relative flex flex-col items-center">
        {/* Ondes rouges derrière le score (Ripple recoloré via --foreground) */}
        {!reduce && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] pointer-events-none"
            style={{ '--foreground': '#ef4444' } as React.CSSProperties}
          >
            <Ripple mainCircleSize={120} mainCircleOpacity={0.22} numCircles={6} className="mask-[radial-gradient(circle,white,transparent_75%)]" />
          </div>
        )}
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex items-center gap-2 md:gap-5 text-5xl md:text-8xl font-black tabular-nums text-red-400 tracking-tighter leading-none drop-shadow-[0_0_28px_rgba(239,68,68,0.45)]"
        >
          <span>{homeScore ?? 0}</span>
          <span className="text-red-500/40 italic text-3xl md:text-6xl animate-pulse">:</span>
          <span>{awayScore ?? 0}</span>
        </motion.div>
        <div className="relative text-[10px] uppercase tracking-[0.35em] text-red-300 mt-3 inline-flex items-center gap-1.5 font-mono font-black">
          <span className="live-dot" />
          <Radio className="w-3 h-3" />
          En direct
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={reduce ? undefined : scoreVariant} className="relative flex flex-col items-center">
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 md:w-36 md:h-36 rounded-full border border-white/10 bg-[conic-gradient(from_0deg,transparent,rgba(16,185,129,0.25),transparent_40%)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
        />
      )}
      <div className="relative flex items-center gap-2 text-3xl md:text-6xl font-black italic text-white/30 tracking-wider">
        <Swords className="w-7 h-7 md:w-11 md:h-11 text-white/30" />
        <span>VS</span>
      </div>
      <div className="relative text-[10px] uppercase tracking-[0.35em] text-white/40 mt-3 font-mono inline-flex items-center gap-1.5">
        <Hourglass className="w-3 h-3 text-blue-300" />
        À venir
      </div>
    </motion.div>
  );
}

function StatusPill({ status, reduce }: { status: string; reduce: boolean }) {
  const pulse = reduce ? undefined : { boxShadow: ['0 0 0 0 rgba(239,68,68,0)', '0 0 0 4px rgba(239,68,68,0.12)', '0 0 0 0 rgba(239,68,68,0)'] };

  if (status === 'LIVE') {
    return (
      <motion.span animate={pulse} transition={{ duration: 1.8, repeat: Infinity }} className="inline-flex rounded-full">
        <Badge className="bg-red-500/10 border-red-500/30 text-red-300 px-3 py-1 uppercase tracking-[0.22em] text-[10px] font-mono font-black gap-2">
          <span className="live-dot" />
          LIVE
        </Badge>
      </motion.span>
    );
  }
  if (status === 'FINISHED') {
    return (
      <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 px-3 py-1 uppercase tracking-[0.22em] text-[10px] font-mono font-black gap-2">
        <CheckCircle2 className="w-3 h-3" />
        Terminé
      </Badge>
    );
  }
  if (status === 'CANCELED') {
    return (
      <Badge className="bg-white/5 border-white/15 text-white/55 px-3 py-1 uppercase tracking-[0.22em] text-[10px] font-mono line-through">
        Annulé
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-300 px-3 py-1 uppercase tracking-[0.22em] text-[10px] font-mono font-black gap-2">
      <Hourglass className="w-3 h-3" />
      À venir
    </Badge>
  );
}

function ScoreInput({
  id,
  code,
  label,
  value,
  onChange,
  accent,
}: {
  id: string;
  code: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  accent: Accent;
}) {
  const s = ACCENT[accent];
  return (
    <div className={`relative rounded-xl bg-black/40 border ${s.border} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <Label
          htmlFor={id}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 font-mono"
        >
          <Target className={`w-3 h-3 ${s.text}`} />
          {label}
        </Label>
        <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${s.text}`}>{code}</span>
      </div>
      <Input
        id={id}
        type="number"
        min="0"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={`h-20 text-5xl font-black text-center tabular-nums bg-transparent border-0 focus-visible:ring-0 px-0 ${s.text}`}
      />
    </div>
  );
}

function StreamFieldGroup({
  id,
  label,
  accent,
  value,
  onChange,
  placeholder,
  type,
  optional,
}: {
  id: string;
  label: string;
  accent?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: 'text' | 'url';
  optional?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono flex items-center gap-1.5"
      >
        <span className={accent ?? ''}>{label}</span>
        {optional && <span className="text-[9px] text-white/30 normal-case">(optionnel)</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 bg-black/40 border-white/10 focus:border-purple-500/50 text-white"
      />
    </div>
  );
}

function StreamLink({
  href,
  title,
  subtitle,
  tone,
}: {
  href: string;
  title: string;
  subtitle: string;
  tone: 'purple' | 'red' | 'blue';
}) {
  const styles = {
    purple: { bg: 'hover:bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50', icon: 'bg-purple-500', text: 'text-purple-300' },
    red: { bg: 'hover:bg-red-500/10 border-red-500/30 hover:border-red-500/50', icon: 'bg-red-500', text: 'text-red-300' },
    blue: { bg: 'hover:bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50', icon: 'bg-blue-500', text: 'text-blue-300' },
  } as const;
  const c = styles[tone];

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-between px-4 py-3 rounded-xl bg-black/40 border ${c.bg} transition-all group`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${c.icon}`}>
          <Video className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className={`font-black text-sm tracking-tight ${c.text}`}>{title}</div>
          <div className="text-[10px] font-mono text-white/45 truncate uppercase tracking-[0.22em] mt-0.5">
            {subtitle}
          </div>
        </div>
      </div>
      <ExternalLink className={`w-4 h-4 group-hover:translate-x-0.5 transition-transform ${c.text}`} />
    </a>
  );
}
