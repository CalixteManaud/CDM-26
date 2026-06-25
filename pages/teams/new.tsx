import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  Users,
  Shield,
  Tag,
  Trophy,
  ArrowRight,
  Loader2,
  ShieldAlert,
  LogIn,
  Info,
  Image as ImageIcon,
  ChevronRight,
  CircleDot,
  Check,
  Calendar,
  Lock,
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
import { ImageUpload } from '@/components/ui/image-upload';

type Tournament = {
  id: string;
  name: string;
  startDate: string;
  groupCount: number;
  teamsPerGroup: number;
  _count: { teams: number };
};

type PageProps = {
  isSignedIn: boolean;
  canCreate: boolean;
  tournaments: Tournament[];
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth, clerkClient } = await import('@clerk/nextjs/server');
  const { getTournaments } = await import('@/actions/tournaments');
  const prisma = (await import('@/lib/prisma')).default;

  const { userId } = getAuth(ctx.req);
  if (!userId) {
    return { props: { isSignedIn: false, canCreate: false, tournaments: [] } };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const isAdmin = user.publicMetadata?.role === 'ADMIN';

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { coachedTeams: true },
  });
  const isCoach = Boolean(dbUser && dbUser.coachedTeams.length > 0);
  const canCreate = isAdmin || isCoach;

  const tournamentsResult = await getTournaments();
  const tournaments = tournamentsResult.success && tournamentsResult.data ? tournamentsResult.data : [];

  return {
    props: {
      isSignedIn: true,
      canCreate,
      tournaments: JSON.parse(JSON.stringify(tournaments)),
    },
  };
};

type CreateTeamPayload = {
  name: string;
  shortName: string;
  logo: string;
  tournamentId: string;
};

type Accent = 'emerald' | 'yellow' | 'red' | 'purple';
const ACCENT: Record<Accent, { text: string; bg: string; border: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/30' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/30' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/30' },
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

export default function NewTeamPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const reduce = useReducedMotion();

  const [formData, setFormData] = useState<CreateTeamPayload>({
    name: '',
    shortName: '',
    logo: '',
    tournamentId: '',
  });

  // Pré-sélection du tournoi via ?tournament=<id> (lien « Ajouter une équipe »
  // depuis la page tournoi). On ne l'applique que si l'id existe dans la liste.
  useEffect(() => {
    if (!router.isReady) return;
    const t = router.query.tournament;
    if (typeof t === 'string' && t && props.tournaments.some((x) => x.id === t)) {
      setFormData((p) => (p.tournamentId ? p : { ...p, tournamentId: t }));
    }
  }, [router.isReady, router.query.tournament, props.tournaments]);

  if (!props.isSignedIn) {
    return (
      <GateScreen
        icon={LogIn}
        accent="purple"
        title="Connexion requise"
        description="Connecte-toi pour inscrire une équipe."
      />
    );
  }

  if (!props.canCreate) {
    return (
      <GateScreen
        icon={ShieldAlert}
        accent="red"
        title="Accès refusé"
        description="Seuls les administrateurs et les coachs existants peuvent créer une équipe."
      />
    );
  }

  // Capacité d'un tournoi = nb de groupes × équipes par groupe.
  const capacityOf = (t: Tournament) => t.groupCount * t.teamsPerGroup;
  const remainingOf = (t: Tournament) => Math.max(0, capacityOf(t) - t._count.teams);

  const selectedTournament =
    props.tournaments.find((t) => t.id === formData.tournamentId) ?? null;
  const selectedRemaining = selectedTournament ? remainingOf(selectedTournament) : null;
  const selectedFull = selectedRemaining === 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.tournamentId) {
      toast.error('Sélectionne un tournoi');
      return;
    }
    if (selectedFull) {
      toast.error('Tournoi complet — aucune place disponible');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/teams/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            shortName: formData.shortName,
            logo: formData.logo || undefined,
            tournamentId: formData.tournamentId,
          }),
        });
        const json: { id?: string; error?: string } = await res.json();
        if (!res.ok || !json.id) {
          toast.error(json.error ?? "Impossible de créer l'équipe");
          return;
        }
        toast.success('Équipe créée avec succès !');
        router.push(`/teams/${json.id}`);
      } catch {
        toast.error('Erreur réseau / serveur');
      }
    });
  };

  return (
    <>
      <Head>
        <title>Nouvelle équipe — CDM 26</title>
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent"
            animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute -top-1/3 right-0 w-2/3 h-[140%] pointer-events-none blur-3xl bg-[radial-gradient(50%_50%_at_70%_30%,rgba(16,185,129,0.13),transparent_70%)]"
            animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="container mx-auto px-4 py-16 md:py-20 relative">
            <Link
              href="/teams"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour aux équipes
            </Link>

            <motion.div
              variants={reduce ? undefined : containerStagger}
              initial={reduce ? false : 'hidden'}
              animate={reduce ? undefined : 'show'}
            >
              <motion.div variants={reduce ? undefined : fadeUp}>
                <SectionEyebrow num="NEW" label="Nouvelle nation · CDM 26" accent="emerald" />
              </motion.div>
              <motion.h1
                variants={reduce ? undefined : fadeUp}
                className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight"
              >
                Inscrire <span className="italic font-light text-white/35">une</span>{' '}
                <span className="text-gradient-worldcup">équipe.</span>
              </motion.h1>
              <motion.p
                variants={reduce ? undefined : fadeUp}
                className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed"
              >
                Crée ta nation et deviens coach. Tu pourras gérer l'effectif, les compositions et
                soumettre les résultats des matchs.
              </motion.p>
              <motion.div variants={reduce ? undefined : fadeUp} className="mt-7 flex flex-wrap items-center gap-3">
                <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                  <CircleDot className="w-3 h-3 mr-1" /> 3 sections
                </Badge>
                <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                  Coach automatique
                </Badge>
              </motion.div>
            </motion.div>
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
              {/* SECTION 01 — COMPÉTITION */}
              <Card className="relative overflow-hidden bg-white/2 border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 mb-1.5">
                      § Section 01
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Compétition</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                      Choisis ton tournoi
                    </Label>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35">
                      {props.tournaments.length} dispo
                    </span>
                  </div>

                  {props.tournaments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/2 py-10 text-center">
                      <Trophy className="w-8 h-8 text-white/20 mx-auto mb-3" />
                      <p className="text-sm text-white/55">Aucun tournoi ouvert aux inscriptions.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {props.tournaments.map((t) => {
                        const remaining = remainingOf(t);
                        const full = remaining <= 0;
                        const selected = formData.tournamentId === t.id;
                        return (
                          <button
                            type="button"
                            key={t.id}
                            disabled={full}
                            onClick={() => setFormData((p) => ({ ...p, tournamentId: t.id }))}
                            aria-pressed={selected}
                            className={`group relative overflow-hidden text-left rounded-xl border p-4 transition-all ${
                              full
                                ? 'border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed'
                                : selected
                                ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                                : 'border-white/10 bg-black/40 hover:border-white/25 hover:bg-white/[0.03]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-black text-white tracking-tight leading-tight">
                                {t.name}
                              </span>
                              <span
                                className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-full border transition-colors ${
                                  selected
                                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                                    : 'border-white/15 text-transparent'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                              </span>
                            </div>

                            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                              <Calendar className="w-3 h-3" />
                              {new Date(t.startDate).toLocaleDateString('fr-FR', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.2em] text-white/45 tabular-nums">
                                <Users className="w-3 h-3" />
                                {t._count.teams}/{capacityOf(t)}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.2em] ${
                                  full
                                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                }`}
                              >
                                {full ? (
                                  <>
                                    <Lock className="w-2.5 h-2.5" /> Complet
                                  </>
                                ) : (
                                  `${remaining} place${remaining > 1 ? 's' : ''}`
                                )}
                              </span>
                            </div>

                            {selected && !full && (
                              <BorderBeam size={80} duration={8} colorFrom="#10b981" colorTo="#facc15" borderWidth={1} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.22em] flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-yellow-400" />
                    Le groupe est attribué au tirage au sort
                  </p>
                </div>
              </Card>

              {/* SECTION 02 — IDENTITÉ */}
              <Card className="relative overflow-hidden bg-white/2 border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-yellow-400 mb-1.5">
                      § Section 02
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Identité de l&apos;équipe</h2>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                      Nom de l&apos;équipe
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      minLength={2}
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ex : Les Lions de l'Atlas"
                      className="h-12 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortName" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-red-400" />
                      Code court (2-3 lettres)
                    </Label>
                    <Input
                      id="shortName"
                      type="text"
                      required
                      minLength={2}
                      maxLength={3}
                      value={formData.shortName}
                      onChange={(e) => setFormData((p) => ({ ...p, shortName: e.target.value.toUpperCase() }))}
                      placeholder="MAR"
                      className="h-14 text-3xl font-black text-center tabular-nums uppercase tracking-[0.3em] bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                    />
                    <p className="text-[10px] text-center text-white/40 font-mono uppercase tracking-[0.25em]">
                      Affiché sur le badge et les cartes de match
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-emerald-400" />
                      Logo
                      <span className="text-[9px] text-white/30 normal-case">(optionnel)</span>
                    </Label>
                    <ImageUpload
                      value={formData.logo}
                      onChange={(url) => setFormData((p) => ({ ...p, logo: url }))}
                      label="Logo de l'équipe"
                    />
                  </div>
                </div>
              </Card>

              {/* SECTION 03 — INFO COACH */}
              <Card className="relative overflow-hidden bg-linear-to-br from-emerald-950/30 via-black to-red-950/20 border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 mb-1.5">
                      § Section 03 — Coach automatique
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-white tracking-tight mb-2 leading-tight">
                      Tu seras le <span className="text-gradient-worldcup">coach.</span>
                    </h3>
                    <p className="text-sm text-white/65 leading-relaxed">
                      En créant cette équipe, tu deviens automatiquement coach. Tu pourras gérer
                      l&apos;effectif, les compositions, et soumettre les résultats des matchs.
                    </p>
                  </div>
                </div>
                <BorderBeam size={150} duration={10} colorFrom="#10b981" colorTo="#dc2626" borderWidth={1} />
              </Card>

              {/* SUBMIT */}
              <div className="pt-2">
                <ShimmerButton
                  type="submit"
                  disabled={isPending || selectedFull}
                  shimmerColor="#ffffff"
                  background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                  className="w-full px-7 py-5 font-black uppercase tracking-[0.18em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Création en cours…
                    </>
                  ) : selectedFull ? (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Tournoi complet
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Créer l&apos;équipe
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
}: {
  icon: typeof Users;
  accent: Accent;
  title: string;
  description: string;
}) {
  const s = ACCENT[accent];
  return (
    <div className="relative bg-black text-white min-h-screen overflow-hidden isolate">
      <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <Card className={`relative max-w-md w-full text-center p-8 md:p-10 bg-white/2 ${s.border} overflow-hidden`}>
          <div className={`relative inline-flex p-5 rounded-2xl bg-white/5 border ${s.border} mb-6 mx-auto`}>
            <Icon className={`w-12 h-12 ${s.text}`} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-3 text-white tracking-tight">{title}</h2>
          <p className="text-white/60 mb-8">{description}</p>
          <Link href="/teams">
            <Button
              variant="outline"
              className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs px-6"
            >
              <ChevronRight className="w-3.5 h-3.5 mr-1 rotate-180" />
              Retour aux équipes
            </Button>
          </Link>
          <BorderBeam size={140} duration={9} colorFrom="#10b981" colorTo="#dc2626" borderWidth={1} />
        </Card>
      </div>
    </div>
  );
}
