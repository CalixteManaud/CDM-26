'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/router';

import { Card } from '@/components/ui/card';
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

/**
 * Action admin destructive : supprime tous les matchs de poule pour déverrouiller
 * un nouveau tirage au sort. L'API refuse l'opération si un résultat ou un pari
 * existe (les garde-fous sont côté serveur, ce bouton ne fait que confirmer).
 */
export function ResetGroupStageButton({
  tournamentId,
  matchCount,
}: {
  tournamentId: string;
  matchCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/reset-group-stage`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Erreur lors de la réinitialisation');
        return;
      }
      toast.success(
        `${json.matchesDeleted} match${json.matchesDeleted > 1 ? 's' : ''} de poule supprimé${json.matchesDeleted > 1 ? 's' : ''} — tu peux relancer le tirage.`
      );
      setOpen(false);
      router.replace(router.asPath);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden bg-linear-to-br from-red-950/20 via-black to-black border-red-500/20 p-6 md:p-7">
      <div className="grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
        <div className="w-12 h-12 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 flex items-center justify-center">
          <RotateCcw className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] mb-1.5 text-red-400">
            § Zone sensible · GROUP-STAGE
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1.5 leading-tight">
            Réinitialiser la phase de poules
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            Supprime les {matchCount} match{matchCount > 1 ? 's' : ''} de poule pour pouvoir relancer
            le tirage au sort. Impossible si un résultat ou un pari existe déjà.
          </p>
        </div>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="border-red-500/40 bg-red-500/5 text-red-300 hover:bg-red-500/15 hover:text-red-200 hover:border-red-500/60 font-black uppercase tracking-[0.18em] text-xs px-6 shrink-0"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Réinitialiser la phase de poules ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Les {matchCount} match{matchCount > 1 ? 's' : ''} de poule (et leurs marchés de paris
                non utilisés) seront définitivement supprimés. Les équipes et leurs assignations de
                groupe sont conservées — tu pourras relancer le tirage immédiatement. Cette action
                est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirm();
                }}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Suppression…
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Réinitialiser
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
