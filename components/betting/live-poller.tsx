'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Composant utilitaire qui re-déclenche getServerSideProps de la page
 * courante tant que `active` est true. Sert au live-betting : pendant
 * qu'un match est en cours, on rafraîchit les cotes toutes les
 * `intervalMs` ms.
 */
export function LivePoller({
  active,
  intervalMs = 12_000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      // Pas de refresh si l'onglet n'est pas focus → économie réseau
      if (typeof document !== 'undefined' && document.hidden) return;
      router.replace(router.asPath, undefined, { scroll: false });
    };
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs, router]);

  return null;
}
