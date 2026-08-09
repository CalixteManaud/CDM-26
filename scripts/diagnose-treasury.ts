/**
 * Diagnostic trésorerie (LECTURE SEULE).
 * Agrège les crédits Wizebot en échec + remboursements en attente et regroupe
 * par message d'erreur, pour comprendre la cause avant de rejouer.
 *
 * Lancer : npx tsx --env-file=.env.local scripts/diagnose-treasury.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/prisma-client/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function tally(rows: Array<{ err: string | null; amount: number }>) {
  const map = new Map<string, { count: number; amount: number }>();
  for (const r of rows) {
    const key = (r.err ?? '(aucun message)').trim() || '(vide)';
    const cur = map.get(key) ?? { count: 0, amount: 0 };
    cur.count++;
    cur.amount += r.amount;
    map.set(key, cur);
  }
  return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
}

async function main() {
  const [bets, marketBets, slips, refunds] = await Promise.all([
    prisma.bet.findMany({
      where: { status: 'CREDIT_FAILED' },
      select: { actualPayout: true, wizebotCreditError: true },
    }),
    prisma.marketBet.findMany({
      where: { status: 'CREDIT_FAILED', slipId: null },
      select: { actualPayout: true, wizebotCreditError: true },
    }),
    prisma.betSlip.findMany({
      where: { status: 'CREDIT_FAILED' },
      select: { actualPayout: true },
    }),
    prisma.pendingRefund.findMany({
      where: { status: { in: ['PENDING', 'FAILED'] } },
      select: { amount: true, lastError: true, status: true, attempts: true, reason: true },
    }),
  ]);

  const creditRows = [
    ...bets.map((b) => ({ err: b.wizebotCreditError, amount: b.actualPayout ?? 0 })),
    ...marketBets.map((m) => ({ err: m.wizebotCreditError, amount: m.actualPayout ?? 0 })),
    ...slips.map((s) => ({ err: '(combiné — pas de message stocké)', amount: s.actualPayout ?? 0 })),
  ];
  const refundRows = refunds.map((r) => ({ err: r.lastError, amount: r.amount }));

  const creditTotal = creditRows.reduce((s, r) => s + r.amount, 0);
  const refundTotal = refundRows.reduce((s, r) => s + r.amount, 0);

  console.log('\n════════ CRÉDITS EN ÉCHEC ════════');
  console.log(`Total : ${creditRows.length} crédits · ${creditTotal.toLocaleString('fr-FR')} pts`);
  console.log('Par message d\'erreur :');
  for (const [msg, { count, amount }] of tally(creditRows)) {
    console.log(`  ${count.toString().padStart(3)}×  ${amount.toLocaleString('fr-FR').padStart(9)} pts  — ${msg}`);
  }

  console.log('\n════════ REMBOURSEMENTS EN ATTENTE ════════');
  console.log(`Total : ${refundRows.length} remboursements · ${refundTotal.toLocaleString('fr-FR')} pts`);
  const byStatus = new Map<string, number>();
  refunds.forEach((r) => byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1));
  console.log('Par statut :', [...byStatus.entries()].map(([s, c]) => `${s}=${c}`).join(', '));
  console.log('Par message d\'erreur :');
  for (const [msg, { count, amount }] of tally(refundRows)) {
    console.log(`  ${count.toString().padStart(3)}×  ${amount.toLocaleString('fr-FR').padStart(9)} pts  — ${msg}`);
  }

  console.log(`\n════════ TOTAL BLOQUÉ : ${(creditTotal + refundTotal).toLocaleString('fr-FR')} pts ════════\n`);
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
