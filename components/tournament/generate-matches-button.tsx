'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Zap, Trophy, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BorderBeam } from '@/components/ui/border-beam';

type Props = {
  tournamentId: string;
  type: 'group' | 'knockout';
  groupStageComplete?: boolean;
};

export function GenerateMatchesButton({ tournamentId, type, groupStageComplete }: Props) {
  const [isPending, startTransition] = useTransition();

  const disabled = isPending || (type === 'knockout' && groupStageComplete === false);

  const onClick = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/generate-matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        });
        const json: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string'
              ? json.error
              : 'Erreur lors de la génération';
          throw new Error(msg);
        }
        toast.success('Matchs générés ✅');
        window.location.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
      }
    });
  };

  const isKnockout = type === 'knockout';
  const Icon = isKnockout ? Zap : Trophy;

  return (
    <Card
      className={`relative overflow-hidden bg-gradient-to-br ${
        isKnockout ? 'from-purple-950/30' : 'from-emerald-950/30'
      } via-black to-black border-white/10 p-6 md:p-7`}
    >
      <div className="grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
        <div
          className={`w-12 h-12 rounded-xl ${
            isKnockout
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
          } border flex items-center justify-center`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div
            className={`text-[10px] font-mono uppercase tracking-[0.3em] mb-1.5 ${
              isKnockout ? 'text-purple-400' : 'text-emerald-400'
            }`}
          >
            § Action admin · {isKnockout ? 'KNOCKOUT' : 'GROUP-STAGE'}
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1.5 leading-tight">
            {isKnockout ? 'Générer le bracket d\'élimination' : 'Générer les matchs de poules'}
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            {isKnockout
              ? 'Crée automatiquement les confrontations à élimination directe à partir des qualifiés de la phase de poules.'
              : 'Génère le calendrier complet des journées de groupes — round-robin évitant les confrontations intra-groupe.'}
          </p>
        </div>

        <Button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {isPending ? 'Génération…' : 'Générer'}
          {!isPending && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>

      <BorderBeam
        size={150}
        duration={10}
        colorFrom={isKnockout ? '#a855f7' : '#10b981'}
        colorTo={isKnockout ? '#facc15' : '#facc15'}
        borderWidth={1}
      />
    </Card>
  );
}
