import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  Users,
  Trophy,
  Coins,
  Ticket,
  Wallet,
  UserCheck,
  ClipboardCheck,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminDataTable, type AdminColumn, type AdminRowAction } from '@/components/admin/admin-data-table';
import { KpiTile, AreaTrend, BarBreakdown, ChartCard } from '@/components/admin/admin-charts';
import { ResetDataCard } from '@/components/admin/reset-data-card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Point = { label: string; value: number };

type RecentUser = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  createdAt: string;
};

type PageProps = {
  kpis: {
    totalUsers: number;
    totalTeams: number;
    coachedTeams: number;
    totalTournaments: number;
    totalWagered: number;
    betCount: number;
    uniqueBettors: number;
  };
  alerts: { treasury: number; requests: number; matchesToReview: number };
  signups: Point[];
  signupsCumulative: number[];
  outcomeBreakdown: Point[];
  recentUsers: RecentUser[];
  isOwner: boolean;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKS = 12;

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { isSiteAdmin, isOwnerEmail } = await import('@/lib/utils/permissions');
  const { syncClerkUserFromReq } = await import('@/lib/clerk');

  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };
  const dbUser = await syncClerkUserFromReq(ctx.req);
  if (!dbUser) return { redirect: { destination: '/', permanent: false } };
  const isAdmin = await isSiteAdmin(dbUser.id);
  if (!isAdmin) return { redirect: { destination: '/', permanent: false } };
  const isOwner = isOwnerEmail(dbUser.email);

  const prisma = (await import('@/lib/prisma')).default;
  const { BetStatus, BetOutcome, RefundStatus, JoinRequestStatus, MatchStatus } = await import(
    '@/prisma/prisma-client/enums'
  );

  const [
    totalUsers,
    totalTeams,
    coachedTeams,
    totalTournaments,
    wageredAgg,
    betOutcomeAgg,
    distinctBettors,
    failedBets,
    failedMarketBets,
    failedSlips,
    pendingRefundCount,
    pendingRequests,
    matchesToReview,
    signupRows,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.team.count({ where: { coachUserId: { not: null } } }),
    prisma.tournament.count(),
    prisma.bet.aggregate({ _sum: { pointsWagered: true }, _count: true }),
    prisma.bet.groupBy({ by: ['outcome'], _sum: { pointsWagered: true } }),
    prisma.bet.findMany({ distinct: ['userId'], select: { userId: true } }),
    prisma.bet.count({ where: { status: BetStatus.CREDIT_FAILED } }),
    prisma.marketBet.count({ where: { status: BetStatus.CREDIT_FAILED, slipId: null } }),
    prisma.betSlip.count({ where: { status: BetStatus.CREDIT_FAILED } }),
    prisma.pendingRefund.count({ where: { status: { in: [RefundStatus.PENDING, RefundStatus.FAILED] } } }),
    prisma.teamJoinRequest.count({ where: { status: JoinRequestStatus.PENDING } }),
    prisma.match.count({
      where: { status: MatchStatus.FINISHED, OR: [{ homeScore: null }, { awayScore: null }] },
    }),
    prisma.user.findMany({ select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({
      select: { id: true, email: true, name: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Série "inscriptions / semaine" sur 12 semaines glissantes.
  const now = Date.now();
  const windowStart = now - (WEEKS - 1) * WEEK_MS;
  const buckets = new Array<number>(WEEKS).fill(0);
  for (const u of signupRows) {
    const t = u.createdAt.getTime();
    if (t < windowStart) continue;
    const idx = Math.min(WEEKS - 1, Math.floor((t - windowStart) / WEEK_MS));
    buckets[idx] += 1;
  }
  const signups: Point[] = buckets.map((v, i) => {
    const d = new Date(windowStart + i * WEEK_MS);
    return { label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value: v };
  });
  // Cumul (base = inscrits avant la fenêtre) pour la sparkline du KPI utilisateurs.
  const before = signupRows.length - buckets.reduce((a, b) => a + b, 0);
  const signupsCumulative: number[] = [];
  let run = before;
  for (const v of buckets) {
    run += v;
    signupsCumulative.push(run);
  }

  const sumFor = (o: (typeof betOutcomeAgg)[number]['outcome']) =>
    betOutcomeAgg.find((r) => r.outcome === o)?._sum.pointsWagered ?? 0;
  const outcomeBreakdown: Point[] = [
    { label: 'Domicile (1)', value: sumFor(BetOutcome.HOME_WIN) },
    { label: 'Nul (X)', value: sumFor(BetOutcome.DRAW) },
    { label: 'Extérieur (2)', value: sumFor(BetOutcome.AWAY_WIN) },
  ];

  return {
    props: {
      kpis: {
        totalUsers,
        totalTeams,
        coachedTeams,
        totalTournaments,
        totalWagered: wageredAgg._sum.pointsWagered ?? 0,
        betCount: wageredAgg._count,
        uniqueBettors: distinctBettors.length,
      },
      alerts: {
        treasury: failedBets + failedMarketBets + failedSlips + pendingRefundCount,
        requests: pendingRequests,
        matchesToReview,
      },
      signups,
      signupsCumulative,
      outcomeBreakdown,
      recentUsers: JSON.parse(JSON.stringify(recentUsers)),
      isOwner,
    },
  };
};

const ROLE_META: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: 'Admin', cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
  PARTICIPANT: { label: 'Participant', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  GUEST: { label: 'Invité', cls: 'bg-white/5 text-white/60 border-white/15' },
};

export default function AdminOverviewPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { kpis, alerts, signups, signupsCumulative, outcomeBreakdown, recentUsers, isOwner } = props;

  const userColumns: AdminColumn<RecentUser>[] = [
    {
      key: 'name',
      header: 'Membre',
      sortable: true,
      cell: (u) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{u.name}</span>
          {u.username && <span className="text-xs text-white/40">@{u.username}</span>}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      sortable: true,
      cell: (u) => {
        const m = ROLE_META[u.role] ?? { label: u.role, cls: 'bg-white/5 text-white/60 border-white/15' };
        return <Badge className={cn('font-mono text-[10px]', m.cls)}>{m.label}</Badge>;
      },
    },
    {
      key: 'email',
      header: 'Email',
      hideOnMobile: true,
      cell: (u) => <span className="text-sm text-white/50">{u.email}</span>,
    },
    {
      key: 'createdAt',
      header: 'Inscription',
      sortable: true,
      hideOnMobile: true,
      align: 'right',
      cell: (u) => (
        <span className="font-mono text-xs tabular-nums text-white/50">
          {new Date(u.createdAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
  ];

  const userActions: AdminRowAction<RecentUser>[] = [
    {
      label: "Copier l'ID",
      onSelect: (u) => {
        navigator.clipboard.writeText(u.id);
        toast.success('ID copié');
      },
    },
    {
      label: "Copier l'email",
      onSelect: (u) => {
        navigator.clipboard.writeText(u.email);
        toast.success('Email copié');
      },
    },
  ];

  return (
    <>
      <Head>
        <title>Vue d&apos;ensemble — Admin CDM 26</title>
      </Head>

      <AdminShell
        active="overview"
        eyebrow="ADM · Saison 2026"
        title={<span className="text-gradient-worldcup">Vue d&apos;ensemble.</span>}
        description="Le pouls de la plateforme : membres, équipes, activité des paris et points d'attention. Tout le reste est dans la barre latérale."
      >
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            code="USR"
            label="Utilisateurs"
            value={kpis.totalUsers}
            accent="blue"
            icon={<Users className="h-3 w-3" />}
            spark={signupsCumulative}
          />
          <KpiTile
            code="TMS"
            label={`Équipes · ${kpis.coachedTeams} coachées`}
            value={kpis.totalTeams}
            accent="yellow"
            icon={<Trophy className="h-3 w-3" />}
          />
          <KpiTile
            code="PTS"
            label="Points misés"
            value={kpis.totalWagered}
            unit="pts"
            accent="emerald"
            icon={<Coins className="h-3 w-3" />}
          />
          <KpiTile
            code="BET"
            label={`Paris · ${kpis.uniqueBettors} parieurs`}
            value={kpis.betCount}
            accent="purple"
            icon={<Ticket className="h-3 w-3" />}
          />
        </div>

        {/* Alertes — points d'attention */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AlertCard
            href="/admin/tresorerie"
            icon={Wallet}
            label="Trésorerie bloquée"
            count={alerts.treasury}
            unit="à traiter"
          />
          <AlertCard
            href="/admin/demandes"
            icon={UserCheck}
            label="Demandes d'adhésion"
            count={alerts.requests}
            unit="en attente"
          />
          <AlertCard
            href="/admin/matchs-a-revoir"
            icon={ClipboardCheck}
            label="Matchs à revoir"
            count={alerts.matchesToReview}
            unit="incomplets"
          />
        </div>

        {/* Graphs */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Inscriptions" subtitle="12 dernières semaines">
            <AreaTrend data={signups} />
          </ChartCard>
          <ChartCard title="Répartition des mises" subtitle="Volume 1X2 · points">
            {kpis.totalWagered > 0 ? (
              <div className="pt-2">
                <BarBreakdown data={outcomeBreakdown} valueSuffix=" pts" />
              </div>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-sm text-white/40">
                Aucune mise enregistrée pour l&apos;instant.
              </div>
            )}
          </ChartCard>
        </div>

        {/* Derniers inscrits — table générique */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">Derniers inscrits</h2>
              <p className="mt-0.5 text-[11px] font-mono uppercase tracking-[0.2em] text-white/40">
                Gestion complète des rôles →{' '}
                <Link href="/admin/dashboard" className="text-emerald-400 hover:underline">
                  Utilisateurs &amp; Équipes
                </Link>
              </p>
            </div>
          </div>
          <AdminDataTable<RecentUser>
            endpoint="/api/admin/users-list"
            columns={userColumns}
            rowActions={userActions}
            initialData={recentUsers}
            initialTotal={kpis.totalUsers}
            getRowId={(u) => u.id}
            sortableKeys={['name', 'role', 'createdAt']}
            initialSort={{ key: 'createdAt', desc: true }}
            searchPlaceholder="Rechercher un membre…"
            emptyLabel="Aucun membre trouvé."
          />
        </div>

        {/* Zone de danger — reset complet des données. Propriétaire uniquement. */}
        {isOwner && (
          <div className="mt-12">
            <ResetDataCard />
          </div>
        )}
      </AdminShell>
    </>
  );
}

function AlertCard({
  href,
  icon: Icon,
  label,
  count,
  unit,
}: {
  href: string;
  icon: typeof Wallet;
  label: string;
  count: number;
  unit: string;
}) {
  const alert = count > 0;
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all',
        alert
          ? 'border-red-500/25 bg-red-500/[0.04] hover:border-red-500/40'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
            alert ? 'border-red-500/30 bg-red-500/10' : 'border-emerald-500/25 bg-emerald-500/10'
          )}
        >
          {alert ? <Icon className="h-4 w-4 text-red-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('text-2xl font-black tabular-nums', alert ? 'text-red-300' : 'text-white/70')}>
              {count}
            </span>
            {alert && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
          </div>
          <div className="text-[11px] font-medium text-white/60">
            {label} · <span className="text-white/40">{unit}</span>
          </div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-white/25 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
