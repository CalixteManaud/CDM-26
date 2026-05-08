'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Goal,
  Megaphone,
  Square,
  ArrowLeftRight,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

import type { MatchEvent } from './match-event-feed';

const TYPE_TOAST: Record<
  string,
  { label: string; emoji: string; Icon: typeof Goal; tone: 'success' | 'warning' | 'error' | 'info' }
> = {
  MATCH_STARTED: { label: 'Coup d\'envoi !', emoji: '🟢', Icon: Megaphone, tone: 'success' },
  HALF_TIME: { label: 'Mi-temps', emoji: '⏸', Icon: Megaphone, tone: 'info' },
  SECOND_HALF: { label: 'Reprise — 2e période', emoji: '▶️', Icon: Megaphone, tone: 'info' },
  MATCH_ENDED: { label: 'Coup de sifflet final', emoji: '🏁', Icon: Megaphone, tone: 'info' },
  GOAL: { label: 'BUT !', emoji: '⚽️', Icon: Goal, tone: 'success' },
  OWN_GOAL: { label: 'But contre son camp', emoji: '😬', Icon: Goal, tone: 'warning' },
  PENALTY_SCORED: { label: 'Penalty marqué !', emoji: '🎯', Icon: Goal, tone: 'success' },
  PENALTY_MISSED: { label: 'Penalty manqué', emoji: '😱', Icon: AlertTriangle, tone: 'warning' },
  YELLOW_CARD: { label: 'Carton jaune', emoji: '🟨', Icon: Square, tone: 'warning' },
  RED_CARD: { label: 'Carton rouge', emoji: '🟥', Icon: Square, tone: 'error' },
  SUBSTITUTION: { label: 'Remplacement', emoji: '🔄', Icon: ArrowLeftRight, tone: 'info' },
  COMMENT: { label: 'Info match', emoji: '🎙', Icon: MessageSquare, tone: 'info' },
};

function eventBody(e: MatchEvent): string {
  const parts: string[] = [];
  if (e.minute != null) parts.push(`${e.minute}'`);
  if (e.player?.user?.name) parts.push(e.player.user.name);
  else if (e.team?.shortName) parts.push(e.team.shortName);
  if (e.description) parts.push(e.description);
  return parts.join(' · ');
}

export function MatchLiveNotifier({
  matchId,
  status,
  initialEvents,
  intervalMs = 5_000,
}: {
  matchId: string;
  status: string;
  initialEvents: MatchEvent[];
  intervalMs?: number;
}) {
  // On initialise le curseur sur le timestamp du dernier event connu
  const lastSeenRef = useRef<string>(
    initialEvents.length > 0
      ? new Date(initialEvents[initialEvents.length - 1].createdAt).toISOString()
      : new Date(Date.now() - 1).toISOString()
  );
  const seenIdsRef = useRef<Set<string>>(new Set(initialEvents.map((e) => e.id)));

  useEffect(() => {
    // On ne notifie que pendant un match LIVE — sinon on n'a aucun intérêt à
    // marteler l'API toutes les 5 secondes.
    if (status !== 'LIVE') return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || (typeof document !== 'undefined' && document.hidden)) return;
      try {
        const res = await fetch(
          `/api/matches/${matchId}/events?since=${encodeURIComponent(lastSeenRef.current)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const json = (await res.json()) as { events: MatchEvent[] };
        const fresh = (json.events ?? []).filter((e) => !seenIdsRef.current.has(e.id));
        if (fresh.length === 0) return;

        for (const e of fresh) {
          seenIdsRef.current.add(e.id);
          const meta = TYPE_TOAST[e.type] ?? TYPE_TOAST.COMMENT;
          const title = `${meta.emoji}  ${meta.label}`;
          const body = eventBody(e);
          if (meta.tone === 'success') toast.success(title, { description: body, duration: 6000 });
          else if (meta.tone === 'warning') toast.warning(title, { description: body, duration: 6000 });
          else if (meta.tone === 'error') toast.error(title, { description: body, duration: 7000 });
          else toast.info(title, { description: body, duration: 5000 });
        }

        // Avance le curseur sur le dernier event reçu
        const last = fresh[fresh.length - 1];
        lastSeenRef.current = new Date(last.createdAt).toISOString();
      } catch {
        // Réseau down → on retentera au tick suivant
      }
    };

    const id = window.setInterval(tick, intervalMs);
    // Petit kick initial après mount pour rattraper d'éventuels events ratés
    const t = window.setTimeout(tick, 800);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(t);
    };
  }, [matchId, status, intervalMs]);

  return null;
}
