'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, X, Hash, Loader2, MessageSquare, ShieldQuestion } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getUserDisplayName } from '@/lib/utils/display';

export type ReviewRequest = {
  id: string;
  desiredJersey: number;
  desiredPosition: string;
  message: string | null;
  createdAt: string;
  user: { id: string; name: string; username: string | null; email: string; avatar: string | null };
  team: { id: string; name: string; shortName: string; logo: string | null };
  tournament: { id: string; name: string };
};

const POSITIONS = [
  { value: 'GK', label: 'Gardien' },
  { value: 'DEF', label: 'Défenseur' },
  { value: 'MID', label: 'Milieu' },
  { value: 'ATT', label: 'Attaquant' },
] as const;

const POSITION_LABEL: Record<string, string> = {
  GK: 'Gardien',
  DEF: 'Défenseur',
  MID: 'Milieu',
  ATT: 'Attaquant',
};

export function JoinRequestsReview({
  requests,
  showTeam = false,
}: {
  requests: ReviewRequest[];
  /** true dans la vue admin agrégée (plusieurs équipes) */
  showTeam?: boolean;
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState<ReviewRequest | null>(null);
  const [rejecting, setRejecting] = useState<ReviewRequest | null>(null);
  const [busy, setBusy] = useState(false);

  // Champs de la modale d'acceptation (préremplis avec la proposition du joueur)
  const [jersey, setJersey] = useState('');
  const [position, setPosition] = useState<string>('ATT');
  const [note, setNote] = useState('');

  const openAccept = (r: ReviewRequest) => {
    setJersey(String(r.desiredJersey));
    setPosition(r.desiredPosition);
    setNote('');
    setAccepting(r);
  };
  const openReject = (r: ReviewRequest) => {
    setNote('');
    setRejecting(r);
  };

  const submitAccept = async () => {
    if (!accepting) return;
    const n = Number(jersey);
    if (!jersey || Number.isNaN(n) || n < 1 || n > 99) {
      toast.error('Numéro de maillot invalide (1-99)');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/join-requests/${accepting.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', jerseyNumber: n, position, note }),
      });
      const json: { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Impossible d'accepter la demande");
        return;
      }
      toast.success(`${getUserDisplayName(accepting.user)} a rejoint ${accepting.team.name}`);
      setAccepting(null);
      router.replace(router.asPath);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setBusy(false);
    }
  };

  const submitReject = async () => {
    if (!rejecting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/join-requests/${rejecting.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', note }),
      });
      const json: { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Impossible de refuser la demande');
        return;
      }
      toast.success('Demande refusée');
      setRejecting(null);
      router.replace(router.asPath);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setBusy(false);
    }
  };

  if (requests.length === 0) {
    return (
      <Card className="relative overflow-hidden bg-white/2 border-white/10 py-16 text-center">
        <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-5 mx-auto">
          <ShieldQuestion className="w-12 h-12 text-white/40" />
        </div>
        <h3 className="text-2xl font-black text-white tracking-tight mb-2">Aucune demande en attente</h3>
        <p className="text-white/55">Les nouvelles demandes d&apos;adhésion apparaîtront ici.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((r) => (
          <Card key={r.id} className="relative overflow-hidden bg-white/2 border-white/10 p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Candidat */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-full bg-white/5 border border-white/15 grid place-items-center text-sm font-black text-white/80 shrink-0 overflow-hidden">
                  {r.user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getUserDisplayName(r.user).slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-white tracking-tight truncate">
                    {getUserDisplayName(r.user)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-[10px] font-mono uppercase tracking-[0.2em]">
                      {POSITION_LABEL[r.desiredPosition] ?? r.desiredPosition}
                    </Badge>
                    <Badge className="bg-white/5 border-white/15 text-white/70 text-[10px] font-mono uppercase tracking-[0.2em]">
                      <Hash className="w-3 h-3 mr-0.5" />
                      {String(r.desiredJersey).padStart(2, '0')}
                    </Badge>
                    {showTeam && (
                      <Link href={`/teams/${r.team.id}`}>
                        <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 text-[10px] font-mono uppercase tracking-[0.2em] cursor-pointer hover:bg-purple-500/15">
                          {r.team.name}
                        </Badge>
                      </Link>
                    )}
                  </div>
                  {r.message && (
                    <p className="text-xs text-white/55 mt-1.5 flex items-start gap-1.5">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-white/35" />
                      <span className="line-clamp-2">{r.message}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => openReject(r)}
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-500/50 font-black uppercase tracking-[0.16em] text-[10px]"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Refuser
                </Button>
                <Button
                  onClick={() => openAccept(r)}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-[0.16em] text-[10px]"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Accepter
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* MODALE ACCEPTATION */}
      <Dialog open={!!accepting} onOpenChange={(o) => !o && setAccepting(null)}>
        <DialogContent className="sm:max-w-lg bg-black border-white/15">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Valider l&apos;adhésion
            </DialogTitle>
            <DialogDescription className="text-white/55">
              {accepting && (
                <>
                  Ajoute <strong className="text-white">{getUserDisplayName(accepting.user)}</strong> à{' '}
                  <strong className="text-white">{accepting.team.name}</strong>. Tu peux ajuster le poste et le
                  numéro proposés avant de confirmer.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">Poste</Label>
              <div className="grid grid-cols-4 gap-2">
                {POSITIONS.map((p) => {
                  const active = position === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPosition(p.value)}
                      className={`py-2.5 rounded-lg border text-[11px] font-black uppercase tracking-[0.12em] transition ${
                        active
                          ? 'bg-emerald-500 text-black border-transparent'
                          : 'bg-white/2 border-white/15 text-white/70 hover:border-white/30'
                      }`}
                    >
                      {p.value}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accept-jersey" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                Numéro de maillot
              </Label>
              <Input
                id="accept-jersey"
                type="number"
                min={1}
                max={99}
                value={jersey}
                onChange={(e) => setJersey(e.target.value)}
                className="h-14 text-3xl font-black text-center tabular-nums bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accept-note" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                Note (optionnelle)
              </Label>
              <Input
                id="accept-note"
                type="text"
                maxLength={280}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Bienvenue dans l'équipe !"
                className="h-11 bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAccepting(null)}
              disabled={busy}
              className="border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs"
            >
              Annuler
            </Button>
            <Button
              onClick={submitAccept}
              disabled={busy}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-[0.18em] text-xs"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE REFUS */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md bg-black border-white/15">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <X className="w-4 h-4 text-red-400" />
              Refuser la demande
            </DialogTitle>
            <DialogDescription className="text-white/55">
              {rejecting && (
                <>
                  Refuser la demande de <strong className="text-white">{getUserDisplayName(rejecting.user)}</strong>{' '}
                  pour {rejecting.team.name}. Un motif peut être communiqué au candidat.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label htmlFor="reject-note" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
              Motif (optionnel)
            </Label>
            <Input
              id="reject-note"
              type="text"
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Effectif complet à ton poste…"
              className="mt-2 h-11 bg-black/40 border-white/10 focus:border-red-500/50 text-white"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejecting(null)}
              disabled={busy}
              className="border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs"
            >
              Annuler
            </Button>
            <Button
              onClick={submitReject}
              disabled={busy}
              className="bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-[0.18em] text-xs"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />}
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
