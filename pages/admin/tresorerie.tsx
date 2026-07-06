import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Wallet,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Send,
  Coins,
  Loader2,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NumberTicker } from '@/components/ui/number-ticker';

type FailedCredit = {
  kind: '1X2' | 'Marché' | 'Combiné';
  id: string;
  user: string;
  amount: number;
  error: string | null;
  createdAt: string;
};

type PendingRefundRow = {
  id: string;
  user: string;
  amount: number;
  reason: string;
  status: string;
  attempts: number;
  createdAt: string;
};

type TransferRow = {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  status: string;
  error: string | null;
  createdAt: string;
};

type PageProps = {
  failedCredits: FailedCredit[];
  pendingRefunds: PendingRefundRow[];
  failedTransfers: TransferRow[];
  recentTransfers: TransferRow[];
  totals: { stuck: number; failedCount: number; refundCount: number; transferIssues: number };
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
  const { BetStatus, RefundStatus, TransferStatus } = await import('@/prisma/prisma-client/enums');

  const [bets, marketBets, slips, refunds, failedTransfersRaw, recentTransfersRaw] = await Promise.all([
    prisma.bet.findMany({
      where: { status: BetStatus.CREDIT_FAILED },
      select: {
        id: true,
        actualPayout: true,
        wizebotCreditError: true,
        settledAt: true,
        user: { select: { username: true, twitchUsername: true } },
      },
      take: 200,
    }),
    prisma.marketBet.findMany({
      where: { status: BetStatus.CREDIT_FAILED, slipId: null },
      select: {
        id: true,
        actualPayout: true,
        wizebotCreditError: true,
        settledAt: true,
        user: { select: { username: true, twitchUsername: true } },
      },
      take: 200,
    }),
    prisma.betSlip.findMany({
      where: { status: BetStatus.CREDIT_FAILED },
      select: {
        id: true,
        actualPayout: true,
        settledAt: true,
        user: { select: { username: true, twitchUsername: true } },
      },
      take: 200,
    }),
    prisma.pendingRefund.findMany({
      where: { status: { in: [RefundStatus.PENDING, RefundStatus.FAILED] } },
      select: {
        id: true,
        amount: true,
        reason: true,
        status: true,
        attempts: true,
        createdAt: true,
        user: { select: { username: true, twitchUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.pointTransfer.findMany({
      where: { status: { in: [TransferStatus.FAILED, TransferStatus.REFUNDED] } },
      select: {
        id: true,
        amount: true,
        status: true,
        error: true,
        createdAt: true,
        sender: { select: { username: true, twitchUsername: true } },
        recipient: { select: { username: true, twitchUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.pointTransfer.findMany({
      select: {
        id: true,
        amount: true,
        status: true,
        error: true,
        createdAt: true,
        sender: { select: { username: true, twitchUsername: true } },
        recipient: { select: { username: true, twitchUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const uname = (u: { username: string | null; twitchUsername: string | null }) =>
    u.username ?? u.twitchUsername ?? '—';

  const failedCredits: FailedCredit[] = [
    ...bets.map((b) => ({
      kind: '1X2' as const,
      id: b.id,
      user: uname(b.user),
      amount: b.actualPayout ?? 0,
      error: b.wizebotCreditError,
      createdAt: (b.settledAt ?? new Date()).toISOString(),
    })),
    ...marketBets.map((mb) => ({
      kind: 'Marché' as const,
      id: mb.id,
      user: uname(mb.user),
      amount: mb.actualPayout ?? 0,
      error: mb.wizebotCreditError,
      createdAt: (mb.settledAt ?? new Date()).toISOString(),
    })),
    ...slips.map((s) => ({
      kind: 'Combiné' as const,
      id: s.id,
      user: uname(s.user),
      amount: s.actualPayout ?? 0,
      error: null,
      createdAt: (s.settledAt ?? new Date()).toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingRefunds: PendingRefundRow[] = refunds.map((r) => ({
    id: r.id,
    user: uname(r.user),
    amount: r.amount,
    reason: r.reason,
    status: r.status,
    attempts: r.attempts,
    createdAt: r.createdAt.toISOString(),
  }));

  const mapTransfer = (t: (typeof failedTransfersRaw)[number]): TransferRow => ({
    id: t.id,
    sender: uname(t.sender),
    recipient: uname(t.recipient),
    amount: t.amount,
    status: t.status,
    error: t.error,
    createdAt: t.createdAt.toISOString(),
  });

  const stuck =
    failedCredits.reduce((s, c) => s + c.amount, 0) +
    pendingRefunds.reduce((s, r) => s + r.amount, 0);

  return {
    props: {
      failedCredits,
      pendingRefunds,
      failedTransfers: failedTransfersRaw.map(mapTransfer),
      recentTransfers: recentTransfersRaw.map(mapTransfer),
      totals: {
        stuck,
        failedCount: failedCredits.length,
        refundCount: pendingRefunds.length,
        transferIssues: failedTransfersRaw.length,
      },
    },
  };
};

export default function TresoreriePage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      const res = await fetch('/api/admin/bets/retry-failed', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? 'Échec du rejeu');
        return;
      }
      const c = json.credits ?? {};
      const r = json.refunds ?? {};
      toast.success(
        `Rejeu terminé — crédits récupérés: ${c.recovered ?? 0}, remboursements: ${r.refunded ?? 0}. Recharge en cours…`
      );
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setRetrying(false);
    }
  };

  const allClean =
    props.totals.failedCount === 0 &&
    props.totals.refundCount === 0 &&
    props.totals.transferIssues === 0;

  return (
    <>
      <Head>
        <title>Trésorerie — Admin CDM 26</title>
      </Head>

      <div className="relative bg-black text-white min-h-screen">
        <section className="relative border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-yellow-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-14 md:py-16 relative">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour au dashboard
            </Link>

            <div className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold text-yellow-400">
              <span className="block w-12 h-px bg-yellow-400" />
              <span className="font-mono">/ FIN</span>
              <span className="text-white/30">—</span>
              <span>Points bloqués & flux Wizebot</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black mt-5 leading-[0.95] tracking-tight flex items-center gap-4">
              <Wallet className="w-9 h-9 md:w-12 md:h-12 text-yellow-400 shrink-0" />
              <span className="text-gradient-worldcup">Trésorerie.</span>
            </h1>
            <p className="text-white/60 mt-6 max-w-2xl text-base leading-relaxed">
              Les crédits Wizebot en échec, les remboursements en attente et les transferts à
              problème. Le cron rejoue tout ça toutes les 5 min — tu peux forcer un rejeu ici.
            </p>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
              <StatChip label="Points bloqués" value={props.totals.stuck} tone="yellow" />
              <StatChip label="Crédits en échec" value={props.totals.failedCount} tone="red" />
              <StatChip label="Remboursements" value={props.totals.refundCount} tone="blue" />
              <StatChip label="Transferts KO" value={props.totals.transferIssues} tone="amber" />
            </div>

            <button
              type="button"
              onClick={retry}
              disabled={retrying}
              className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-mono uppercase tracking-[0.2em] hover:bg-emerald-500/15 transition disabled:opacity-50"
            >
              {retrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Rejouer crédits & remboursements
            </button>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 max-w-4xl space-y-10">
          {allClean && (
            <Card className="bg-emerald-950/20 border-emerald-500/30 p-10 text-center">
              <Coins className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-black text-white">Aucun point bloqué 🎉</h2>
              <p className="text-white/55 mt-2 text-sm">
                Tous les crédits, remboursements et transferts sont passés.
              </p>
            </Card>
          )}

          {props.failedCredits.length > 0 && (
            <TableSection
              icon={AlertTriangle}
              tone="text-red-400"
              title="Crédits Wizebot en échec"
              subtitle="Gains dus aux gagnants mais non crédités (Wizebot down ou Twitch délié)."
            >
              {props.failedCredits.map((c) => (
                <Row
                  key={`${c.kind}-${c.id}`}
                  left={
                    <>
                      <Badge className="bg-white/5 border-white/15 text-white/60 text-[9px] font-mono">
                        {c.kind}
                      </Badge>
                      <span className="font-bold text-white">{c.user}</span>
                    </>
                  }
                  detail={c.error ?? undefined}
                  amount={c.amount}
                  date={c.createdAt}
                />
              ))}
            </TableSection>
          )}

          {props.pendingRefunds.length > 0 && (
            <TableSection
              icon={RotateCcw}
              tone="text-blue-400"
              title="Remboursements en attente"
              subtitle="Débits Wizebot orphelins à rendre (pari échoué après débit, rollback de transfert…)."
            >
              {props.pendingRefunds.map((r) => (
                <Row
                  key={r.id}
                  left={
                    <>
                      <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-300 text-[9px] font-mono">
                        {r.status} · {r.attempts}×
                      </Badge>
                      <span className="font-bold text-white">{r.user}</span>
                    </>
                  }
                  detail={r.reason}
                  amount={r.amount}
                  date={r.createdAt}
                />
              ))}
            </TableSection>
          )}

          {props.failedTransfers.length > 0 && (
            <TableSection
              icon={Send}
              tone="text-amber-400"
              title="Transferts à problème"
              subtitle="Transferts dont le crédit destinataire a échoué (remboursés ou en attente)."
            >
              {props.failedTransfers.map((t) => (
                <Row
                  key={t.id}
                  left={
                    <>
                      <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-300 text-[9px] font-mono">
                        {t.status}
                      </Badge>
                      <span className="text-white/80">
                        {t.sender} <span className="text-white/40">→</span>{' '}
                        <span className="font-bold text-white">{t.recipient}</span>
                      </span>
                    </>
                  }
                  detail={t.error ?? undefined}
                  amount={t.amount}
                  date={t.createdAt}
                />
              ))}
            </TableSection>
          )}

          {props.recentTransfers.length > 0 && (
            <TableSection
              icon={Send}
              tone="text-white/50"
              title="Transferts récents"
              subtitle="Les 20 derniers transferts entre membres (surveillance / anti-fraude)."
            >
              {props.recentTransfers.map((t) => (
                <Row
                  key={t.id}
                  left={
                    <>
                      <Badge
                        className={
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-[9px] font-mono'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300 text-[9px] font-mono'
                        }
                      >
                        {t.status}
                      </Badge>
                      <span className="text-white/80">
                        {t.sender} <span className="text-white/40">→</span>{' '}
                        <span className="font-bold text-white">{t.recipient}</span>
                      </span>
                    </>
                  }
                  amount={t.amount}
                  date={t.createdAt}
                />
              ))}
            </TableSection>
          )}
        </section>
      </div>
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
  tone: 'yellow' | 'red' | 'blue' | 'amber';
}) {
  const toneClass = {
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
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

function TableSection({
  icon: Icon,
  tone,
  title,
  subtitle,
  children,
}: {
  icon: typeof Wallet;
  tone: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${tone}`} />
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
          <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <Card className="bg-white/[0.02] border-white/10 divide-y divide-white/5 overflow-hidden">
        {children}
      </Card>
    </div>
  );
}

function Row({
  left,
  detail,
  amount,
  date,
}: {
  left: React.ReactNode;
  detail?: string;
  amount: number;
  date: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">{left}</div>
        {detail && <p className="text-[11px] text-white/45 mt-1 truncate">{detail}</p>}
        <span className="text-[10px] font-mono text-white/30">
          {new Date(date).toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <span className="text-base font-black tabular-nums text-yellow-300 shrink-0">
        {amount.toLocaleString('fr-FR')} pts
      </span>
    </div>
  );
}
