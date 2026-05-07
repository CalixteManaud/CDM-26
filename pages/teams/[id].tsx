import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  Trophy,
  UserPlus,
  Trash2,
  Target,
  TrendingUp,
  Pencil,
  Crown,
  ChevronRight,
  CircleDot,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ImageUpload } from '@/components/ui/image-upload';
import { getUserDisplayName } from '@/lib/utils/display';

type Player = {
  id: string;
  jerseyNumber: number;
  position: string;
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string;
  };
  stats: {
    id: string;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }[];
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
};

type Team = {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  tournament: { id: string; name: string; playersPerTeam: number };
  group: { id: string; name: string } | null;
  coach: {
    id: string;
    name: string;
    username: string | null;
    email: string;
  } | null;
  players: Player[];
  standings: Standing[];
};

type PageProps = {
  team: Team | null;
  canManage: boolean;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { getTeamById } = await import('@/actions/teams');

  const teamId = ctx.params?.id as string;
  const { userId } = getAuth(ctx.req);

  const result = await getTeamById(teamId);
  if (!result.success || !result.data) return { notFound: true };

  let canManage = false;
  if (userId) {
    const { syncClerkUserById } = await import('@/lib/clerk');
    const dbUser = await syncClerkUserById(userId);
    if (dbUser) {
      canManage = dbUser.role === 'ADMIN' || dbUser.id === result.data.coachUserId;
    }
  }

  return {
    props: {
      team: JSON.parse(JSON.stringify(result.data)),
      canManage,
    },
  };
};

const positionLabels: Record<string, string> = {
  GK: 'Gardien',
  DEF: 'Défenseur',
  MID: 'Milieu',
  ATT: 'Attaquant',
};

const positionColors: Record<string, { gradient: string; ring: string; text: string }> = {
  GK: { gradient: 'from-yellow-400 to-amber-600', ring: 'ring-yellow-500/30', text: 'text-yellow-300' },
  DEF: { gradient: 'from-blue-500 to-cyan-600', ring: 'ring-blue-500/30', text: 'text-blue-300' },
  MID: { gradient: 'from-emerald-500 to-emerald-700', ring: 'ring-emerald-500/30', text: 'text-emerald-300' },
  ATT: { gradient: 'from-red-500 to-pink-600', ring: 'ring-red-500/30', text: 'text-red-300' },
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

export default function TeamDetailPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editLogo, setEditLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!props.team) {
    return (
      <div className="relative bg-black text-white min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
        <Card className="relative max-w-md text-center p-10 bg-white/2 border-white/10">
          <Users className="w-14 h-14 text-white/40 mx-auto mb-5" />
          <h2 className="text-2xl font-black mb-3 text-white tracking-tight">Équipe introuvable</h2>
          <Link
            href="/teams"
            className="inline-flex items-center gap-1 text-sm font-mono text-emerald-400 hover:text-emerald-300 uppercase tracking-[0.22em]"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Retour aux équipes
          </Link>
        </Card>
      </div>
    );
  }

  const team = props.team;
  const standing = team.standings[0];
  const teamStats = team.players.reduce(
    (acc, p) => {
      p.stats.forEach((s) => {
        acc.goals += s.goals;
        acc.assists += s.assists;
        acc.yellowCards += s.yellowCards;
        acc.redCards += s.redCards;
      });
      return acc;
    },
    { goals: 0, assists: 0, yellowCards: 0, redCards: 0 }
  );

  const handleDeletePlayer = async () => {
    if (!selectedPlayer) return;
    try {
      const res = await fetch(`/api/players/${selectedPlayer.id}/delete`, { method: 'DELETE' });
      const json: { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la suppression du joueur');
        return;
      }
      toast.success("Joueur retiré de l'équipe");
      setDeleteDialogOpen(false);
      setSelectedPlayer(null);
      window.location.reload();
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const handleOpenEditDialog = () => {
    setEditName(team.name);
    setEditShortName(team.shortName);
    setEditLogo(team.logo);
    setEditDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!editName.trim() || !editShortName.trim()) {
      toast.error('Tous les champs sont requis');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, shortName: editShortName, logo: editLogo }),
      });
      const json: { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la sauvegarde');
        return;
      }
      toast.success('Équipe mise à jour');
      setEditDialogOpen(false);
      window.location.reload();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const maxPlayers = team.tournament.playersPerTeam;
  const currentPlayers = team.players.length;
  const canAddPlayers = currentPlayers < maxPlayers;
  const goalDiff = standing ? standing.goalsFor - standing.goalsAgainst : 0;
  const isFirst = standing?.position === 1;

  return (
    <>
      <Head>
        <title>{team.name} — CDM 26</title>
        <meta name="description" content={`${team.name} — effectif, classement, statistiques.`} />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-14 md:py-20 relative">
            <Link
              href="/teams"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour aux équipes
            </Link>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
              <TeamLogoLarge team={team} />

              <div className="flex-1 min-w-0">
                <SectionEyebrow num="EQP" label={`Équipe · ${team.shortName}`} accent="emerald" />
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mt-4 leading-[0.92] tracking-tight">
                  <span className="text-gradient-worldcup">{team.name}</span>
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link href={`/tournaments/${team.tournament.id}`}>
                    <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono cursor-pointer hover:bg-emerald-500/15">
                      <Trophy className="w-3 h-3 mr-1" />
                      {team.tournament.name}
                    </Badge>
                  </Link>
                  {team.group && (
                    <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                      <Shield className="w-3 h-3 mr-1" />
                      {team.group.name}
                    </Badge>
                  )}
                  {team.coach && (
                    <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                      <Users className="w-3 h-3 mr-1" />
                      Coach · {getUserDisplayName(team.coach)}
                    </Badge>
                  )}
                  <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <CircleDot className="w-3 h-3 mr-1" /> {currentPlayers}/{maxPlayers} joueurs
                  </Badge>
                  {props.canManage && (
                    <Button
                      onClick={handleOpenEditDialog}
                      size="sm"
                      variant="outline"
                      className="ml-1 border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-[10px] h-7 px-3"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Modifier
                    </Button>
                  )}
                </div>
              </div>

              {standing && <StandingPill position={standing.position} points={standing.points} isFirst={isFirst} />}
            </div>
          </div>
        </section>

        {/* MINI STATS BAND */}
        {standing && (
          <section className="relative bg-black border-b border-white/10 overflow-hidden">
            <div className="container mx-auto px-4 py-10">
              <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-white/10 border-y border-white/10">
                <MiniStatCell code="MJ" label="Joués" value={standing.played} color="text-white" />
                <MiniStatCell code="V" label="Victoires" value={standing.won} color="text-emerald-400" />
                <MiniStatCell code="N" label="Nuls" value={standing.drawn} color="text-yellow-400" />
                <MiniStatCell code="D" label="Défaites" value={standing.lost} color="text-red-400" />
                <MiniStatCell
                  code="DIFF"
                  label="Différence"
                  value={goalDiff}
                  color={goalDiff > 0 ? 'text-emerald-400' : goalDiff < 0 ? 'text-red-400' : 'text-white/65'}
                  prefix={goalDiff > 0 ? '+' : ''}
                />
              </div>
            </div>
          </section>
        )}

        {/* TEAM STATS + ROSTER */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4 space-y-12">
            {/* Team aggregated stats */}
            <div>
              <SectionEyebrow num="01" label="Statistiques d'équipe" accent="emerald" />
              <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight mb-8">
                <span className="italic font-light text-white/35">Le bilan</span>{' '}
                <span className="text-gradient-worldcup">collectif.</span>
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <BigStat icon={Target} label="Buts marqués" code="GLS" value={teamStats.goals} accent="emerald" />
                <BigStat icon={TrendingUp} label="Passes décisives" code="AST" value={teamStats.assists} accent="purple" />
                <BigStat icon={SquareYellow} label="Cartons jaunes" code="CJ" value={teamStats.yellowCards} accent="yellow" />
                <BigStat icon={SquareRed} label="Cartons rouges" code="CR" value={teamStats.redCards} accent="red" />
              </div>
            </div>

            {/* Roster */}
            <div>
              <div className="flex items-end justify-between gap-6 flex-wrap mb-8">
                <div>
                  <SectionEyebrow num="02" label={`Effectif · ${currentPlayers}/${maxPlayers}`} accent="yellow" />
                  <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                    <span className="italic font-light text-white/35">Les</span>{' '}
                    <span className="text-gradient-worldcup">joueurs.</span>
                  </h2>
                </div>
                {props.canManage && canAddPlayers && (
                  <Link href={`/teams/${team.id}/add-player`}>
                    <Button className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Ajouter un joueur
                    </Button>
                  </Link>
                )}
              </div>

              {team.players.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {team.players.map((player, index) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      index={index}
                      canManage={props.canManage}
                      isDeleting={deleteDialogOpen && selectedPlayer?.id === player.id}
                      onAskDelete={() => {
                        setSelectedPlayer(player);
                        setDeleteDialogOpen(true);
                      }}
                      deleteDialogOpen={deleteDialogOpen}
                      setDeleteDialogOpen={setDeleteDialogOpen}
                      handleDeletePlayer={handleDeletePlayer}
                      selectedPlayerName={selectedPlayer ? getUserDisplayName(selectedPlayer.user) : ''}
                    />
                  ))}
                </div>
              ) : (
                <Card className="relative overflow-hidden bg-white/2 border-white/10 py-16 text-center">
                  <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-5 mx-auto">
                    <Users className="w-12 h-12 text-white/40" />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight mb-2">Aucun joueur</h3>
                  {props.canManage && <p className="text-white/55">Ajoute des joueurs pour démarrer.</p>}
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* External link strip */}
        <section className="relative bg-black py-8">
          <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
            <span className="flex items-center gap-1.5">
              <Tv className="w-3 h-3 text-purple-400" />
              Streams Twitch
            </span>
            <span className="text-white/20">·</span>
            <span>Saison 2026</span>
            <span className="text-white/20">·</span>
            <span># {team.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </section>

        {/* EDIT DIALOG */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg bg-black border-white/15">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-400" />
                Modifier l&apos;équipe
              </DialogTitle>
              <DialogDescription className="text-white/55">
                Mets à jour le nom, le code court et le logo. Seuls admins et coachs peuvent éditer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">Logo</Label>
                <ImageUpload
                  value={editLogo ?? ''}
                  onChange={(url) => setEditLogo(url || null)}
                  label="Logo de l'équipe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                  Nom de l&apos;équipe
                </Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Équipe des Lions"
                  maxLength={50}
                  className="h-11 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                />
                <p className="text-[10px] text-white/40 tabular-nums font-mono">{editName.length}/50 caractères</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-shortName" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                  Code court
                </Label>
                <Input
                  id="edit-shortName"
                  type="text"
                  value={editShortName}
                  onChange={(e) => setEditShortName(e.target.value.toUpperCase())}
                  placeholder="LIO"
                  maxLength={5}
                  className="h-12 text-2xl font-black text-center tabular-nums uppercase tracking-[0.3em] bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                />
                <p className="text-[10px] text-white/40 tabular-nums font-mono">{editShortName.length}/5 caractères</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={saving}
                className="border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveTeam}
                disabled={saving || !editName.trim() || !editShortName.trim()}
                className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function TeamLogoLarge({ team }: { team: Team }) {
  if (team.logo) {
    return (
      <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden ring-1 ring-white/15 bg-white/5 shrink-0 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-linear-to-br from-emerald-500 via-yellow-500 to-red-500 flex items-center justify-center text-black font-black text-3xl md:text-4xl ring-1 ring-white/15 shrink-0 shadow-2xl shadow-emerald-500/20">
      {team.shortName.substring(0, 2).toUpperCase()}
    </div>
  );
}

function StandingPill({ position, points, isFirst }: { position: number; points: number; isFirst: boolean }) {
  return (
    <Card
      className={`relative overflow-hidden text-center min-w-32 px-5 py-5 bg-white/2 ${
        isFirst ? 'border-yellow-500/40' : 'border-white/15'
      }`}
    >
      {isFirst && <BorderBeam size={90} duration={6} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1.5} />}
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/45 mb-1.5 flex items-center justify-center gap-1.5">
        {isFirst && <Crown className="w-3 h-3 text-yellow-400" />}
        Position
      </div>
      <div
        className={`text-5xl font-black tabular-nums leading-none ${
          isFirst ? 'text-yellow-300' : 'text-white'
        }`}
      >
        {position}
      </div>
      <div className="border-t border-white/10 mt-3 pt-3">
        <div className="text-2xl font-black text-white tabular-nums">
          <NumberTicker value={points} />
        </div>
        <div className="text-[9px] font-mono text-white/40 uppercase tracking-[0.25em] mt-1">Points</div>
      </div>
    </Card>
  );
}

function MiniStatCell({
  code,
  label,
  value,
  color,
  prefix,
}: {
  code: string;
  label: string;
  value: number;
  color: string;
  prefix?: string;
}) {
  return (
    <div className="px-4 md:px-6 py-6 first:pl-0 md:first:pl-6">
      <div className="text-[9px] text-white/40 uppercase tracking-[0.3em] mb-2 font-mono">{code}</div>
      <div className={`text-3xl md:text-4xl font-black mb-1 tracking-tighter tabular-nums ${color}`}>
        {prefix ?? ''}
        <NumberTicker value={value} />
      </div>
      <div className="text-[10px] text-white/65 font-bold uppercase tracking-[0.22em]">{label}</div>
    </div>
  );
}

function BigStat({
  icon: Icon,
  label,
  code,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  code: string;
  value: number;
  accent: Accent;
}) {
  const s = ACCENT[accent];
  return (
    <Card className={`relative overflow-hidden bg-white/2 border ${s.border} hover:border-white/30 transition-all p-6`}>
      <div className="flex items-start justify-between mb-5">
        <div className={`w-10 h-10 rounded-xl bg-white/5 border ${s.border} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${s.text}`} />
        </div>
        <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${s.text}`}>{code}</span>
      </div>
      <div className={`text-4xl md:text-5xl font-black tabular-nums tracking-tighter mb-1.5 ${s.text}`}>
        <NumberTicker value={value} />
      </div>
      <div className="text-xs font-bold uppercase tracking-wider text-white/80">{label}</div>
    </Card>
  );
}

function SquareYellow({ className }: { className?: string }) {
  return <div className={`w-4 h-4 rounded-sm bg-yellow-400 ${className ?? ''}`} />;
}
function SquareRed({ className }: { className?: string }) {
  return <div className={`w-4 h-4 rounded-sm bg-red-500 ${className ?? ''}`} />;
}

function PlayerCard({
  player,
  index,
  canManage,
  onAskDelete,
  deleteDialogOpen,
  setDeleteDialogOpen,
  handleDeletePlayer,
  isDeleting,
  selectedPlayerName,
}: {
  player: Player;
  index: number;
  canManage: boolean;
  onAskDelete: () => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (b: boolean) => void;
  handleDeletePlayer: () => Promise<void>;
  isDeleting: boolean;
  selectedPlayerName: string;
}) {
  const totals = player.stats.reduce(
    (acc, s) => ({
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
      yellowCards: acc.yellowCards + s.yellowCards,
      redCards: acc.redCards + s.redCards,
    }),
    { goals: 0, assists: 0, yellowCards: 0, redCards: 0 }
  );

  const pos = positionColors[player.position] ?? positionColors.MID;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      whileHover={{ y: -2 }}
      className="relative group"
    >
      <Card className="relative overflow-hidden h-full bg-white/2 border-white/10 group-hover:border-white/30 transition-all p-0">
        {/* Top strip */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${pos.text}`}>
            {player.position} · {positionLabels[player.position]}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">
            #{player.jerseyNumber.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-12 h-12 rounded-lg bg-linear-to-br ${pos.gradient} flex items-center justify-center text-black font-black text-xl tabular-nums shrink-0 ring-1 ${pos.ring}`}
              >
                {player.jerseyNumber}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-white tracking-tight truncate leading-tight">
                  {getUserDisplayName(player.user)}
                </h3>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/45 font-mono mt-0.5">
                  {positionLabels[player.position]}
                </p>
              </div>
            </div>

            {canManage && (
              <Dialog open={isDeleting && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    onClick={onAskDelete}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/20"
                    aria-label="Retirer le joueur"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-black border-white/15">
                  <DialogHeader>
                    <DialogTitle className="font-black tracking-tight">Retirer le joueur</DialogTitle>
                    <DialogDescription className="text-white/55">
                      Es-tu sûr de vouloir retirer <strong className="text-white">{selectedPlayerName}</strong> de
                      l&apos;équipe ? Cette action est irréversible.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                      className="border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleDeletePlayer}
                      className="bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-[0.18em] text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Retirer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <PlayerStat label="B" value={totals.goals} color="text-emerald-400" />
            <PlayerStat label="P.D" value={totals.assists} color="text-purple-400" />
            <PlayerStat label="CJ" value={totals.yellowCards} color="text-yellow-400" />
            <PlayerStat label="CR" value={totals.redCards} color="text-red-400" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function PlayerStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center rounded-md bg-white/3 border border-white/10 py-1.5">
      <div className={`text-base font-black tabular-nums leading-tight ${color}`}>{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/40 mt-0.5">{label}</div>
    </div>
  );
}

