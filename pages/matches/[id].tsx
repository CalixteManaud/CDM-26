import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';

import { PlayerStatsForm } from '@/components/match/player-stats-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BorderBeam } from '@/components/ui/border-beam';
import { ShimmerButton } from '@/components/ui/shimmer-button';

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

type PageProps = { match: Match | null };

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
  const result = await getMatchById(matchId);
  if (!result.success || !result.data) return { notFound: true };

  return {
    props: { match: JSON.parse(JSON.stringify(result.data)) },
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

export default function MatchDetailPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'ADMIN';
  const [isPending, startTransition] = useTransition();

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

  if (!match) {
    return (
      <div className="relative bg-black text-white min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
        <Card className="relative max-w-md text-center p-10 bg-white/[0.02] border-white/10">
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
  const stage = stageMeta[match.stage] ?? { label: match.stage, code: match.stage.slice(0, 3) };

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
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div
            className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${
              isLive ? 'via-red-500/70' : 'via-emerald-500/60'
            } to-transparent`}
          />
          <div className="container mx-auto px-4 py-14 md:py-20 relative">
            <Link
              href={`/tournaments/${match.tournament.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour au tournoi
            </Link>

            {/* Eyebrow */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <SectionEyebrow num={stage.code} label={stage.label} accent={isLive ? 'red' : 'emerald'} />
              <StatusPill status={match.status} />
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
            </div>

            {/* Match line: home logo / SCORE / away logo */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-10 max-w-5xl mx-auto">
              <Link href={`/teams/${match.homeTeam.id}`} className="group">
                <div className="flex flex-col items-center md:items-end gap-4 text-center md:text-right">
                  <TeamLogoXl team={match.homeTeam} />
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1">
                      Domicile
                    </div>
                    <div className="font-black text-2xl md:text-4xl text-white tracking-tight leading-tight group-hover:text-emerald-300 transition">
                      {match.homeTeam.name}
                    </div>
                    <div className="text-[10px] md:text-xs font-mono text-white/45 uppercase tracking-[0.3em] mt-1">
                      {match.homeTeam.shortName}
                    </div>
                  </div>
                </div>
              </Link>

              <ScoreDisplay status={match.status} homeScore={match.homeScore} awayScore={match.awayScore} />

              <Link href={`/teams/${match.awayTeam.id}`} className="group">
                <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
                  <TeamLogoXl team={match.awayTeam} />
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1">
                      Extérieur
                    </div>
                    <div className="font-black text-2xl md:text-4xl text-white tracking-tight leading-tight group-hover:text-emerald-300 transition">
                      {match.awayTeam.name}
                    </div>
                    <div className="text-[10px] md:text-xs font-mono text-white/45 uppercase tracking-[0.3em] mt-1">
                      {match.awayTeam.shortName}
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Date strip */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono uppercase tracking-[0.3em] text-white/45">
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
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <section className="relative bg-black border-b border-white/10 py-14">
          <div className="container mx-auto px-4 max-w-4xl space-y-6">
            {/* DQ banner */}
            {isDisqualified && (
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
            )}

            {/* Submit result */}
            {canEditMatch && (
              <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-7 md:p-8">
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
                        <h4 className="text-sm font-black text-white tracking-tight uppercase tracking-[0.18em]">
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
              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-950/20 via-black to-black border-purple-500/20 p-7 md:p-8">
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
                  <div className="space-y-3">
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

function TeamLogoXl({ team }: { team: TeamSide }) {
  if (team.logo) {
    return (
      <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden ring-1 ring-white/15 bg-white/5 shadow-2xl shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-emerald-500 via-yellow-500 to-red-500 flex items-center justify-center text-black font-black text-3xl md:text-4xl ring-1 ring-white/15 shadow-2xl shadow-emerald-500/20 shrink-0">
      {team.shortName.substring(0, 2).toUpperCase()}
    </div>
  );
}

function ScoreDisplay({
  status,
  homeScore,
  awayScore,
}: {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}) {
  if (status === 'FINISHED' && homeScore !== null && awayScore !== null) {
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 md:gap-5 text-5xl md:text-8xl font-black tabular-nums text-white tracking-tighter leading-none">
          <span>{homeScore}</span>
          <span className="text-white/15 italic text-3xl md:text-6xl">:</span>
          <span>{awayScore}</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.35em] text-white/45 mt-3 font-mono">
          Score final · FT
        </div>
      </div>
    );
  }
  if (status === 'LIVE') {
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 md:gap-5 text-5xl md:text-8xl font-black tabular-nums text-red-400 tracking-tighter leading-none drop-shadow-[0_0_24px_rgba(239,68,68,0.35)]">
          <span>{homeScore ?? 0}</span>
          <span className="text-red-500/40 italic text-3xl md:text-6xl animate-pulse">:</span>
          <span>{awayScore ?? 0}</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.35em] text-red-300 mt-3 inline-flex items-center gap-1.5 font-mono font-black">
          <span className="live-dot" />
          En direct
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <div className="text-3xl md:text-6xl font-black italic text-white/30 tracking-wider">VS</div>
      <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 mt-3 font-mono">À venir</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'LIVE') {
    return (
      <Badge className="bg-red-500/10 border-red-500/30 text-red-300 px-3 py-1 uppercase tracking-[0.22em] text-[10px] font-mono font-black gap-2">
        <span className="live-dot" />
        LIVE
      </Badge>
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
