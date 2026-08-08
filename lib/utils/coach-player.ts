/**
 * Helpers « le coach est aussi un joueur ».
 *
 * Un coach d'équipe doit figurer dans l'effectif (table Player) pour compter
 * dans le nombre de joueurs. Server-only (importe Prisma).
 */
import prisma from '@/lib/prisma';

export const DEFAULT_COACH_POSITION = 'MID';
export const VALID_POSITIONS = ['GK', 'DEF', 'MID', 'ATT'] as const;
export type PlayerPosition = (typeof VALID_POSITIONS)[number];

/** Plus petit numéro de maillot libre (1-99) dans une équipe. */
export async function nextFreeJersey(teamId: string): Promise<number> {
  const players = await prisma.player.findMany({ where: { teamId }, select: { jerseyNumber: true } });
  const taken = new Set(players.map((p) => p.jerseyNumber));
  for (let n = 1; n <= 99; n++) {
    if (!taken.has(n)) return n;
  }
  return 99; // effectif plein (ne devrait pas arriver)
}

/**
 * Garantit que le coach figure dans l'effectif de l'équipe. Idempotent : ne fait
 * rien s'il est déjà joueur de cette équipe. Numéro libre auto + poste par défaut
 * (sauf `position` fourni). Retourne s'il a été créé.
 */
export async function ensureCoachAsPlayer(params: {
  teamId: string;
  userId: string;
  position?: string;
}): Promise<{ created: boolean }> {
  const { teamId, userId } = params;
  const position = params.position ?? DEFAULT_COACH_POSITION;

  const existing = await prisma.player.findFirst({
    where: { teamId, userId },
    select: { id: true },
  });
  if (existing) return { created: false };

  const jerseyNumber = await nextFreeJersey(teamId);
  try {
    await prisma.player.create({ data: { teamId, userId, jerseyNumber, position } });
    return { created: true };
  } catch (err) {
    // Course sur le numéro (@@unique teamId+jerseyNumber) : on retente une fois.
    if ((err as { code?: string }).code === 'P2002') {
      const retry = await nextFreeJersey(teamId);
      await prisma.player.create({ data: { teamId, userId, jerseyNumber: retry, position } });
      return { created: true };
    }
    throw err;
  }
}
