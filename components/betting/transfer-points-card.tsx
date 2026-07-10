'use client';

import { useCallback, useEffect, useState } from 'react';
import { Send, Loader2, Gift, ArrowUpRight, ArrowDownLeft, History } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const MAX_TRANSFER_POINTS = 100_000;

type TransferRow = {
  id: string;
  direction: 'in' | 'out';
  amount: number;
  note: string | null;
  status: string;
  createdAt: string;
  counterparty: string;
};

type Props = {
  /** Solde Wizebot courant — sert à borner le montant et afficher un hint. */
  balance?: number | null;
  /** Appelé après un transfert réussi (rafraîchit le solde côté parent). */
  onDone?: () => void;
};

/**
 * Donne une partie de ses points de chaîne Wizebot à un autre user CDM 26.
 * POST /api/profile/transfer → débit expéditeur + crédit destinataire.
 */
export function TransferPointsCard({ balance, onDone }: Props) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<TransferRow[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/transfers');
      if (!res.ok) return;
      const json = (await res.json()) as { transfers: TransferRow[] };
      setHistory(json.transfers ?? []);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const points = Number.parseInt(amount, 10);
  const amountValid = Number.isInteger(points) && points >= 1 && points <= MAX_TRANSFER_POINTS;
  const overBalance = typeof balance === 'number' && Number.isFinite(points) && points > balance;
  const canSubmit = recipient.trim().length > 0 && amountValid && !overBalance && !submitting;

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/profile/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipient.trim(),
          points,
          note: note.trim() || null,
        }),
      });
      const json: {
        success?: boolean;
        error?: string;
        amount?: number;
        recipient?: { username: string | null; twitchUsername: string };
      } = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Transfert impossible');
        return;
      }

      const who = json.recipient?.username ?? json.recipient?.twitchUsername ?? recipient.trim();
      toast.success(`🎁 ${(json.amount ?? points).toLocaleString('fr-FR')} pts envoyés à ${who} !`);
      setRecipient('');
      setAmount('');
      setNote('');
      onDone?.();
      loadHistory();
    } catch {
      toast.error('Erreur réseau / serveur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl p-5 border border-emerald-500/30 bg-linear-to-br from-emerald-950/30 via-black to-emerald-950/10 mb-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-400/70 mb-0.5">
            Donner des points
          </div>
          <p className="text-xs text-white/55 leading-snug">
            Envoie une partie de tes points à un autre membre pour qu&apos;il puisse parier.
          </p>
        </div>
      </div>

      {/* Pas de <form> ici : ce composant est monté dans le <form> du profil,
          et imbriquer deux <form> casse l'hydratation + rattache ce bouton au
          form parent. On gère l'envoi via onClick + Enter à la main. */}
      <div
        className="space-y-3"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            submit();
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="transfer-recipient" className="text-[10px] font-mono text-white/55 uppercase tracking-[0.25em]">
            Destinataire
          </Label>
          <Input
            id="transfer-recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="pseudo CDM 26 ou username Twitch"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="transfer-amount" className="text-[10px] font-mono text-white/55 uppercase tracking-[0.25em]">
              Montant (pts)
            </Label>
            {typeof balance === 'number' && (
              <button
                type="button"
                onClick={() => setAmount(String(Math.min(balance, MAX_TRANSFER_POINTS)))}
                className="text-[10px] font-mono text-emerald-400/70 hover:text-emerald-300 uppercase tracking-[0.2em]"
              >
                Solde : {balance.toLocaleString('fr-FR')}
              </button>
            )}
          </div>
          <Input
            id="transfer-amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_TRANSFER_POINTS}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="ex: 500"
            className="h-11 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white tabular-nums"
          />
          {overBalance ? (
            <p className="text-[10px] font-mono text-red-400 uppercase tracking-[0.2em]">
              Montant supérieur à ton solde
            </p>
          ) : (
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
              1 à {MAX_TRANSFER_POINTS.toLocaleString('fr-FR')} pts par transfert
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transfer-note" className="text-[10px] font-mono text-white/55 uppercase tracking-[0.25em]">
            Message (optionnel)
          </Label>
          <Input
            id="transfer-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="un petit mot…"
            maxLength={200}
            className="h-11 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
          />
        </div>

        <Button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.18em] text-xs h-12 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi…
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer les points
            </>
          )}
        </Button>
      </div>

      {history.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 mb-3">
            <History className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/45">
              Mes transferts
            </span>
          </div>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto">
            {history.map((t) => {
              const incoming = t.direction === 'in';
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg grid place-items-center shrink-0 border',
                      incoming
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-white/60'
                    )}
                  >
                    {incoming ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white/80 truncate">
                      {incoming ? 'Reçu de' : 'Envoyé à'}{' '}
                      <span className="font-bold text-white">{t.counterparty}</span>
                    </div>
                    <div className="text-[10px] font-mono text-white/35">
                      {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {t.status !== 'COMPLETED' && (
                        <span className="ml-1.5 text-amber-400/80">· {t.status}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-black tabular-nums shrink-0',
                      incoming ? 'text-emerald-400' : 'text-white/70'
                    )}
                  >
                    {incoming ? '+' : '−'}
                    {t.amount.toLocaleString('fr-FR')}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
