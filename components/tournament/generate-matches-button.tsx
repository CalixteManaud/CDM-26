'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Zap, Trophy, ArrowRight, CalendarClock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BorderBeam } from '@/components/ui/border-beam';

type Props = {
  tournamentId: string;
  type: 'group' | 'knockout';
  groupStageComplete?: boolean;
  /** Nb d'équipes non assignées à un groupe — averti avant génération (type group). */
  unassignedCount?: number;
};

const INTERVAL_PRESETS = [
  { value: '1', label: '1 heure' },
  { value: '3', label: '3 heures' },
  { value: '6', label: '6 heures' },
  { value: '12', label: '12 heures' },
  { value: '24', label: '24 heures (1 / jour)' },
  { value: '48', label: '48 heures (1 / 2 jours)' },
  { value: '168', label: '1 semaine' },
];

/** Format yyyy-mm-ddThh:mm pour `<input type="datetime-local">`. */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function GenerateMatchesButton({ tournamentId, type, groupStageComplete, unassignedCount = 0 }: Props) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasUnassigned = type === 'group' && unassignedCount > 0;

  // Défauts pour le dialog group : demain 20h00, espacement 24h.
  const tomorrow8pm = new Date();
  tomorrow8pm.setDate(tomorrow8pm.getDate() + 1);
  tomorrow8pm.setHours(20, 0, 0, 0);
  const [startDate, setStartDate] = useState<string>(toLocalInputValue(tomorrow8pm));
  const [intervalHours, setIntervalHours] = useState<string>('24');

  const disabled = isPending || (type === 'knockout' && groupStageComplete === false);

  const submit = (body: Record<string, unknown>) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/generate-matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string'
              ? json.error
              : 'Erreur lors de la génération';
          throw new Error(msg);
        }
        const data =
          typeof json === 'object' && json !== null && 'data' in json
            ? (json as { data: { matchesCreated?: number; message?: string } }).data
            : null;
        const created = data?.matchesCreated ?? 0;
        if (created === 0) {
          toast.warning(data?.message ?? 'Aucun match créé');
        } else {
          toast.success(data?.message ?? `${created} matchs générés ✅`);
        }
        setDialogOpen(false);
        window.location.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
      }
    });
  };

  const onClickKnockout = () => submit({ type });

  const onConfirmGroup = () => {
    const parsedInterval = Number.parseFloat(intervalHours);
    if (!Number.isFinite(parsedInterval) || parsedInterval <= 0) {
      toast.error('Intervalle invalide');
      return;
    }
    // `datetime-local` produit un string local sans timezone — on le convertit
    // en ISO via `new Date(str)` qui l'interprète comme heure locale.
    const startIso = new Date(startDate).toISOString();
    submit({ type: 'group', startDate: startIso, intervalHours: parsedInterval });
  };

  const isKnockout = type === 'knockout';
  const Icon = isKnockout ? Zap : Trophy;

  return (
    <>
      <Card
        className={`relative overflow-hidden bg-linear-to-br ${
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
                : 'Configure la date de départ et l\'intervalle entre matchs, puis génère le round-robin complet des poules.'}
            </p>
          </div>

          <Button
            type="button"
            onClick={isKnockout ? onClickKnockout : () => setDialogOpen(true)}
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

      {!isKnockout && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-emerald-400" />
                Paramètres de génération
              </DialogTitle>
              <DialogDescription>
                Round-robin par groupe. Les équipes disqualifiées ou non assignées à un groupe
                sont automatiquement exclues.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {hasUnassigned && (
                <Alert className="border-amber-500/40 bg-amber-950/20 text-amber-100 [&>svg]:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="font-black tracking-tight text-amber-200">
                    {unassignedCount} équipe{unassignedCount > 1 ? 's' : ''} sans groupe
                  </AlertTitle>
                  <AlertDescription className="text-amber-100/80">
                    {unassignedCount > 1 ? 'Elles seront exclues' : 'Elle sera exclue'} des matchs
                    générés. Assigne{unassignedCount > 1 ? '-les' : '-la'} via le tirage au sort
                    d&apos;abord si {unassignedCount > 1 ? 'elles doivent' : 'elle doit'} jouer.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label
                  htmlFor="startDate"
                  className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono"
                >
                  Date &amp; heure du 1er match
                </Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                />
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.22em]">
                  Heure locale · les matchs suivants s&apos;enchaînent à intervalle régulier
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="interval"
                  className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono"
                >
                  Intervalle entre 2 matchs
                </Label>
                <Select value={intervalHours} onValueChange={setIntervalHours}>
                  <SelectTrigger id="interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                onClick={onConfirmGroup}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.18em] text-xs"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération…
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    {hasUnassigned ? 'Générer quand même' : 'Générer'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
