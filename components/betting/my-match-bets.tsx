'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Check, X, Clock, Coins } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MAX_BET_POINTS } from '@/lib/utils/odds';

type ApiOutcome = 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';

type MyBet = {
  id: string;
  outcome: ApiOutcome;
  pointsWagered: number;
  oddsAtPlacement: number;
  createdAt: string;
  editableUntil: string;
};

type Props = {
  matchId: string;
  homeShort: string;
  awayShort: string;
  /** Incrémenté par le parent après un placement pour forcer un refresh. */
  refreshSignal?: number;
  /** Appelé après modif/annulation (rafraîchit pool + quota côté parent). */
  onChanged?: () => void;
};

const PRESETS = [50, 100, 500, 1000];

const UI: Record<ApiOutcome, { idx: string; key: 'HOME' | 'DRAW' | 'AWAY'; text: string; ring: string; chip: string }> = {
  HOME_WIN: { idx: '1', key: 'HOME', text: 'text-emerald-300', ring: 'border-emerald-500/60 bg-emerald-500/10', chip: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' },
  DRAW: { idx: 'X', key: 'DRAW', text: 'text-yellow-300', ring: 'border-yellow-500/60 bg-yellow-500/10', chip: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300' },
  AWAY_WIN: { idx: '2', key: 'AWAY', text: 'text-red-300', ring: 'border-red-500/60 bg-red-500/10', chip: 'border-red-500/40 bg-red-500/15 text-red-300' },
};

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function MyMatchBets({ matchId, homeShort, awayShort, refreshSignal = 0, onChanged }: Props) {
  const [bets, setBets] = useState<MyBet[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOutcome, setEditOutcome] = useState<ApiOutcome>('HOME_WIN');
  const [editPoints, setEditPoints] = useState<number>(100);
  const [busyId, setBusyId] = useState<string | null>(null);

  const label = (o: ApiOutcome) => (o === 'HOME_WIN' ? homeShort : o === 'AWAY_WIN' ? awayShort : 'Nul');

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/bets/mine?matchId=${encodeURIComponent(matchId)}`);
      if (!res.ok) {
        setBets([]);
        return;
      }
      const json = (await res.json()) as { bets: MyBet[] };
      setBets(json.bets ?? []);
    } catch {
      setBets([]);
    }
  }, [matchId]);

  useEffect(() => {
    refetch();
  }, [refetch, refreshSignal]);

  // Tick 1s tant qu'au moins un pari est dans sa fenêtre — pour le compte à rebours.
  const editableCount = bets.filter((b) => new Date(b.editableUntil).getTime() > now).length;
  const tickRef = useRef(editableCount);
  tickRef.current = editableCount;
  useEffect(() => {
    if (tickRef.current === 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [editableCount === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (b: MyBet) => {
    setEditingId(b.id);
    setEditOutcome(b.outcome);
    setEditPoints(b.pointsWagered);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (b: MyBet) => {
    if (!Number.isInteger(editPoints) || editPoints < 1) {
      toast.error('Mise invalide');
      return;
    }
    setBusyId(b.id);
    (async () => {
      try {
        const res = await fetch(`/api/bets/${b.id}/modify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outcome: editOutcome, points: editPoints }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Échec de la modification');
        toast.success(`Pari modifié : ${editPoints.toLocaleString('fr-FR')} pts sur ${label(editOutcome)}`);
        setEditingId(null);
        await refetch();
        onChanged?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setBusyId(null);
      }
    })();
  };

  const cancelBet = (b: MyBet) => {
    setBusyId(b.id);
    (async () => {
      try {
        const res = await fetch(`/api/bets/${b.id}/cancel`, { method: 'POST' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Échec de l\'annulation');
        toast.success(`Pari annulé — ${Number(json.refunded).toLocaleString('fr-FR')} pts remboursés`);
        await refetch();
        onChanged?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setBusyId(null);
      }
    })();
  };

  if (bets.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-white/55">
        <Clock className="w-3.5 h-3.5 text-emerald-400/80" />
        Mes paris — modifiables 3 min
      </div>

      <ul className="space-y-2">
        {bets.map((b) => {
          const remaining = new Date(b.editableUntil).getTime() - now;
          const editable = remaining > 0;
          const ui = UI[b.outcome];
          const isEditing = editingId === b.id;
          const busy = busyId === b.id;

          return (
            <li
              key={b.id}
              className={cn(
                'rounded-xl border bg-white/[0.02] px-3.5 py-3',
                editable ? 'border-white/12' : 'border-white/[0.06] opacity-70'
              )}
            >
              {/* Ligne récap */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-md border text-[11px] font-mono font-black', ui.chip)}>
                    {ui.idx}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {label(b.outcome)}{' '}
                      <span className="text-white/40 font-mono text-[11px]">×{b.oddsAtPlacement.toFixed(2)}</span>
                    </div>
                    <div className="text-[11px] font-mono text-white/50 tabular-nums">
                      {b.pointsWagered.toLocaleString('fr-FR')} pts
                    </div>
                  </div>
                </div>

                {editable ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono tabular-nums">
                      <Clock className="w-3 h-3" /> {fmtCountdown(remaining)}
                    </span>
                    {!isEditing && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(b)}
                          disabled={busy}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-white/15 text-white/70 hover:bg-white/5 hover:text-white transition disabled:opacity-40"
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelBet(b)}
                          disabled={busy}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-red-500/30 text-red-300 hover:bg-red-500/10 transition disabled:opacity-40"
                          aria-label="Annuler le pari"
                          title="Annuler le pari"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35 shrink-0">Figé</span>
                )}
              </div>

              {/* Éditeur inline */}
              {isEditing && editable && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['HOME_WIN', 'DRAW', 'AWAY_WIN'] as ApiOutcome[]).map((o) => {
                      const m = UI[o];
                      const active = editOutcome === o;
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setEditOutcome(o)}
                          aria-pressed={active}
                          className={cn(
                            'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 transition',
                            active ? m.ring : 'border-white/10 hover:bg-white/5'
                          )}
                        >
                          <span className={cn('text-[10px] font-mono font-black', active ? m.text : 'text-white/45')}>{m.idx}</span>
                          <span className="text-[10px] font-mono text-white/55 truncate max-w-full">{label(o)}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-yellow-400/70 pointer-events-none" />
                      <Input
                        type="number"
                        min={1}
                        max={MAX_BET_POINTS}
                        value={editPoints}
                        onChange={(e) =>
                          setEditPoints(Math.max(1, Math.min(MAX_BET_POINTS, Number.parseInt(e.target.value || '0', 10) || 0)))
                        }
                        className="pl-8 h-9 bg-white/[0.02] border-white/15 text-white tabular-nums font-bold text-sm"
                      />
                    </div>
                    <div className="flex gap-1">
                      {PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEditPoints(p)}
                          className={cn(
                            'px-2 rounded-lg border text-[10px] font-mono font-bold transition',
                            editPoints === p ? 'bg-yellow-500/15 border-yellow-500/60 text-yellow-300' : 'border-white/10 text-white/60 hover:bg-white/5'
                          )}
                        >
                          {p >= 1000 ? `${p / 1000}k` : p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(b)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[11px] font-mono uppercase tracking-[0.18em] hover:bg-emerald-500/15 transition disabled:opacity-40"
                    >
                      <Check className="w-3.5 h-3.5" /> {busy ? 'Maj…' : 'Valider'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-white/60 text-[11px] font-mono uppercase tracking-[0.18em] hover:bg-white/5 transition disabled:opacity-40"
                    >
                      <X className="w-3.5 h-3.5" /> Annuler
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
