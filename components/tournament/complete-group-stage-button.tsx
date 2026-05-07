'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Hourglass, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BorderBeam } from '@/components/ui/border-beam';

type Props = {
  tournamentId: string;
  allGroupMatchesFinished: boolean;
};

export function CompleteGroupStageButton({ tournamentId, allGroupMatchesFinished }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const disabled = isPending || !allGroupMatchesFinished;

  const onClick = () => {
    if (!allGroupMatchesFinished) {
      toast.error('Tous les matchs de poule doivent être terminés');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/complete-group-stage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const json: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string'
              ? json.error
              : 'Erreur lors de la validation';
          throw new Error(msg);
        }
        toast.success('Phase de poules terminée ! Vous pouvez maintenant générer le bracket.');
        router.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
      }
    });
  };

  const Icon = allGroupMatchesFinished ? CheckCircle : Hourglass;

  return (
    <Card
      className={`relative overflow-hidden bg-linear-to-br ${
        allGroupMatchesFinished ? 'from-emerald-950/30' : 'from-yellow-950/20'
      } via-black to-black border-white/10 p-6 md:p-7`}
    >
      <div className="grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
        <div
          className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
            allGroupMatchesFinished
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div
            className={`text-[10px] font-mono uppercase tracking-[0.3em] mb-1.5 ${
              allGroupMatchesFinished ? 'text-emerald-400' : 'text-yellow-400'
            }`}
          >
            § Validation · GROUP-STAGE
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1.5 leading-tight">
            Clôturer la phase de poules
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            {allGroupMatchesFinished
              ? 'Tous les matchs de poule sont terminés. Valide cette étape pour passer aux phases finales.'
              : 'Termine tous les matchs de poule avant de pouvoir valider cette étape.'}
          </p>
        </div>

        <Button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`font-black uppercase tracking-[0.18em] text-xs px-6 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
            allGroupMatchesFinished
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-white/10 text-white/60 hover:bg-white/15 border border-white/15'
          }`}
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isPending ? 'Validation…' : allGroupMatchesFinished ? 'Clôturer' : 'En attente'}
          {!isPending && allGroupMatchesFinished && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>

      {allGroupMatchesFinished && (
        <BorderBeam size={150} duration={10} colorFrom="#10b981" colorTo="#facc15" borderWidth={1} />
      )}
    </Card>
  );
}
