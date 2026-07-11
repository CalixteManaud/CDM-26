import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  ChevronRight,
  UserPlus,
  Hash,
  Loader2,
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getUserDisplayName } from '@/lib/utils/display';

type TeamLite = {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  playerCount: number;
  coachName: string | null;
};

type MyRequest = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';
  desiredJersey: number;
  desiredPosition: string;
  reviewNote: string | null;
  createdAt: string;
  team: { id: string; name: string; shortName: string; logo: string | null };
};

type PageProps = {
  tournament: { id: string; name: string; playersPerTeam: number; registrationOpen: boolean };
  teams: TeamLite[];
  role: 'GUEST' | 'PARTICIPANT' | 'ADMIN';
  alreadyPlayer: { teamId: string; teamName: string } | null;
  requests: MyRequest[];
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { syncClerkUserById } = await import('@/lib/clerk');
  const { getUserRequestsForTournament } = await import('@/lib/utils/join-requests');
  const prisma = (await import('@/lib/prisma')).default;

  const tournamentId = ctx.params?.id as string;
  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return { redirect: { destination: '/', permanent: false } };

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      playersPerTeam: true,
      archivedAt: true,
      groupStageComplete: true,
      teams: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
          coach: { select: { username: true, name: true } },
          _count: { select: { players: true } },
        },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!tournament) return { notFound: true };

  const existingPlayer = await prisma.player.findFirst({
    where: { userId: dbUser.id, team: { tournamentId } },
    select: { teamId: true, team: { select: { name: true } } },
  });

  const requests = await getUserRequestsForTournament(dbUser.id, tournamentId);

  return {
    props: {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        playersPerTeam: tournament.playersPerTeam,
        registrationOpen: tournament.archivedAt === null && !tournament.groupStageComplete,
      },
      teams: tournament.teams.map((t) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        logo: t.logo,
        playerCount: t._count.players,
        coachName: t.coach ? getUserDisplayName(t.coach) : null,
      })),
      role: dbUser.role as PageProps['role'],
      alreadyPlayer: existingPlayer
        ? { teamId: existingPlayer.teamId, teamName: existingPlayer.team.name }
        : null,
      requests: JSON.parse(JSON.stringify(requests)),
    },
  };
};

const POSITIONS = [
  { value: 'GK', label: 'Gardien' },
  { value: 'DEF', label: 'Défenseur' },
  { value: 'MID', label: 'Milieu' },
  { value: 'ATT', label: 'Attaquant' },
] as const;

const POSITION_LABEL: Record<string, string> = {
  GK: 'Gardien',
  DEF: 'Défenseur',
  MID: 'Milieu',
  ATT: 'Attaquant',
};

function GateScreen({
  icon: Icon,
  title,
  description,
  backHref,
  backLabel,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="relative bg-black text-white min-h-screen overflow-hidden isolate">
      <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <Card className="relative max-w-md w-full text-center p-8 md:p-10 bg-white/2 border-white/10 overflow-hidden">
          <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-6 mx-auto">
            <Icon className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-3 text-white tracking-tight">{title}</h2>
          <p className="text-white/60 mb-8">{description}</p>
          <Link href={backHref}>
            <Button
              variant="outline"
              className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs px-6"
            >
              <ChevronRight className="w-3.5 h-3.5 mr-1 rotate-180" />
              {backLabel}
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default function JoinTournamentPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { tournament, teams, role, alreadyPlayer, requests } = props;
  const router = useRouter();

  const pending = requests.find((r) => r.status === 'PENDING') ?? null;
  const history = requests.filter((r) => r.status !== 'PENDING');

  const [target, setTarget] = useState<TeamLite | null>(null);
  const [jersey, setJersey] = useState('');
  const [position, setPosition] = useState<string>('ATT');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  // ─── Gates ───
  if (role === 'GUEST') {
    return (
      <GateScreen
        icon={ShieldCheck}
        title="Deviens participant d'abord"
        description="Pour rejoindre une équipe, tu dois d'abord passer participant depuis ton profil."
        backHref="/profile"
        backLabel="Aller au profil"
      />
    );
  }
  if (alreadyPlayer) {
    return (
      <GateScreen
        icon={CheckCircle2}
        title="Tu es déjà inscrit"
        description={`Tu fais déjà partie de ${alreadyPlayer.teamName} pour ce tournoi.`}
        backHref={`/teams/${alreadyPlayer.teamId}`}
        backLabel="Voir mon équipe"
      />
    );
  }
  if (!tournament.registrationOpen) {
    return (
      <GateScreen
        icon={Lock}
        title="Inscriptions fermées"
        description="Les inscriptions de ce tournoi sont closes (poules tirées ou tournoi archivé)."
        backHref={`/tournaments/${tournament.id}`}
        backLabel="Retour au tournoi"
      />
    );
  }

  const openRequest = (team: TeamLite) => {
    setJersey('');
    setPosition('ATT');
    setMessage('');
    setTarget(team);
  };

  const submitRequest = async () => {
    if (!target) return;
    const n = Number(jersey);
    if (!jersey || Number.isNaN(n) || n < 1 || n > 99) {
      toast.error('Numéro de maillot invalide (1-99)');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/join-requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: target.id, jerseyNumber: n, position, message }),
      });
      const json: { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Impossible d'envoyer la demande");
        return;
      }
      toast.success('Demande envoyée ! Un coach ou un admin va la valider.');
      setTarget(null);
      router.replace(router.asPath);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (!pending) return;
    setCancelBusy(true);
    try {
      const res = await fetch(`/api/join-requests/${pending.id}/cancel`, { method: 'POST' });
      const json: { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Impossible de retirer la demande');
        return;
      }
      toast.success('Demande retirée');
      router.replace(router.asPath);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`Rejoindre une équipe · ${tournament.name} — CDM 26`}</title>
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-14 md:py-18 relative">
            <Link
              href={`/tournaments/${tournament.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour au tournoi
            </Link>

            <div className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold text-emerald-400">
              <span className="block w-12 h-px bg-emerald-400" />
              <span className="font-mono">/ JOIN</span>
              <span className="text-white/30">—</span>
              <span>Inscription · {tournament.name}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black mt-5 leading-[0.92] tracking-tight">
              Rejoins <span className="text-gradient-worldcup">une équipe.</span>
            </h1>
            <p className="text-white/60 mt-6 max-w-2xl text-base leading-relaxed">
              Choisis l&apos;équipe que tu veux rejoindre et propose ton numéro et ton poste. Un coach ou un admin
              validera ta demande.
            </p>
          </div>
        </section>

        <section className="relative bg-black py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl space-y-10">
            {/* Demande en attente */}
            {pending && (
              <Card className="relative overflow-hidden bg-yellow-500/[0.06] border-yellow-500/30 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/30 grid place-items-center shrink-0">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-yellow-400 mb-1">
                        Demande en attente
                      </div>
                      <p className="text-white font-bold truncate">
                        {pending.team.name}{' '}
                        <span className="text-white/50 font-normal">
                          · {POSITION_LABEL[pending.desiredPosition] ?? pending.desiredPosition} #
                          {String(pending.desiredJersey).padStart(2, '0')}
                        </span>
                      </p>
                      <p className="text-xs text-white/45 mt-0.5">
                        Un coach ou un admin doit la valider. Tu ne peux avoir qu&apos;une demande à la fois.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={cancelRequest}
                    disabled={cancelBusy}
                    variant="outline"
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-500/50 font-black uppercase tracking-[0.16em] text-[11px] shrink-0"
                  >
                    {cancelBusy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                    Retirer
                  </Button>
                </div>
              </Card>
            )}

            {/* Grille des équipes */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black uppercase tracking-[0.14em] text-white/80">
                  Équipes engagées
                </h2>
                <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/40">
                  {teams.length} équipe{teams.length > 1 ? 's' : ''}
                </span>
              </div>

              {teams.length === 0 ? (
                <Card className="bg-white/2 border-white/10 py-14 text-center">
                  <Users className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/55">Aucune équipe n&apos;est encore engagée dans ce tournoi.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teams.map((team) => {
                    const full = team.playerCount >= tournament.playersPerTeam;
                    return (
                      <Card
                        key={team.id}
                        className="relative overflow-hidden bg-white/2 border-white/10 p-5 flex items-center gap-4"
                      >
                        {team.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={team.logo}
                            alt={team.name}
                            className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/15 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-linear-to-br from-emerald-500 via-yellow-500 to-red-500 grid place-items-center text-black font-black text-lg shrink-0">
                            {team.shortName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-white tracking-tight truncate">{team.name}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <Badge
                              className={`text-[10px] font-mono uppercase tracking-[0.2em] ${
                                full
                                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              }`}
                            >
                              {team.playerCount}/{tournament.playersPerTeam}
                            </Badge>
                            {team.coachName && (
                              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40 truncate">
                                Coach · {team.coachName}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => openRequest(team)}
                          disabled={full || !!pending}
                          size="sm"
                          className="shrink-0 bg-white text-black hover:bg-white/90 disabled:opacity-40 font-black uppercase tracking-[0.14em] text-[10px]"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          {full ? 'Complet' : 'Rejoindre'}
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
              {pending && (
                <p className="text-[11px] text-white/40 mt-3">
                  Retire ta demande en cours pour pouvoir postuler à une autre équipe.
                </p>
              )}
            </div>

            {/* Historique */}
            {history.length > 0 && (
              <div>
                <h2 className="text-lg font-black uppercase tracking-[0.14em] text-white/80 mb-4">Historique</h2>
                <div className="space-y-2">
                  {history.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/2 px-4 py-3"
                    >
                      {r.status === 'ACCEPTED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : r.status === 'REJECTED' ? (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-white/40 shrink-0" />
                      )}
                      <span className="text-sm text-white/80 font-bold truncate flex-1">{r.team.name}</span>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">
                        {r.status === 'ACCEPTED' ? 'Acceptée' : r.status === 'REJECTED' ? 'Refusée' : 'Retirée'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MODALE DE DEMANDE */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-lg bg-black border-white/15">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Rejoindre {target?.name}
            </DialogTitle>
            <DialogDescription className="text-white/55">
              Propose ton poste et ton numéro de maillot. Le coach pourra les ajuster à la validation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">Poste souhaité</Label>
              <div className="grid grid-cols-4 gap-2">
                {POSITIONS.map((p) => {
                  const active = position === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPosition(p.value)}
                      className={`py-2.5 rounded-lg border text-[11px] font-black uppercase tracking-[0.12em] transition ${
                        active
                          ? 'bg-emerald-500 text-black border-transparent'
                          : 'bg-white/2 border-white/15 text-white/70 hover:border-white/30'
                      }`}
                    >
                      {p.value}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="req-jersey" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                Numéro souhaité
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="req-jersey"
                  type="number"
                  min={1}
                  max={99}
                  value={jersey}
                  onChange={(e) => setJersey(e.target.value)}
                  placeholder="10"
                  className="h-14 pl-10 text-2xl font-black tabular-nums bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="req-message" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                Message au coach (optionnel)
              </Label>
              <Input
                id="req-message"
                type="text"
                maxLength={280}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Je joue souvent milieu offensif…"
                className="h-11 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={busy}
              className="border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs"
            >
              Annuler
            </Button>
            <Button
              onClick={submitRequest}
              disabled={busy}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-[0.18em] text-xs"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
