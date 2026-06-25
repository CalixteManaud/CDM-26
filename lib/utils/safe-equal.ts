import { timingSafeEqual } from 'crypto';

/**
 * Comparaison de chaînes en temps constant (évite un timing oracle sur un
 * secret). Server-only (dépend de `crypto`). Le court-circuit sur la longueur
 * révèle la longueur — acceptable pour des secrets de longueur fixe.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
