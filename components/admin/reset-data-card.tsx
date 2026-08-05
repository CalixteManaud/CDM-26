'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const CONFIRM_WORD = 'RESET';

/**
 * Zone de danger : vide toutes les données de tournoi/paris (garde les comptes
 * User + rôles). Double sécurité : ouverture d'un dialog + saisie du mot
 * « RESET ». Appelle POST /api/admin/reset-tournament-data.
 */
export function ResetDataCard() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);

  const canConfirm = typed.trim().toUpperCase() === CONFIRM_WORD;

  const reset = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reset-tournament-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? 'Échec de la réinitialisation');
        return;
      }
      const w = json.wiped ?? {};
      toast.success(
        `Données vidées — ${w.tournaments ?? 0} tournois, ${w.teams ?? 0} équipes, ${w.bets ?? 0} paris. Comptes préservés. Rechargement…`
      );
      setOpen(false);
      setTimeout(() => window.location.reload(), 1400);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.03] p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
          <ShieldAlert className="h-5 w-5 text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-red-400">Zone de danger</div>
          <h3 className="mt-1 text-lg font-black tracking-tight text-white">Réinitialiser les données</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
            Vide <strong className="text-white/80">tous</strong> les tournois, équipes, joueurs, matchs, paris,
            marchés, transferts et notifications pour repartir de zéro. Les <strong className="text-white/80">comptes
            utilisateurs et leurs rôles sont conservés</strong>. Action <strong className="text-red-300">irréversible</strong>.
          </p>

          <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTyped(''); }}>
            <AlertDialogTrigger asChild>
              <Button className="mt-4 bg-red-500 font-bold uppercase tracking-[0.14em] text-white hover:bg-red-400" size="sm">
                <Trash2 className="mr-1.5 h-4 w-4" />
                Réinitialiser les données
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-red-500/25 bg-black text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-xl font-black">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Tout réinitialiser ?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">
                  Cette action supprime définitivement toute la donnée de tournoi et de paris. Les comptes et rôles
                  restent intacts. Tape{' '}
                  <span className="font-mono font-bold text-red-300">{CONFIRM_WORD}</span> pour confirmer.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <Input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={CONFIRM_WORD}
                className="border-red-500/30 bg-white/[0.03] font-mono uppercase tracking-[0.3em]"
              />

              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/15 bg-white/5 text-white/70 hover:bg-white/10">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault(); // ne pas fermer avant la fin de la requête
                    reset();
                  }}
                  disabled={!canConfirm || loading}
                  className="bg-red-500 font-bold text-white hover:bg-red-400 disabled:opacity-40"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tout supprimer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
