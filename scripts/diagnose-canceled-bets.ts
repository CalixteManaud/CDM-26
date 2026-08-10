/**
 * Diagnostic (LECTURE SEULE) : matchs ANNULÉS ayant encore des paris PENDING
 * (mises débitées, jamais remboursées).
 *
 * Lancer : npx tsx --env-file=.env.local scripts/diagnose-canceled-bets.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/prisma-client/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const canceled = await prisma.match.findMany({
    where: { status: 'CANCELED' },
    select: {
      id: true,
      matchDate: true,
      homeTeam: { select: { shortName: true } },
      awayTeam: { select: { shortName: true } },
      bettingPool: { select: { settledAt: true } },
    },
    orderBy: { matchDate: 'asc' },
  });

  let totalBets = 0;
  let totalPts = 0;
  let matchesWithPending = 0;
  const rows: string[] = [];

  for (const m of canceled) {
    const pending = await prisma.bet.aggregate({
      where: { matchId: m.id, status: 'PENDING' },
      _sum: { pointsWagered: true },
      _count: true,
    });
    if (pending._count === 0) continue;
    matchesWithPending++;
    totalBets += pending._count;
    totalPts += pending._sum.pointsWagered ?? 0;
    const label = `${m.homeTeam.shortName} vs ${m.awayTeam.shortName}`;
    const poolState = m.bettingPool?.settledAt ? `réglé ${m.bettingPool.settledAt.toISOString().slice(0, 16)}` : 'pool non réglé';
    rows.push(`  ${label.padEnd(20)} | ${String(pending._count).padStart(3)} PENDING (${(pending._sum.pointsWagered ?? 0).toLocaleString('fr-FR')} pts) | ${poolState}`);
  }

  console.log(`\n════ MATCHS ANNULÉS AVEC PARIS EN ATTENTE ════`);
  console.log(`Matchs annulés au total : ${canceled.length}`);
  console.log(`Avec des paris PENDING à rembourser : ${matchesWithPending}`);
  console.log(`Total à rembourser : ${totalBets} paris · ${totalPts.toLocaleString('fr-FR')} pts\n`);
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
