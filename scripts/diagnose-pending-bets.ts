/**
 * Diagnostic (LECTURE SEULE) : paris 1X2 restés PENDING sur des matchs TERMINÉS.
 * Montre, par match : score, statut du pool (settledAt), nb + montant de paris
 * PENDING, et combien ont déjà été réglés (WON/LOST) — pour comprendre pourquoi.
 *
 * Lancer : npx tsx --env-file=.env.local scripts/diagnose-pending-bets.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/prisma-client/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // Matchs terminés AVEC score.
  const finished = await prisma.match.findMany({
    where: { status: 'FINISHED', homeScore: { not: null }, awayScore: { not: null } },
    select: {
      id: true,
      matchDate: true,
      homeScore: true,
      awayScore: true,
      winnerTeamId: true,
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } },
      bettingPool: { select: { settledAt: true, finalTotalPool: true, betCount: true } },
    },
    orderBy: { matchDate: 'asc' },
  });

  let totalPendingBets = 0;
  let totalPendingPts = 0;
  let matchesWithPending = 0;
  const rows: string[] = [];

  for (const m of finished) {
    const [pending, settled] = await Promise.all([
      prisma.bet.aggregate({
        where: { matchId: m.id, status: 'PENDING' },
        _sum: { pointsWagered: true },
        _count: true,
      }),
      prisma.bet.count({ where: { matchId: m.id, status: { in: ['WON', 'LOST', 'VOID', 'CREDIT_FAILED'] } } }),
    ]);
    const nPending = pending._count;
    if (nPending === 0) continue;

    matchesWithPending++;
    totalPendingBets += nPending;
    totalPendingPts += pending._sum.pointsWagered ?? 0;

    const label = `${m.homeTeam.shortName} ${m.homeScore}-${m.awayScore} ${m.awayTeam.shortName}`;
    const poolSettled = m.bettingPool?.settledAt ? `réglé ${m.bettingPool.settledAt.toISOString().slice(0, 16)}` : 'POOL NON RÉGLÉ';
    rows.push(
      `  ${label.padEnd(18)} | ${String(nPending).padStart(3)} PENDING (${(pending._sum.pointsWagered ?? 0).toLocaleString('fr-FR')} pts) | ${settled} déjà réglés | ${poolSettled}`
    );
  }

  console.log(`\n════ PARIS 1X2 EN ATTENTE SUR MATCHS TERMINÉS ════`);
  console.log(`Matchs finis analysés : ${finished.length}`);
  console.log(`Matchs avec des paris PENDING : ${matchesWithPending}`);
  console.log(`Total paris bloqués : ${totalPendingBets} · ${totalPendingPts.toLocaleString('fr-FR')} pts\n`);
  console.log(rows.join('\n'));
  console.log('');
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
