import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Users,
  Trophy,
  Crown,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  CircleDot,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

import { UsersDataTable } from '@/components/admin/users-data-table';
import { TeamsDataTable } from '@/components/admin/teams-data-table';
import { AssignCoachModal } from '@/components/admin/assign-coach-modal';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Badge } from '@/components/ui/badge';

interface CoachedTeam {
  id: string;
  name: string;
  tournament: { name: string };
}

interface User {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  createdAt: string;
  coachedTeams?: CoachedTeam[];
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  coachUserId?: string | null;
  tournament: { id: string; name: string };
  coach?: { id: string; name: string } | null;
}

type PageProps = { users: User[]; teams: Team[] };

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { isSiteAdmin } = await import('@/lib/utils/permissions');
  const { syncClerkUserFromReq } = await import('@/lib/clerk');

  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };

  const dbUser = await syncClerkUserFromReq(ctx.req);
  if (!dbUser) return { redirect: { destination: '/', permanent: false } };

  const isAdmin = await isSiteAdmin(dbUser.id);
  if (!isAdmin) return { redirect: { destination: '/', permanent: false } };

  const prisma = (await import('@/lib/prisma')).default;
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      createdAt: true,
      coachedTeams: {
        select: {
          id: true,
          name: true,
          tournament: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const teams = await prisma.team.findMany({
    include: {
      tournament: { select: { id: true, name: true } },
      coach: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    props: {
      users: JSON.parse(JSON.stringify(users)),
      teams: JSON.parse(JSON.stringify(teams)),
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

export default function AdminDashboardPage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const { users, teams } = props;
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [assignCoachModalOpen, setAssignCoachModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const participants = users.filter((u) => u.role === 'PARTICIPANT').length;
    const coachedCount = teams.filter((t) => t.coachUserId).length;
    return {
      totalUsers: users.length,
      admins,
      participants,
      totalTeams: teams.length,
      coachedCount,
    };
  }, [users, teams]);

  const handleAssignCoach = (team: Team) => {
    setSelectedTeam(team);
    setAssignCoachModalOpen(true);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <Head>
        <title>Dashboard admin — CDM 26</title>
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

          <div className="container mx-auto px-4 py-16 md:py-20 relative">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l&apos;accueil
            </Link>

            <div className="flex items-start gap-6 flex-wrap">
              {/* Big shield admin signature */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/40 via-orange-600/30 to-yellow-500/40 rounded-3xl blur-xl" />
                <motion.div
                  whileHover={{ rotate: -6, scale: 1.05 }}
                  className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500 flex items-center justify-center shadow-2xl shadow-red-500/40 ring-1 ring-white/15"
                >
                  <Shield className="w-10 h-10 md:w-12 md:h-12 text-white" strokeWidth={2.2} />
                </motion.div>
              </div>

              <div className="flex-1 min-w-0">
                <SectionEyebrow num="ADM" label="Espace administrateur · CDM 26" accent="red" />
                <h1 className="text-5xl md:text-7xl font-black mt-4 leading-[0.92] tracking-tight">
                  <span className="text-gradient-worldcup">Dashboard.</span>
                </h1>
                <p className="text-white/60 mt-5 max-w-2xl text-base md:text-lg leading-relaxed">
                  Gestion des utilisateurs, des équipes et des coachs. Promotion de rôles,
                  assignation de coachs, supervision globale.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Badge className="bg-red-500/10 border-red-500/30 text-red-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Shield className="w-3 h-3 mr-1" /> Admin only
                  </Badge>
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <CircleDot className="w-3 h-3 mr-1" /> Saison 2026
                  </Badge>
                  <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Activity className="w-3 h-3 mr-1" /> Tous services OK
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
              <StatCell code="USR-TOT" label="Utilisateurs" value={stats.totalUsers} icon={Users} accent="blue" />
              <StatCell code="ADM-NB" label="Admins" value={stats.admins} icon={Crown} accent="red" beam />
              <StatCell code="PLY-NB" label="Participants" value={stats.participants} icon={UserCheck} accent="emerald" />
              <StatCell
                code="TMS-NB"
                label="Équipes"
                value={stats.totalTeams}
                sublabel={`${stats.coachedCount} coachées`}
                icon={Trophy}
                accent="yellow"
              />
            </div>
          </div>
        </section>

        {/* TABS + DATA TABLES */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4">
            <div className="mb-10">
              <SectionEyebrow num="01" label="Gestion globale" accent="emerald" />
              <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                <span className="italic font-light text-white/35">Pilotage</span>{' '}
                <span className="text-gradient-worldcup">opérationnel.</span>
              </h2>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'users' | 'teams')} className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="bg-white/[0.03] border border-white/10 p-1 rounded-full h-auto gap-0.5">
                  <TabsTrigger
                    value="users"
                    className="rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60 transition-all flex items-center gap-2"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Utilisateurs</span>
                    <span className="text-[10px] tabular-nums opacity-60">({stats.totalUsers})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="teams"
                    className="rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60 transition-all flex items-center gap-2"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Équipes &amp; Coachs</span>
                    <span className="text-[10px] tabular-nums opacity-60">({stats.totalTeams})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="users" className="mt-0">
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-6 md:p-8">
                    <div className="flex items-center justify-between gap-3 mb-6 pb-5 border-b border-white/10 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 mb-0.5">
                            § Table USR
                          </div>
                          <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
                            Gestion des utilisateurs
                          </h3>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                        {stats.totalUsers} entrées
                      </span>
                    </div>
                    <UsersDataTable data={users} onUpdate={handleRefresh} />
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="teams" className="mt-0">
                <motion.div
                  key="teams"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-6 md:p-8">
                    <div className="flex items-center justify-between gap-3 mb-6 pb-5 border-b border-white/10 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-yellow-400 mb-0.5">
                            § Table TMS
                          </div>
                          <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
                            Équipes &amp; assignation des coachs
                          </h3>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                        {stats.coachedCount} / {stats.totalTeams} coachées
                      </span>
                    </div>
                    <TeamsDataTable data={teams} onAssignCoach={handleAssignCoach} />
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Footer broadcast meta */}
        <section className="relative bg-black py-8">
          <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-red-400" />
              Admin
            </span>
            <span className="text-white/20">·</span>
            <span>Saison 2026</span>
            <span className="text-white/20">·</span>
            <span>USR · {stats.totalUsers}</span>
            <span className="text-white/20">·</span>
            <span>TMS · {stats.totalTeams}</span>
          </div>
        </section>

        {/* Assign Coach Modal */}
        {selectedTeam && (
          <AssignCoachModal
            isOpen={assignCoachModalOpen}
            onClose={() => {
              setAssignCoachModalOpen(false);
              setSelectedTeam(null);
            }}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            users={users}
            currentCoachId={selectedTeam.coachUserId}
            onSuccess={handleRefresh}
          />
        )}
      </div>
    </>
  );
}

function StatCell({
  code,
  label,
  value,
  sublabel,
  icon: Icon,
  accent,
  beam,
}: {
  code: string;
  label: string;
  value: number;
  sublabel?: string;
  icon: typeof Users;
  accent: Accent;
  beam?: boolean;
}) {
  const s = ACCENT[accent];
  return (
    <div className={`px-4 md:px-6 py-8 first:pl-0 md:first:pl-6 ${beam ? 'relative' : ''}`}>
      <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-3 flex items-center gap-1.5 font-mono">
        <Icon className="w-3 h-3" />
        {code}
      </div>
      <div className={`text-4xl md:text-6xl font-black mb-2 tracking-tighter tabular-nums ${s.text}`}>
        <NumberTicker value={value} />
      </div>
      <div className="text-xs md:text-sm text-white/70 font-bold uppercase tracking-wider">{label}</div>
      {sublabel && (
        <div className="text-[10px] text-white/40 tabular-nums mt-1 font-mono uppercase tracking-[0.22em]">
          {sublabel}
        </div>
      )}
      {beam && <BorderBeam size={140} duration={9} colorFrom="#dc2626" colorTo="#f59e0b" borderWidth={1} />}
    </div>
  );
}
