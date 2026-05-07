'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BorderBeam } from '@/components/ui/border-beam';

interface DisqualifyTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: {
    id: string;
    name: string;
    shortName: string;
    disqualified?: boolean;
    disqualificationReason?: string | null;
  };
  onSuccess?: () => void;
}

export function DisqualifyTeamModal({ isOpen, onClose, team, onSuccess }: DisqualifyTeamModalProps) {
  const [reason, setReason] = useState(team.disqualificationReason || '');
  const [isPending, startTransition] = useTransition();
  const isDisqualified = team.disqualified ?? false;

  const handleDisqualify = (disqualified: boolean) => {
    if (disqualified && !reason.trim()) {
      toast.error('Veuillez entrer une raison pour la disqualification');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/teams/${team.id}/disqualify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            disqualified,
            reason: disqualified ? reason : null,
          }),
        });

        const json: {
          success?: boolean;
          error?: string;
          message?: string;
          playoffInfo?: { playoffMatchesCreated: number };
        } = await res.json();

        if (!res.ok || !json.success) {
          toast.error(json.error ?? 'Erreur lors de la disqualification');
          return;
        }

        if (json.playoffInfo) {
          toast.success(json.message || "Matchs de barrage créés pour remplacer l'équipe");
        } else {
          toast.success(json.message || (disqualified ? 'Équipe disqualifiée' : 'Équipe réintégrée'));
        }

        onSuccess?.();
        onClose();
      } catch {
        toast.error('Erreur réseau');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-black border-white/15 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isDisqualified
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              {isDisqualified ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div>
              <div
                className={`text-[10px] font-mono uppercase tracking-[0.3em] ${
                  isDisqualified ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                § Action admin · {isDisqualified ? 'RÉINTÉGRATION' : 'DISQUALIFICATION'}
              </div>
              <DialogTitle className="font-black tracking-tight text-xl mt-0.5">
                {isDisqualified ? "Réintégrer l'équipe" : "Disqualifier l'équipe"}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-white/55">
            Équipe :{' '}
            <strong className="text-white font-black">{team.name}</strong>{' '}
            <span className="text-white/40 font-mono uppercase tracking-[0.18em] text-[10px]">
              · {team.shortName}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current status banner */}
          <Card
            className={`relative overflow-hidden bg-white/2 border ${
              isDisqualified ? 'border-red-500/25' : 'border-emerald-500/25'
            } p-4`}
          >
            <div className="flex items-start gap-3">
              {isDisqualified ? (
                <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <div
                  className={`text-[10px] font-mono uppercase tracking-[0.3em] mb-1 ${
                    isDisqualified ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  / Statut actuel
                </div>
                <p
                  className={`font-black tracking-tight ${
                    isDisqualified ? 'text-red-300' : 'text-emerald-300'
                  }`}
                >
                  {isDisqualified ? 'Actuellement disqualifiée' : 'Actuellement active'}
                </p>
                {isDisqualified && team.disqualificationReason && (
                  <p className="text-sm text-white/65 mt-2 leading-relaxed">
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
                      Raison ·
                    </span>{' '}
                    {team.disqualificationReason}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Reason input — only when disqualifying */}
          {!isDisqualified && (
            <div className="space-y-2">
              <Label
                htmlFor="dq-reason"
                className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono flex items-center gap-1.5"
              >
                <span className="text-red-400">*</span>
                Raison de la disqualification
              </Label>
              <Textarea
                id="dq-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : triche détectée, comportement antisportif…"
                rows={3}
                className="bg-black/40 border-white/10 focus:border-red-500/50 text-white resize-none"
              />
            </div>
          )}

          {/* Playoff warning — only when disqualifying */}
          {!isDisqualified && (
            <Card className="relative overflow-hidden bg-yellow-950/20 border-yellow-500/25 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-yellow-400 mb-1.5">
                    / Attention
                  </div>
                  <p className="text-sm text-white/75 leading-relaxed">
                    Si l&apos;équipe est dans un match de knockout (quarts, demis, finale),
                    des matchs de <strong className="text-white">barrage</strong> seront
                    automatiquement créés entre les 4 meilleurs 3èmes pour la remplacer.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs"
          >
            Annuler
          </Button>

          {isDisqualified ? (
            <Button
              onClick={() => handleDisqualify(false)}
              disabled={isPending}
              className="relative overflow-hidden bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.18em] text-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Réintégration…
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Réintégrer
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => handleDisqualify(true)}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-[0.18em] text-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disqualification…
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Disqualifier
                </>
              )}
            </Button>
          )}
        </DialogFooter>

        <BorderBeam
          size={150}
          duration={11}
          colorFrom={isDisqualified ? '#10b981' : '#ef4444'}
          colorTo={isDisqualified ? '#facc15' : '#dc2626'}
          borderWidth={1}
        />
      </DialogContent>
    </Dialog>
  );
}
