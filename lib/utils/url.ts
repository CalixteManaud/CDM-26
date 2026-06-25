/**
 * Validation d'URL partagée (client-safe — pas de dépendance Node).
 * Politique : http/https uniquement.
 */
export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Variante "optionnelle" : accepte aussi undefined/null/'' (= champ absent ou
 * effacé, à ne pas valider comme une URL).
 */
export function isValidOptionalHttpUrl(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  return isValidHttpUrl(value);
}
