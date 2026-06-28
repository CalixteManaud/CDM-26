'use client';

import { useSyncExternalStore } from 'react';

/**
 * Mode de saisie admin pendant un match :
 *  - 'simple'  → console allégée (boutons « +1 but »), buteurs dérivés du live,
 *                stats détaillées optionnelles. Pour ceux qui galèrent à tout suivre.
 *  - 'complet' → l'écran historique (console événements complète, stats détaillées).
 *
 * Persisté en localStorage et partagé entre la console d'events et le formulaire
 * de résultat sur la même page (store externe + useSyncExternalStore).
 */
export type MatchInputMode = 'simple' | 'complet';

const KEY = 'cdm:match-input-mode';
const listeners = new Set<() => void>();
let cached: MatchInputMode | null = null;

function read(): MatchInputMode {
  if (cached) return cached;
  if (typeof window === 'undefined') return 'simple';
  const v = window.localStorage.getItem(KEY);
  cached = v === 'complet' ? 'complet' : 'simple';
  return cached;
}

export function setMatchInputMode(mode: MatchInputMode) {
  cached = mode;
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, mode);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useMatchInputMode(): [MatchInputMode, (m: MatchInputMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => 'simple' as MatchInputMode);
  return [mode, setMatchInputMode];
}
