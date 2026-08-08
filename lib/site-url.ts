/**
 * URL publique du site, utilisée pour toutes les URLs absolues (og:image,
 * canonical, liens d'invitation, emails).
 *
 * Source : `NEXT_PUBLIC_APP_URL`. Garde-fou : une valeur localhost ne doit
 * JAMAIS fuiter en production (sinon aperçus Discord cassés + liens d'email
 * pointant sur localhost). Si mal configurée en prod, on retombe sur le domaine.
 *
 * Client-safe (aucun import serveur) : utilisable en composant comme côté API.
 */
const PROD_FALLBACK = 'https://cdm.rgtcity.fr';

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  const looksLocal = configured ? /localhost|127\.0\.0\.1/.test(configured) : false;

  if (!configured || (process.env.NODE_ENV === 'production' && looksLocal)) {
    return PROD_FALLBACK;
  }
  return configured;
}
