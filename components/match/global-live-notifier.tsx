'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';

const STORAGE_KEY = 'cdm26.liveNotif.lastSeen.v1';
const SEEN_IDS_KEY = 'cdm26.liveNotif.seenIds.v1';
const POLL_MS = 8_000;
const SEEN_IDS_MAX = 200; // garde un cap à la mémoire localStorage

type ApiEvent = {
  id: string;
  type: string;
  minute: number | null;
  description: string | null;
  createdAt: string;
  match: {
    id: string;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    homeTeam: { id: string; name: string; shortName: string; logo: string | null };
    awayTeam: { id: string; name: string; shortName: string; logo: string | null };
  };
  team: { id: string; name: string; shortName: string; logo: string | null } | null;
  player: {
    id: string;
    jerseyNumber: number;
    user: { name: string; username: string | null; avatar: string | null } | null;
  } | null;
};

type Tone = 'success' | 'warning' | 'error' | 'info';

const TYPE_META: Record<string, { label: string; emoji: string; tone: Tone }> = {
  MATCH_STARTED: { label: 'Coup d\'envoi', emoji: '🟢', tone: 'success' },
  HALF_TIME: { label: 'Mi-temps', emoji: '⏸', tone: 'info' },
  SECOND_HALF: { label: 'Reprise — 2e période', emoji: '▶️', tone: 'info' },
  MATCH_ENDED: { label: 'Coup de sifflet final', emoji: '🏁', tone: 'info' },
  GOAL: { label: 'BUT !', emoji: '⚽️', tone: 'success' },
  OWN_GOAL: { label: 'But contre son camp', emoji: '😬', tone: 'warning' },
  PENALTY_SCORED: { label: 'Penalty marqué', emoji: '🎯', tone: 'success' },
  PENALTY_MISSED: { label: 'Penalty manqué', emoji: '😱', tone: 'warning' },
  YELLOW_CARD: { label: 'Carton jaune', emoji: '🟨', tone: 'warning' },
  RED_CARD: { label: 'Carton rouge', emoji: '🟥', tone: 'error' },
  SUBSTITUTION: { label: 'Remplacement', emoji: '🔄', tone: 'info' },
  COMMENT: { label: 'Info match', emoji: '🎙', tone: 'info' },
};

function buildToast(e: ApiEvent): { title: string; description: string; tone: Tone } {
  const meta = TYPE_META[e.type] ?? TYPE_META.COMMENT;
  const homeTeam = e.match.homeTeam.shortName;
  const awayTeam = e.match.awayTeam.shortName;
  const score =
    e.match.homeScore != null && e.match.awayScore != null
      ? ` (${e.match.homeScore}-${e.match.awayScore})`
      : '';

  // Titre = match (qui est qui), description = détail event
  // ex: "🇫🇷 FRA vs MAR — ⚽️ BUT !"
  const title = `${meta.emoji} ${homeTeam} vs ${awayTeam}${score}`;

  const detailParts: string[] = [meta.label];
  if (e.minute != null) detailParts.push(`${e.minute}'`);
  if (e.player?.user?.name) {
    const playerStr = `${e.player.user.name}`;
    const teamSide = e.team?.shortName ? ` (${e.team.shortName})` : '';
    detailParts.push(`${playerStr}${teamSide}`);
  } else if (e.team?.shortName) {
    detailParts.push(e.team.shortName);
  }
  if (e.description) detailParts.push(e.description);

  return {
    title,
    description: detailParts.join(' · '),
    tone: meta.tone,
  };
}

function loadSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function persistSeenIds(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    // Cap à SEEN_IDS_MAX en gardant les plus récents (les derniers ajoutés)
    let arr = Array.from(set);
    if (arr.length > SEEN_IDS_MAX) {
      arr = arr.slice(arr.length - SEEN_IDS_MAX);
    }
    window.localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

// Sécurité : on ne replay jamais les events de plus de 3 min, même si
// localStorage contient un curseur très ancien (cas d'onglet inactif depuis
// des heures). Évite un flood de toasts au retour.
const MAX_REPLAY_MS = 3 * 60 * 1000;

function loadLastSeen(): string {
  const fallback = new Date().toISOString(); // par défaut : maintenant (rien ne replay)
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const stored = new Date(raw).getTime();
    if (!Number.isFinite(stored)) return fallback;
    const oldest = Date.now() - MAX_REPLAY_MS;
    return new Date(Math.max(stored, oldest)).toISOString();
  } catch {
    return fallback;
  }
}

function persistLastSeen(iso: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    // ignore
  }
}

/**
 * Composant invisible monté globalement (pages/_app.tsx). Sonde toutes
 * les 8 secondes /api/live/events?since=<lastSeen> et toast les nouveaux
 * events de TOUS les matchs en cours, peu importe la page de l'user.
 *
 * Dédoublonnage côté client : on garde un cache d'IDs vus en localStorage
 * pour ne pas re-toaster un event après refresh de la page.
 */
export function GlobalLiveNotifier() {
  const router = useRouter();
  const lastSeenRef = useRef<string>('');
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Init from storage (uniquement au premier mount)
    if (!initRef.current) {
      lastSeenRef.current = loadLastSeen();
      seenIdsRef.current = loadSeenIds();
      initRef.current = true;
    }

    let cancelled = false;

    const tick = async () => {
      if (cancelled || (typeof document !== 'undefined' && document.hidden)) return;
      try {
        const url = `/api/live/events?since=${encodeURIComponent(lastSeenRef.current)}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { events: ApiEvent[]; serverTime: string };
        const fresh = (json.events ?? []).filter((e) => !seenIdsRef.current.has(e.id));

        for (const e of fresh) {
          seenIdsRef.current.add(e.id);
          const { title, description, tone } = buildToast(e);
          const navigateAction = {
            label: 'Voir le match',
            onClick: () => router.push(`/matches/${e.match.id}`),
          };
          // Durée plus longue pour les events "majeurs"
          const duration =
            e.type === 'GOAL' ||
            e.type === 'PENALTY_SCORED' ||
            e.type === 'RED_CARD' ||
            e.type === 'MATCH_STARTED' ||
            e.type === 'MATCH_ENDED'
              ? 8000
              : 5500;

          if (tone === 'success') {
            toast.success(title, { description, duration, action: navigateAction });
          } else if (tone === 'warning') {
            toast.warning(title, { description, duration, action: navigateAction });
          } else if (tone === 'error') {
            toast.error(title, { description, duration, action: navigateAction });
          } else {
            toast.info(title, { description, duration, action: navigateAction });
          }
        }

        // Avance le curseur même si fresh est vide, pour suivre serverTime
        const newCursor =
          fresh.length > 0
            ? new Date(fresh[fresh.length - 1].createdAt).toISOString()
            : json.serverTime;
        lastSeenRef.current = newCursor;
        persistLastSeen(newCursor);
        if (fresh.length > 0) persistSeenIds(seenIdsRef.current);
      } catch {
        // réseau down → on retentera au tick suivant
      }
    };

    // Premier tick rapide (1s) pour rattraper les events ratés au load
    const kick = window.setTimeout(tick, 1000);
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(kick);
      window.clearInterval(id);
    };
  }, [router]);

  return null;
}
