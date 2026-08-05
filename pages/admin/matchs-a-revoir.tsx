import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Pencil,
  CalendarClock,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AdminShell } from '@/components/admin/admin-shell';
import {
  analyzeMatchCompleteness,
  worstSeverity,
  severityRank,
  type MatchIssue,
  type MatchIssueSeverity,
} from '@/lib/utils/match-completeness';

type ReviewMatch = {
  id: string;
  stage: string;
  matchDate: string;
  homeScore: number | null;
  awayScore: number | null;
  tournamentId: string;
  tournamentName: string;
  home: { name: string; shortName: string };
  away: { name: string; shortName: string };
  issues: MatchIssue[];
  maxSeverity: MatchIssueSeverity;
};

type PageProps = {
  matches: ReviewMatch[];
  counts: { critical: number; warning: number; info: number; total: number };
};

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

  const rows = await prisma.match.findMany({
    where: { status: 'FINISHED' },
    select: {
      id: true,
      stage: true,
      status: true,
      matchDate: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
      tournament: { select: { id: true, name: true } },
      homeTeam: { select: { name: true, shortName: true, players: { select: { id: true } } } },
      awayTeam: { select: { name: true, shortName: true, players: { select: { id: true } } } },
      playerStats: { select: { playerId: true, goals: true, yellowCards: true, redCards: true } },
      events: { select: { type: true, teamId: true } },
    },
    orderBy: { matchDate: 'desc' },
  });

  const matches: ReviewMatch[] = [];
  let critical = 0;
  let warning = 0;
  let info = 0;

  for (const r of rows) {
    const issues = analyzeMatchCompleteness({
      status: r.status,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      homeTeamId: r.homeTeamId,
      awayTeamId: r.awayTeamId,
      homePlayerIds: r.homeTeam.players.map((p) => p.id),
      awayPlayerIds: r.awayTeam.players.map((p) => p.id),
      playerStats: r.playerStats,
      events: r.events,
    });
    if (issues.length === 0) continue;

    const maxSeverity = worstSeverity(issues)!;
    if (maxSeverity === 'critical') critical += 1;
    else if (maxSeverity === 'warning') warning += 1;
    else info += 1;

    matches.push({
      id: r.id,
      stage: r.stage,
      matchDate: r.matchDate.toISOString(),
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      tournamentId: r.tournament.id,
      tournamentName: r.tournament.name,
      home: { name: r.homeTeam.name, shortName: r.homeTeam.shortName },
      away: { name: r.awayTeam.name, shortName: r.awayTeam.shortName },
      issues,
      maxSeverity,
    });
  }

  // Tri : gravité décroissante, puis match le plus récent d'abord.
  matches.sort((a, b) => {
    const s = severityRank(a.maxSeverity) - severityRank(b.maxSeverity);
    if (s !== 0) return s;
    return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
  });

  return {
    props: {
      matches,
      counts: { critical, warning, info, total: matches.length },
    },
  };
};

const SEVERITY_STYLE: Record<
  MatchIssueSeverity,
  { badge: string; icon: typeof AlertTriangle; label: string }
> = {
  critical: {
    badge: 'bg-red-500/10 text-red-300 border-red-500/30',
    icon: AlertCircle,
    label: 'Critique',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    icon: AlertTriangle,
    label: 'Avertissement',
  },
  info: {
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    icon: Info,
    label: 'Info',
  },
};

type Filter = 'all' | MatchIssueSeverity;

export default function MatchsARevoirPage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    if (filter === 'all') return props.matches;
    return props.matches.filter((m) => m.maxSeverity === filter);
  }, [filter, props.matches]);

  return (
    <>
      <Head>
        <title>Matchs à revoir — Admin CDM 26</title>
      </Head>

      <AdminShell active="matchs" bleed>
        {/* HERO */}
        <section className="relative border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-red-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-14 md:py-16 relative">
            <div className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold text-red-400">
              <span className="block w-12 h-px bg-red-400" />
              <span className="font-mono">/ QA</span>
              <span className="text-white/30">—</span>
              <span>Contrôle des données</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black mt-5 leading-[0.95] tracking-tight flex items-center gap-4">
              <ClipboardCheck className="w-9 h-9 md:w-12 md:h-12 text-red-400 shrink-0" />
              Matchs <span className="text-gradient-worldcup">à revoir.</span>
            </h1>
            <p className="text-white/60 mt-6 max-w-2xl text-base leading-relaxed">
              Les matchs terminés dont il manque le score, les buteurs ou dont les stats sont
              incohérentes. Anomalies détectées automatiquement — aucun marquage manuel.
            </p>

            {/* Compteurs */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
              <StatChip label="À revoir" value={props.counts.total} tone="white" />
              <StatChip label="Critiques" value={props.counts.critical} tone="red" />
              <StatChip label="Avertissements" value={props.counts.warning} tone="amber" />
              <StatChip label="Infos" value={props.counts.info} tone="blue" />
            </div>
          </div>
        </section>

        {/* LISTE */}
        <section className="container mx-auto px-4 py-10 max-w-4xl">
          {props.matches.length === 0 ? (
            <Card className="bg-emerald-950/20 border-emerald-500/30 p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-black text-white">Tout est propre 🎉</h2>
              <p className="text-white/55 mt-2 text-sm">
                Aucun match terminé n&apos;a de score, de buteur ou de stat manquant.
              </p>
            </Card>
          ) : (
            <>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-6">
                <TabsList className="bg-white/5 border border-white/10 rounded-full p-1">
                  <TabsTrigger value="all" className="rounded-full text-xs">
                    Tous ({props.counts.total})
                  </TabsTrigger>
                  <TabsTrigger value="critical" className="rounded-full text-xs">
                    Critiques ({props.counts.critical})
                  </TabsTrigger>
                  <TabsTrigger value="warning" className="rounded-full text-xs">
                    Avert. ({props.counts.warning})
                  </TabsTrigger>
                  <TabsTrigger value="info" className="rounded-full text-xs">
                    Infos ({props.counts.info})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-3">
                {visible.map((m, i) => (
                  <MatchRow key={m.id} match={m} index={i} />
                ))}
              </div>
            </>
          )}
        </section>
      </AdminShell>
    </>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'white' | 'red' | 'amber' | 'blue';
}) {
  const toneClass = {
    white: 'text-white',
    red: 'text-red-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
  }[tone];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className={`text-2xl md:text-3xl font-black tabular-nums ${toneClass}`}>
        <NumberTicker value={value} />
      </div>
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 mt-0.5">
        {label}
      </div>
    </div>
  );
}

function MatchRow({ match, index }: { match: ReviewMatch; index: number }) {
  const sev = SEVERITY_STYLE[match.maxSeverity];
  const SevIcon = sev.icon;
  const date = new Date(match.matchDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const scoreLabel =
    match.homeScore === null || match.awayScore === null
      ? '— : —'
      : `${match.homeScore} : ${match.awayScore}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="bg-white/[0.03] border-white/10 p-5 hover:border-white/20 transition">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`gap-1 text-[10px] font-mono uppercase tracking-[0.18em] ${sev.badge}`}>
                <SevIcon className="w-3 h-3" />
                {sev.label}
              </Badge>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
                {match.tournamentName} · {match.stage}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-white/40">
                <CalendarClock className="w-3 h-3" />
                {date}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <span className="text-base font-black text-white truncate">{match.home.name}</span>
              <span className="text-sm font-mono tabular-nums text-white/70 shrink-0">
                {scoreLabel}
              </span>
              <span className="text-base font-black text-white truncate">{match.away.name}</span>
            </div>

            <ul className="mt-3 space-y-1.5">
              {match.issues.map((issue) => {
                const s = SEVERITY_STYLE[issue.severity];
                const Icon = s.icon;
                return (
                  <li key={issue.code} className="flex items-start gap-2 text-xs text-white/70">
                    <Icon
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        issue.severity === 'critical'
                          ? 'text-red-400'
                          : issue.severity === 'warning'
                            ? 'text-amber-400'
                            : 'text-blue-400'
                      }`}
                    />
                    <span>
                      <strong className="text-white/90">{issue.label}</strong> — {issue.detail}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <Link
            href={`/matches/${match.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[11px] font-mono uppercase tracking-[0.18em] hover:bg-emerald-500/15 transition shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            Corriger
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
