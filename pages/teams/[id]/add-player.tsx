import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Hash,
  User as UserIcon,
  Shield,
  ArrowRight,
  Search,
  X,
  Loader2,
  CheckCircle2,
  Users,
  Lock,
  ChevronRight,
  CircleDot,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { getUserDisplayName } from '@/lib/utils/display';

type User = {
  id: string;
  name: string;
  username: string | null;
  email: string;
};

type Team = {
  id: string;
  name: string;
  shortName: string;
  tournament: { id: string; name: string; playersPerTeam: number };
  players: { id: string; jerseyNumber: number; userId: string }[];
};

type PageProps = {
  team: Team | null;
  canManage: boolean;
  availableUsers: User[];
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { getTeamById } = await import('@/actions/teams');
  const { syncClerkUserById } = await import('@/lib/clerk');
  const prisma = (await import('@/lib/prisma')).default;

  const teamId = ctx.params?.id as string;
  const { userId } = getAuth(ctx.req);

  const result = await getTeamById(teamId);
  if (!result.success || !result.data) return { notFound: true };

  let canManage = false;
  if (userId) {
    const dbUser = await syncClerkUserById(userId);
    if (dbUser) {
      const { canManageTeam } = await import('@/lib/utils/permissions');
      canManage = await canManageTeam(dbUser.id, teamId);
    }
  }

  if (!canManage) {
    return { redirect: { destination: `/teams/${teamId}`, permanent: false } };
  }

  const availableUsers = await prisma.user.findMany({
    where: {
      role: 'PARTICIPANT',
      NOT: {
        players: {
          some: { team: { tournamentId: result.data.tournamentId } },
        },
      },
    },
    select: { id: true, name: true, username: true, email: true },
    orderBy: { username: 'asc' },
  });

  return {
    props: {
      team: JSON.parse(JSON.stringify(result.data)),
      canManage,
      availableUsers: JSON.parse(JSON.stringify(availableUsers)),
    },
  };
};

type FormData = {
  userId: string;
  jerseyNumber: string;
  position: 'GK' | 'DEF' | 'MID' | 'ATT';
};

const positions = [
  { value: 'GK', label: 'Gardien', short: 'GK', gradient: 'from-yellow-400 to-amber-600', text: 'text-yellow-300', border: 'border-yellow-500/40' },
  { value: 'DEF', label: 'Défenseur', short: 'DEF', gradient: 'from-blue-500 to-cyan-600', text: 'text-blue-300', border: 'border-blue-500/40' },
  { value: 'MID', label: 'Milieu', short: 'MID', gradient: 'from-emerald-500 to-emerald-700', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  { value: 'ATT', label: 'Attaquant', short: 'ATT', gradient: 'from-red-500 to-pink-600', text: 'text-red-300', border: 'border-red-500/40' },
] as const;

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

export default function AddPlayerPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<FormData>({
    userId: '',
    jerseyNumber: '',
    position: 'ATT',
  });

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return props.availableUsers;
    const q = searchQuery.toLowerCase();
    return props.availableUsers.filter((u) => {
      const name = getUserDisplayName(u).toLowerCase();
      return name.includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [props.availableUsers, searchQuery]);

  if (!props.team) {
    return (
      <GateScreen
        title="Équipe introuvable"
        description="Cette équipe n'existe pas ou a été supprimée."
        icon={Shield}
        accent="red"
      />
    );
  }

  const team = props.team;
  const usedJerseyNumbers = team.players.map((p) => p.jerseyNumber);
  const maxPlayers = team.tournament.playersPerTeam;
  const currentPlayers = team.players.length;

  if (currentPlayers >= maxPlayers) {
    return (
      <GateScreen
        title="Équipe complète"
        description={`L'équipe a atteint le nombre maximum de joueurs (${maxPlayers}).`}
        icon={Lock}
        accent="yellow"
        backHref={`/teams/${team.id}`}
        backLabel="Retour à l'équipe"
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.userId) {
      toast.error('Sélectionne un joueur');
      return;
    }
    const jerseyNum = Number(formData.jerseyNumber);
    if (!formData.jerseyNumber || isNaN(jerseyNum)) {
      toast.error('Numéro de maillot invalide');
      return;
    }
    if (jerseyNum < 1 || jerseyNum > 99) {
      toast.error('Le numéro doit être entre 1 et 99');
      return;
    }
    if (usedJerseyNumbers.includes(jerseyNum)) {
      toast.error('Ce numéro est déjà pris');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/players/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: formData.userId,
            jerseyNumber: jerseyNum,
            position: formData.position,
            teamId: team.id,
          }),
        });
        const json: { id?: string; error?: string } = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Impossible d'ajouter le joueur");
          return;
        }
        toast.success("Joueur ajouté à l'équipe !");
        router.push(`/teams/${team.id}`);
      } catch {
        toast.error('Erreur réseau / serveur');
      }
    });
  };

  return (
    <>
      <Head>
        <title>Ajouter un joueur · {team.name} — CDM 26</title>
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-16 md:py-20 relative">
            <Link
              href={`/teams/${team.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l&apos;équipe
            </Link>

            <SectionEyebrow num="ADD" label={`Recrutement · ${team.shortName}`} accent="emerald" />
            <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
              Ajouter <span className="italic font-light text-white/35">un</span>{' '}
              <span className="text-gradient-worldcup">joueur.</span>
            </h1>
            <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
              Recrute un joueur pour <strong className="text-white">{team.name}</strong>.
              Sélectionne le nom, sa position et son numéro de maillot.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <CircleDot className="w-3 h-3 mr-1" /> Effectif {currentPlayers}/{maxPlayers}
              </Badge>
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                {props.availableUsers.length} dispo
              </Badge>
            </div>
          </div>
        </section>

        {/* FORM */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* SECTION 01 — JOUEUR */}
              <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-7 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-7">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <UserIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 mb-1.5">
                        § Section 01
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Sélection du joueur</h2>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 shrink-0 hidden sm:block">
                    {filteredUsers.length} dispo
                  </span>
                </div>

                {props.availableUsers.length === 0 ? (
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
                    <p className="font-black text-yellow-300 tracking-tight mb-2">
                      Aucun joueur disponible pour ce tournoi
                    </p>
                    <p className="text-xs text-white/55 leading-relaxed">
                      Les utilisateurs doivent être <strong className="text-white">PARTICIPANT</strong> et ne pas être déjà
                      dans une autre équipe de ce tournoi.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher par nom ou email…"
                        className="h-12 pl-10 pr-10 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-md transition-colors"
                          aria-label="Effacer la recherche"
                        >
                          <X className="w-3.5 h-3.5 text-white/50" />
                        </button>
                      )}
                    </div>

                    {/* List */}
                    {filteredUsers.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto space-y-1.5 rounded-xl border border-white/10 bg-black/40 p-2">
                        {filteredUsers.map((user) => {
                          const isSelected = formData.userId === user.id;
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, userId: user.id }))}
                              className={`w-full text-left px-3 py-2.5 rounded-md transition-all flex items-center justify-between gap-3 group ${
                                isSelected
                                  ? 'bg-emerald-500/10 border border-emerald-500/40'
                                  : 'bg-transparent hover:bg-white/[0.03] border border-transparent hover:border-white/15'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-black text-sm text-white truncate tracking-tight">
                                  {getUserDisplayName(user)}
                                </div>
                                <div className="text-[10px] font-mono text-white/45 truncate uppercase tracking-[0.2em] mt-0.5">
                                  {user.email}
                                </div>
                              </div>
                              {isSelected ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
                        <Search className="w-10 h-10 mx-auto mb-3 text-white/30" />
                        <p className="text-sm text-white/55">
                          Aucun joueur trouvé pour <strong className="text-white">« {searchQuery} »</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* SECTION 02 — POSITION */}
              <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-yellow-400 mb-1.5">
                      § Section 02
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Position</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {positions.map((pos) => {
                    const isActive = formData.position === pos.value;
                    return (
                      <button
                        key={pos.value}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, position: pos.value }))}
                        className={`relative overflow-hidden p-5 rounded-xl border transition-all ${
                          isActive
                            ? `bg-gradient-to-br ${pos.gradient} text-black border-transparent shadow-lg`
                            : `bg-white/[0.02] ${pos.border} hover:bg-white/[0.04] hover:border-white/30 text-white`
                        }`}
                      >
                        <div className={`text-3xl font-black mb-1 tabular-nums tracking-tight ${isActive ? 'text-black' : pos.text}`}>
                          {pos.short}
                        </div>
                        <div className={`text-[10px] font-mono uppercase tracking-[0.25em] ${isActive ? 'text-black/80' : 'text-white/55'}`}>
                          {pos.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* SECTION 03 — NUMÉRO */}
              <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-red-400 mb-1.5">
                      § Section 03
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Numéro de maillot</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="jerseyNumber" className="sr-only">
                    Numéro de maillot
                  </Label>
                  <Input
                    id="jerseyNumber"
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={formData.jerseyNumber}
                    onChange={(e) => setFormData((p) => ({ ...p, jerseyNumber: e.target.value }))}
                    placeholder="10"
                    className="h-20 text-5xl font-black text-center tabular-nums bg-black/40 border-white/10 focus:border-red-500/50 text-white"
                  />
                  <div className="text-[10px] text-center text-white/40 font-mono uppercase tracking-[0.25em]">
                    min 01 · max 99
                  </div>

                  {usedJerseyNumbers.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-3">
                        / Numéros déjà pris
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {usedJerseyNumbers
                          .sort((a, b) => a - b)
                          .map((n) => (
                            <span
                              key={n}
                              className="px-2 py-1 rounded-md text-[11px] font-black tabular-nums bg-white/5 border border-white/10 text-white/55 font-mono"
                            >
                              {n.toString().padStart(2, '0')}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* SUBMIT */}
              <div className="pt-2">
                <ShimmerButton
                  type="submit"
                  disabled={isPending || props.availableUsers.length === 0}
                  shimmerColor="#ffffff"
                  background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                  className="w-full px-7 py-5 font-black uppercase tracking-[0.18em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Ajout en cours…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Ajouter le joueur
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </ShimmerButton>
              </div>
            </motion.form>
          </div>
        </section>
      </div>
    </>
  );
}

function GateScreen({
  icon: Icon,
  accent,
  title,
  description,
  backHref = '/teams',
  backLabel = 'Retour aux équipes',
}: {
  icon: typeof Users;
  accent: Accent;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  const s = ACCENT[accent];
  return (
    <div className="relative bg-black text-white min-h-screen overflow-hidden isolate">
      <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <Card className={`relative max-w-md w-full text-center p-8 md:p-10 bg-white/[0.02] ${s.border} overflow-hidden`}>
          <div className={`relative inline-flex p-5 rounded-2xl bg-white/5 border ${s.border} mb-6 mx-auto`}>
            <Icon className={`w-12 h-12 ${s.text}`} />
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
          <BorderBeam size={140} duration={9} colorFrom="#10b981" colorTo="#dc2626" borderWidth={1} />
        </Card>
      </div>
    </div>
  );
}
