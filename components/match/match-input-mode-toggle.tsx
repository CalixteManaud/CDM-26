'use client';

import { Zap, SlidersHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useMatchInputMode } from '@/hooks/use-match-input-mode';

/**
 * Bascule Simple / Complet pour la saisie admin pendant un match.
 * Pilote à la fois la console d'événements et le formulaire de résultat.
 */
export function MatchInputModeToggle() {
  const [mode, setMode] = useMatchInputMode();

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="px-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/45">
          § Mode de saisie
        </div>
        <p className="mt-0.5 text-[11px] text-white/55 leading-snug">
          {mode === 'simple'
            ? 'Allégé : boutons « +1 but », buteurs repris du live, le reste optionnel.'
            : 'Complet : console détaillée (cartons, remplacements, minutes, stats).'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1 sm:w-[260px] sm:shrink-0">
        <button
          type="button"
          onClick={() => setMode('simple')}
          aria-pressed={mode === 'simple'}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-all',
            mode === 'simple'
              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
              : 'text-white/50 hover:text-white/80'
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          Simple
        </button>
        <button
          type="button"
          onClick={() => setMode('complet')}
          aria-pressed={mode === 'complet'}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-all',
            mode === 'complet'
              ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/40'
              : 'text-white/50 hover:text-white/80'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Complet
        </button>
      </div>
    </div>
  );
}
