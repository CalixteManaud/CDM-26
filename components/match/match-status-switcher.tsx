'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Calendar,
  Radio,
  CheckCircle2,
  XOctagon,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
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

type Status = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED';

const STATES: Array<{
  key: Status;
  label: string;
  code: string;
  Icon: typeof Calendar;
  cls: string;
  ring: string;
  hint: string;
}> = [
  {
    key: 'SCHEDULED',
    label: 'Programmé',
    code: 'SCH',
    Icon: Calendar,
    cls: 'text-blue-300',
    ring: 'ring-blue-500/30',
    hint: 'Avant le coup d\'envoi',
  },
  {
    key: 'LIVE',
    label: 'En cours',
    code: 'LIVE',
    Icon: Radio,
    cls: 'text-red-300',
    ring: 'ring-red-500/40',
    hint: 'Match en direct',
  },
  {
    key: 'FINISHED',
    label: 'Terminé',
    code: 'END',
    Icon: CheckCircle2,
    cls: 'text-emerald-300',
    ring: 'ring-emerald-500/30',
    hint: 'Coup de sifflet final',
  },
  {
    key: 'CANCELED',
    label: 'Annulé',
    code: 'CXL',
    Icon: XOctagon,
    cls: 'text-white/55',
    ring: 'ring-white/15',
    hint: 'Match annulé',
  },
];

export function MatchStatusSwitcher({
  matchId,
  currentStatus,
}: {
  matchId: string;
  currentStatus: Status;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Status | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Status | null>(null);

  const change = async (target: Status) => {
    setPending(target);
    try {
      const res = await fetch(`/api/matches/${matchId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: target }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur changement statut');
        return;
      }
      const labels: Record<Status, string> = {
        SCHEDULED: 'Match remis en programmé',
        LIVE: '🔴 Match passé en LIVE — viewers notifiés',
        FINISHED: 'Match clôturé',
        CANCELED: 'Match annulé',
      };
      toast.success(labels[target]);
      router.replace(router.asPath, undefined, { scroll: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setPending(null);
      setConfirmTarget(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4 text-yellow-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-yellow-300 mb-1.5">
            § Pilotage du match
          </div>
          <h3 className="text-base md:text-lg font-black text-white tracking-tight">
            Statut · transitions live
          </h3>
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/40 mt-1">
            / passer en LIVE déclenche une notif pour tous les viewers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STATES.map((s) => {
          const isActive = currentStatus === s.key;
          const isLoading = pending === s.key;
          const Icon = s.Icon;
          return (
            <AlertDialog
              key={s.key}
              open={confirmTarget === s.key}
              onOpenChange={(v) => !v && setConfirmTarget(null)}
            >
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={isActive || pending !== null}
                  onClick={() => setConfirmTarget(s.key)}
                  className={cn(
                    'group relative flex flex-col items-center gap-2 px-3 py-4 rounded-xl border bg-black/30 transition-all',
                    isActive
                      ? `border-white/20 ${s.ring} ring-2`
                      : 'border-white/10 hover:border-white/25 hover:bg-white/[0.04]',
                    pending !== null && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className={cn('w-5 h-5 animate-spin', s.cls)} />
                  ) : (
                    <Icon
                      className={cn(
                        'w-5 h-5',
                        s.cls,
                        s.key === 'LIVE' && isActive && 'animate-pulse'
                      )}
                    />
                  )}
                  <div className="flex flex-col items-center leading-tight">
                    <span
                      className={cn(
                        'text-[11px] font-black tracking-[0.18em] uppercase',
                        isActive ? 'text-white' : 'text-white/65'
                      )}
                    >
                      {s.label}
                    </span>
                    <span className={cn('text-[9px] font-mono mt-0.5', isActive ? s.cls : 'text-white/30')}>
                      / {s.code}
                    </span>
                  </div>
                  {isActive && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/40" />
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-black border-white/15 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <Icon className={cn('w-5 h-5', s.cls)} />
                    Passer en {s.label} ?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-white/55 text-sm leading-relaxed">
                    {s.hint}
                    {s.key === 'LIVE' && (
                      <span className="block mt-3 text-yellow-300 text-[11px] font-mono uppercase tracking-[0.22em]">
                        / un toast sera envoyé à tous les viewers connectés
                      </span>
                    )}
                    {s.key === 'CANCELED' && (
                      <span className="block mt-3 text-red-300 text-[11px] font-mono uppercase tracking-[0.22em]">
                        / les paris en cours seront remboursés au settle
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 border-white/15 text-white/65 hover:bg-white/10">
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => change(s.key)}
                    className={cn(
                      'font-black uppercase tracking-[0.18em] text-xs',
                      s.key === 'LIVE'
                        ? 'bg-red-500 hover:bg-red-400 text-white'
                        : s.key === 'FINISHED'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                        : s.key === 'CANCELED'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-blue-500 hover:bg-blue-400 text-black'
                    )}
                  >
                    Confirmer · {s.label}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          );
        })}
      </div>
    </div>
  );
}
