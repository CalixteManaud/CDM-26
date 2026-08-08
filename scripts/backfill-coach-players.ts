/**
 * Backfill « le coach est aussi un joueur ».
 *
 * Crée une entrée Player pour chaque coach d'équipe qui n'en a pas encore une,
 * afin qu'il compte dans l'effectif. Idempotent : re-lançable sans doublon.
 *
 * Lancer : npx tsx --env-file=.env.local scripts/backfill-coach-players.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/prisma-client/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_POSITION = 'MID';

async function nextFreeJersey(teamId: string): Promise<number> {
  const players = await prisma.player.findMany({ where: { teamId }, select: { jerseyNumber: true } });
  const taken = new Set(players.map((p) => p.jerseyNumber));
  for (let n = 1; n <= 99; n++) {
    if (!taken.has(n)) return n;
  }
  return 99;
}

async function main() {
  const teams = await prisma.team.findMany({
    where: { coachUserId: { not: null } },
    select: { id: true, name: true, coachUserId: true },
  });

  let created = 0;
  let skipped = 0;

  for (const team of teams) {
    const coachId = team.coachUserId!;
    const existing = await prisma.player.findFirst({
      where: { teamId: team.id, userId: coachId },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }
    const jersey = await nextFreeJersey(team.id);
    await prisma.player.create({
      data: { teamId: team.id, userId: coachId, jerseyNumber: jersey, position: DEFAULT_POSITION },
    });
    created++;
    console.log(`+ ${team.name} : coach ajouté à l'effectif (#${jersey})`);
  }

  console.log(
    `\nBackfill terminé — créés: ${created}, déjà présents: ${skipped}, équipes coachées: ${teams.length}`
  );
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
