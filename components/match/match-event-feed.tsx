'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import {
  Goal,
  AlertTriangle,
  ArrowLeftRight,
  Megaphone,
  MessageSquare,
  Square,
  Trash2,
  Activity,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

export type MatchEvent = {
  id: string;
  type: string;
  minute: number | null;
  description: string | null;
  createdAt: string | Date;
  team: { id: string; name: string; shortName: string; logo: string | null } | null;
  player: {
    id: string;
    jerseyNumber: number;
    user: { name: string; username: string | null; avatar: string | null } | null;
  } | null;
};

const TYPE_META: Record<
  string,
  { label: string; Icon: typeof Goal; cls: string; ring: string; bg: string }
> = {
  MATCH_STARTED: {
    label: 'Coup d\'envoi',
    Icon: Megaphone,
    cls: 'text-emerald-300',
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  HALF_TIME: {
    label: 'Mi-temps',
    Icon: Megaphone,
    cls: 'text-yellow-300',
    ring: 'ring-yellow-500/30',
    bg: 'bg-yellow-500/10',
  },
  SECOND_HALF: {
    label: 'Reprise',
    Icon: Megaphone,
    cls: 'text-yellow-300',
    ring: 'ring-yellow-500/30',
    bg: 'bg-yellow-500/10',
  },
  MATCH_ENDED: {
    label: 'Coup de sifflet final',
    Icon: Megaphone,
    cls: 'text-red-300',
    ring: 'ring-red-500/30',
    bg: 'bg-red-500/10',
  },
  GOAL: {
    label: 'But !',
    Icon: Goal,
    cls: 'text-emerald-400',
    ring: 'ring-emerald-500/40',
    bg: 'bg-emerald-500/10',
  },
  OWN_GOAL: {
    label: 'CSC',
    Icon: Goal,
    cls: 'text-orange-300',
    ring: 'ring-orange-500/30',
    bg: 'bg-orange-500/10',
  },
  PENALTY_SCORED: {
    label: 'Penalty marqué',
    Icon: Goal,
    cls: 'text-emerald-400',
    ring: 'ring-emerald-500/40',
    bg: 'bg-emerald-500/10',
  },
  PENALTY_MISSED: {
    label: 'Penalty manqué',
    Icon: AlertTriangle,
    cls: 'text-yellow-300',
    ring: 'ring-yellow-500/30',
    bg: 'bg-yellow-500/10',
  },
  YELLOW_CARD: {
    label: 'Carton jaune',
    Icon: Square,
    cls: 'text-yellow-400',
    ring: 'ring-yellow-500/40',
    bg: 'bg-yellow-500/10',
  },
  RED_CARD: {
    label: 'Carton rouge',
    Icon: Square,
    cls: 'text-red-500',
    ring: 'ring-red-500/40',
    bg: 'bg-red-500/10',
  },
  SUBSTITUTION: {
    label: 'Remplacement',
    Icon: ArrowLeftRight,
    cls: 'text-blue-300',
    ring: 'ring-blue-500/30',
    bg: 'bg-blue-500/10',
  },
  COMMENT: {
    label: 'Commentaire',
    Icon: MessageSquare,
    cls: 'text-purple-300',
    ring: 'ring-purple-500/30',
    bg: 'bg-purple-500/10',
  },
};

function eventTitle(e: MatchEvent): string {
  const meta = TYPE_META[e.type];
  if (!meta) return e.type;
  if (e.player?.user?.name) return `${meta.label} — ${e.player.user.name}`;
  if (e.team?.shortName) return `${meta.label} — ${e.team.shortName}`;
  return meta.label;
}

export function MatchEventFeed({
  events,
  matchId,
  canManage = false,
}: {
  events: MatchEvent[];
  matchId: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = async (eventId: string) => {
    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/matches/${matchId}/events/${eventId}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur suppression');
        return;
      }
      toast.success('Event supprimé');
      router.replace(router.asPath, undefined, { scroll: false });
    } finally {
      setDeletingId(null);
    }
  };

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <Activity className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <div className="text-sm font-bold text-white/65">Pas d'événement publié</div>
        <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
          / le feed s'animera dès le coup d'envoi
        </div>
      </div>
    );
  }

  // Du plus récent au plus ancien
  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.04] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-emerald-300 font-bold">
            / Feed live · {events.length} événement{events.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-white/5 max-h-[560px] overflow-y-auto">
        {sorted.map((e) => {
          const meta = TYPE_META[e.type] ?? TYPE_META.COMMENT;
          const Icon = meta.Icon;
          return (
            <li key={e.id} className="flex items-start gap-3 px-5 py-3.5 group hover:bg-white/[0.025]">
              <div
                className={cn(
                  'shrink-0 w-10 h-10 rounded-xl ring-2 flex items-center justify-center',
                  meta.bg,
                  meta.ring
                )}
              >
                <Icon className={cn('w-4 h-4', meta.cls)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {e.minute != null && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-black/40 text-[10px] font-mono tabular-nums text-white/65">
                      <Clock className="w-2.5 h-2.5" />
                      {e.minute}'
                    </span>
                  )}
                  <span className="text-sm font-black text-white tracking-tight truncate">
                    {eventTitle(e)}
                  </span>
                  {e.team && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-[0.22em]',
                        meta.ring.replace('ring-', 'border-'),
                        meta.cls
                      )}
                    >
                      {e.team.shortName}
                    </span>
                  )}
                </div>
                {e.description && (
                  <div className="text-xs text-white/55 mt-1 leading-snug">{e.description}</div>
                )}
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-1">
                  {formatDistanceToNow(new Date(e.createdAt), { locale: fr, addSuffix: true })}
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => remove(e.id)}
                  disabled={deletingId === e.id}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all p-1"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
