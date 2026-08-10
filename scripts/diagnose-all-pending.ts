/**
 * Diagnostic (LECTURE SEULE) : TOUS les paris PENDING, groupés par statut du
 * match — pour distinguer ceux légitimement en attente (SCHEDULED/LIVE) de ceux
 * bloqués (FINISHED = à régler, CANCELED = à rembourser).
 *
 * Lancer : npx tsx --env-file=.env.local scripts/diagnose-all-pending.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/prisma-client/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const fr = (n: number) => n.toLocaleString('fr-FR');

async function main() {
  // ── 1X2 : paris PENDING groupés par statut de match ──
  const pendingBets = await prisma.bet.findMany({
    where: { status: 'PENDING' },
    select: {
      pointsWagered: true,
      match: {
        select: {
          id: true,
          status: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { shortName: true } },
          awayTeam: { select: { shortName: true } },
        },
      },
    },
  });

  const byStatus = new Map<string, { count: number; pts: number }>();
  const problemMatches = new Map<string, { label: string; status: string; count: number; pts: number }>();

  for (const b of pendingBets) {
    const st = b.match.status;
    const agg = byStatus.get(st) ?? { count: 0, pts: 0 };
    agg.count++;
    agg.pts += b.pointsWagered;
    byStatus.set(st, agg);

    if (st === 'FINISHED' || st === 'CANCELED') {
      const key = b.match.id;
      const cur =
        problemMatches.get(key) ??
        {
          label:
            st === 'FINISHED'
              ? `${b.match.homeTeam.shortName} ${b.match.homeScore}-${b.match.awayScore} ${b.match.awayTeam.shortName}`
              : `${b.match.homeTeam.shortName} vs ${b.match.awayTeam.shortName}`,
          status: st,
          count: 0,
          pts: 0,
        };
      cur.count++;
      cur.pts += b.pointsWagered;
      problemMatches.set(key, cur);
    }
  }

  // ── Marchés flexibles + combinés PENDING (résumé) ──
  const [marketBets, slips] = await Promise.all([
    prisma.marketBet.aggregate({ where: { status: 'PENDING', slipId: null }, _sum: { pointsWagered: true }, _count: true }),
    prisma.betSlip.aggregate({ where: { status: 'PENDING' }, _sum: { totalStake: true }, _count: true }),
  ]);

  console.log(`\n════ PARIS 1X2 EN COURS (PENDING) — par statut de match ════`);
  const order = ['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELED'];
  const labelStatus: Record<string, string> = {
    SCHEDULED: 'Programmé (normal, à venir)',
    LIVE: 'En direct (normal)',
    FINISHED: 'TERMINÉ → à régler ⚠️',
    CANCELED: 'ANNULÉ → à rembourser ⚠️',
  };
  for (const st of order) {
    const a = byStatus.get(st);
    if (!a) continue;
    console.log(`  ${labelStatus[st].padEnd(30)} : ${String(a.count).padStart(4)} paris · ${fr(a.pts)} pts`);
  }

  if (problemMatches.size > 0) {
    console.log(`\n── Détail des matchs bloqués (à traiter via « Régler les matchs non comptabilisés ») ──`);
    for (const m of problemMatches.values()) {
      console.log(`  [${m.status}] ${m.label.padEnd(20)} : ${m.count} paris · ${fr(m.pts)} pts`);
    }
  }

  console.log(`\n════ MARCHÉS & COMBINÉS EN COURS ════`);
  console.log(`  Marchés flexibles PENDING : ${marketBets._count} · ${fr(marketBets._sum.pointsWagered ?? 0)} pts`);
  console.log(`  Combinés PENDING          : ${slips._count} · ${fr(slips._sum.totalStake ?? 0)} pts`);
  console.log('');
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
