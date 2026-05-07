import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Trophy,
  Calendar,
  Users,
  Target,
  ArrowRight,
  Loader2,
  ShieldAlert,
  LogIn,
  ListChecks,
  ChevronRight,
  CircleDot,
  Plus,
  Minus,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';

type PageProps = {
  isAdmin: boolean;
  isSignedIn: boolean;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth, clerkClient } = await import('@clerk/nextjs/server');
  const { userId } = getAuth(ctx.req);

  if (!userId) return { props: { isAdmin: false, isSignedIn: false } };

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  return {
    props: {
      isAdmin: user.publicMetadata?.role === 'ADMIN',
      isSignedIn: true,
    },
  };
};

type CreateTournamentPayload = {
  name: string;
  startDate: string;
  teamsPerGroup: number;
  playersPerTeam: number;
  groupCount: number;
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

export default function NewTournamentPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<CreateTournamentPayload>({
    name: '',
    startDate: '',
    teamsPerGroup: 4,
    playersPerTeam: 5,
    groupCount: 2,
  });

  if (!props.isSignedIn) {
    return (
      <GateScreen
        icon={LogIn}
        accent="purple"
        title="Connexion requise"
        description="Connecte-toi pour accéder à cette page d'administration."
      />
    );
  }

  if (!props.isAdmin) {
    return (
      <GateScreen
        icon={ShieldAlert}
        accent="red"
        title="Accès refusé"
        description="Seuls les administrateurs peuvent créer des tournois."
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch('/api/tournaments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const json: { id?: string; error?: string } = await res.json();
        if (!res.ok || !json.id) {
          toast.error(json.error ?? 'Impossible de créer le tournoi');
          return;
        }
        toast.success('Tournoi créé avec succès !');
        router.push(`/tournaments/${json.id}`);
      } catch {
        toast.error('Erreur réseau / serveur');
      }
    });
  };

  const totalTeams = formData.groupCount * formData.teamsPerGroup;
  const totalPlayers = totalTeams * formData.playersPerTeam;

  return (
    <>
      <Head>
        <title>Nouveau tournoi — CDM 26</title>
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

            <SectionEyebrow num="ADM" label="Administration · CDM 26" accent="red" />
            <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
              Nouveau <span className="text-gradient-worldcup">tournoi.</span>
            </h1>
            <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
              Configure une nouvelle compétition FIFA 26 — phase de poules + élimination directe.
              Les groupes seront créés automatiquement.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Badge className="bg-red-500/10 border-red-500/30 text-red-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <ShieldAlert className="w-3 h-3 mr-1" /> Admin only
              </Badge>
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                <CircleDot className="w-3 h-3 mr-1" /> 3 sections
              </Badge>
            </div>
          </div>
        </section>

        {/* FORM */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* SECTION 01 — IDENTITÉ */}
              <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 mb-1.5">
                      § Section 01
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                      Identité du tournoi
                    </h2>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                      Nom du tournoi
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ex : CDM 26 — Coupe du Monde FIFA 26"
                      required
                      className="h-12 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                      <Calendar className="w-3 h-3 inline mr-1.5 text-yellow-400" />
                      Date et heure de début
                    </Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                      required
                      className="h-12 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white text-base"
                    />
                  </div>
                </div>
              </Card>

              {/* SECTION 02 — CONFIG SPORTIVE */}
              <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-yellow-400 mb-1.5">
                      § Section 02
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                      Configuration sportive
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <NumberField
                    id="groupCount"
                    code="GRP"
                    label="Groupes"
                    icon={Users}
                    accent="emerald"
                    min={1}
                    max={8}
                    value={formData.groupCount}
                    onChange={(v) => setFormData((p) => ({ ...p, groupCount: v }))}
                  />
                  <NumberField
                    id="teamsPerGroup"
                    code="TPG"
                    label="Équipes / Groupe"
                    icon={Target}
                    accent="yellow"
                    min={2}
                    max={8}
                    value={formData.teamsPerGroup}
                    onChange={(v) => setFormData((p) => ({ ...p, teamsPerGroup: v }))}
                  />
                  <NumberField
                    id="playersPerTeam"
                    code="PPT"
                    label="Joueurs / Équipe"
                    icon={Users}
                    accent="red"
                    min={3}
                    max={15}
                    value={formData.playersPerTeam}
                    onChange={(v) => setFormData((p) => ({ ...p, playersPerTeam: v }))}
                  />
                </div>
              </Card>

              {/* SECTION 03 — RÉSUMÉ */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/30 via-black to-red-950/20 border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0">
                    <ListChecks className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 mb-1.5">
                      § Section 03
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                      Résumé de la configuration
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-y border-white/10">
                  <SummaryStat code="GRP-NB" label="Groupes" value={formData.groupCount} accent="emerald" />
                  <SummaryStat code="TMS-TOT" label="Équipes" value={totalTeams} accent="yellow" />
                  <SummaryStat code="PLY-TOT" label="Joueurs" value={totalPlayers} accent="red" />
                  <SummaryStat
                    code="MTC-EST"
                    label="Matchs poules"
                    value={formData.groupCount * Math.max(0, (formData.teamsPerGroup * (formData.teamsPerGroup - 1)) / 2)}
                    accent="purple"
                  />
                </div>

                <BorderBeam size={180} duration={10} colorFrom="#10b981" colorTo="#dc2626" borderWidth={1} />
              </Card>

              {/* SUBMIT */}
              <div className="pt-2">
                <ShimmerButton
                  type="submit"
                  disabled={isPending}
                  shimmerColor="#ffffff"
                  background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                  className="w-full px-7 py-5 font-black uppercase tracking-[0.18em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Création en cours…
                    </>
                  ) : (
                    <>
                      <Trophy className="w-5 h-5 mr-2" />
                      Créer le tournoi
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

function NumberField({
  id,
  code,
  label,
  icon: Icon,
  accent,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  code: string;
  label: string;
  icon: typeof Trophy;
  accent: Accent;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const s = ACCENT[accent];
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className={`relative rounded-xl bg-black/40 border ${s.border} hover:border-white/30 p-4 transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <Label htmlFor={id} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-white/60 font-mono">
          <Icon className={`w-3 h-3 ${s.text}`} />
          {label}
        </Label>
        <span className={`text-[9px] font-mono uppercase tracking-[0.25em] ${s.text}`}>{code}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          aria-label="Diminuer"
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white/70 hover:text-white transition shrink-0"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          required
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`h-12 text-3xl font-black text-center tabular-nums bg-transparent border-0 focus-visible:ring-0 px-0 ${s.text}`}
        />
        <button
          type="button"
          onClick={inc}
          aria-label="Augmenter"
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-white/70 hover:text-white transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="text-[9px] text-center text-white/40 mt-3 tabular-nums font-mono uppercase tracking-[0.25em]">
        min {min} · max {max}
      </div>
    </div>
  );
}

function SummaryStat({
  code,
  label,
  value,
  accent,
}: {
  code: string;
  label: string;
  value: number;
  accent: Accent;
}) {
  const s = ACCENT[accent];
  return (
    <div className="px-4 md:px-6 py-6 first:pl-0 md:first:pl-6">
      <div className="text-[9px] text-white/40 uppercase tracking-[0.3em] mb-2 font-mono">{code}</div>
      <div className={`text-3xl md:text-4xl font-black mb-1 tracking-tighter tabular-nums ${s.text}`}>
        <NumberTicker value={value} />
      </div>
      <div className="text-[10px] text-white/70 font-bold uppercase tracking-[0.22em]">{label}</div>
    </div>
  );
}

function GateScreen({
  icon: Icon,
  accent,
  title,
  description,
}: {
  icon: typeof Trophy;
  accent: Accent;
  title: string;
  description: string;
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
          <Link href="/tournaments">
            <Button
              variant="outline"
              className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs px-6"
            >
              <ChevronRight className="w-3.5 h-3.5 mr-1 rotate-180" />
              Retour aux tournois
            </Button>
          </Link>
          <BorderBeam size={140} duration={9} colorFrom="#10b981" colorTo="#dc2626" borderWidth={1} />
        </Card>
      </div>
    </div>
  );
}
