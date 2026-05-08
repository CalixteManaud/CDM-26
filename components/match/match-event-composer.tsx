'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Goal,
  AlertTriangle,
  Square,
  ArrowLeftRight,
  Flag,
  MessageSquare,
  Loader2,
  Send,
  Clock,
  Megaphone,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EventType =
  | 'MATCH_STARTED'
  | 'HALF_TIME'
  | 'SECOND_HALF'
  | 'MATCH_ENDED'
  | 'GOAL'
  | 'OWN_GOAL'
  | 'PENALTY_SCORED'
  | 'PENALTY_MISSED'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SUBSTITUTION'
  | 'COMMENT';

type Team = { id: string; name: string; shortName: string };
type Player = { id: string; jerseyNumber: number; user: { name: string } };

const EVENT_OPTIONS: Array<{
  type: EventType;
  label: string;
  Icon: typeof Goal;
  cls: string;
  needsTeam: boolean;
  needsPlayer: boolean;
}> = [
  { type: 'GOAL', label: 'But', Icon: Goal, cls: 'text-emerald-300', needsTeam: true, needsPlayer: true },
  { type: 'OWN_GOAL', label: 'But contre son camp', Icon: Goal, cls: 'text-orange-300', needsTeam: true, needsPlayer: true },
  { type: 'PENALTY_SCORED', label: 'Penalty marqué', Icon: Goal, cls: 'text-emerald-300', needsTeam: true, needsPlayer: true },
  { type: 'PENALTY_MISSED', label: 'Penalty manqué', Icon: AlertTriangle, cls: 'text-yellow-300', needsTeam: true, needsPlayer: true },
  { type: 'YELLOW_CARD', label: 'Carton jaune', Icon: Square, cls: 'text-yellow-400', needsTeam: true, needsPlayer: true },
  { type: 'RED_CARD', label: 'Carton rouge', Icon: Square, cls: 'text-red-500', needsTeam: true, needsPlayer: true },
  { type: 'SUBSTITUTION', label: 'Remplacement', Icon: ArrowLeftRight, cls: 'text-blue-300', needsTeam: true, needsPlayer: false },
  { type: 'HALF_TIME', label: 'Mi-temps', Icon: Megaphone, cls: 'text-white/65', needsTeam: false, needsPlayer: false },
  { type: 'SECOND_HALF', label: 'Reprise 2e période', Icon: Megaphone, cls: 'text-white/65', needsTeam: false, needsPlayer: false },
  { type: 'COMMENT', label: 'Commentaire libre', Icon: MessageSquare, cls: 'text-purple-300', needsTeam: false, needsPlayer: false },
];

export function MatchEventComposer({
  matchId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
}: {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
}) {
  const router = useRouter();
  const [type, setType] = useState<EventType>('GOAL');
  const [teamSide, setTeamSide] = useState<'HOME' | 'AWAY'>('HOME');
  const [playerId, setPlayerId] = useState<string>('');
  const [minute, setMinute] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const meta = EVENT_OPTIONS.find((o) => o.type === type) ?? EVENT_OPTIONS[0];
  const players = teamSide === 'HOME' ? homePlayers : awayPlayers;
  const team = teamSide === 'HOME' ? homeTeam : awayTeam;

  const reset = () => {
    setMinute('');
    setPlayerId('');
    setDescription('');
  };

  const submit = async () => {
    if (meta.needsTeam && !team) {
      toast.error('Sélectionne une équipe');
      return;
    }
    if (meta.needsPlayer && !playerId) {
      toast.error('Sélectionne un joueur');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          minute: minute || null,
          teamId: meta.needsTeam ? team.id : null,
          playerId: meta.needsPlayer ? playerId : null,
          description: description || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur');
        return;
      }
      toast.success(`Event publié — ${meta.label}`);
      reset();
      router.replace(router.asPath, undefined, { scroll: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
          <Flag className="w-4 h-4 text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-purple-300 mb-1.5">
            § Console événements
          </div>
          <h3 className="text-base md:text-lg font-black text-white tracking-tight">
            Publier un événement
          </h3>
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/40 mt-1">
            / chaque event toast tous les viewers en direct
          </p>
        </div>
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {EVENT_OPTIONS.map((opt) => {
          const Icon = opt.Icon;
          const active = type === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => setType(opt.type)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-[0.2em] transition-all',
                active
                  ? 'bg-white/8 border-white/20 text-white'
                  : 'border-white/10 text-white/45 hover:text-white/80 hover:bg-white/4'
              )}
            >
              <Icon className={cn('w-3 h-3', active ? opt.cls : 'text-white/40')} />
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
        {meta.needsTeam ? (
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 font-bold">
              Équipe
            </label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => {
                  setTeamSide('HOME');
                  setPlayerId('');
                }}
                className={cn(
                  'px-3 py-2 rounded-lg border text-[11px] font-mono uppercase tracking-[0.2em] transition-all',
                  teamSide === 'HOME'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'border-white/10 text-white/55 hover:bg-white/3'
                )}
              >
                {homeTeam.shortName}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTeamSide('AWAY');
                  setPlayerId('');
                }}
                className={cn(
                  'px-3 py-2 rounded-lg border text-[11px] font-mono uppercase tracking-[0.2em] transition-all',
                  teamSide === 'AWAY'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'border-white/10 text-white/55 hover:bg-white/3'
                )}
              >
                {awayTeam.shortName}
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:block" />
        )}

        {meta.needsPlayer ? (
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 font-bold">
              Joueur ({team.shortName})
            </label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger className="mt-1.5 bg-white/5 border-white/15">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {players.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    #{p.jerseyNumber} {p.user.name}
                  </SelectItem>
                ))}
                {players.length === 0 && (
                  <SelectItem value="_" disabled>
                    Aucun joueur
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="hidden md:block" />
        )}

        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 font-bold flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-yellow-400" />
            Minute
          </label>
          <Input
            type="number"
            min={0}
            max={130}
            placeholder="ex 45"
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            className="mt-1.5 w-24 bg-white/5 border-white/15 font-mono text-base"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 font-bold">
          Commentaire (optionnel)
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ex : Ouverture du score sur un coup-franc magnifique"
          className="mt-1.5 bg-white/5 border-white/15 text-sm min-h-[60px]"
        />
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          onClick={reset}
          className="text-white/55 hover:text-white text-[11px] font-mono uppercase tracking-[0.22em]"
        >
          Reset
        </Button>
        <Button
          onClick={submit}
          disabled={submitting}
          className="bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-[0.18em] text-xs disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Publier — {meta.label}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
