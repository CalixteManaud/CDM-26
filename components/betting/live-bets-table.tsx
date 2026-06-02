import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, CheckCircle2, X, Clock, AlertTriangle, Flame, Coins } from 'lucide-react';

import { cn } from '@/lib/utils';

export type FeedRow = {
  id: string;
  kind: '1x2' | 'market';
  createdAt: string | Date;
  pointsWagered: number;
  odds: number;
  status: string;
  user: { twitchUsername: string | null; username: string | null };
  context: string;
  pick: string;
  tone: 'emerald' | 'yellow' | 'red' | 'purple';
};

const TONE: Record<FeedRow['tone'], string> = {
  emerald: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5',
  yellow: 'text-yellow-300 border-yellow-500/30 bg-yellow-500/5',
  red: 'text-red-300 border-red-500/30 bg-red-500/5',
  purple: 'text-purple-300 border-purple-500/30 bg-purple-500/5',
};

const STATUS: Record<string, { icon: typeof Clock; cls: string; label: string }> = {
  PENDING: { icon: Clock, cls: 'text-white/45', label: 'En cours' },
  WON: { icon: CheckCircle2, cls: 'text-emerald-400', label: 'Gagné' },
  LOST: { icon: X, cls: 'text-red-400/70', label: 'Perdu' },
  VOID: { icon: AlertTriangle, cls: 'text-white/40', label: 'Annulé' },
  CREDIT_FAILED: { icon: AlertTriangle, cls: 'text-orange-400', label: 'Échec' },
  CANCELED: { icon: X, cls: 'text-white/40', label: 'Annulé' },
};

const WHALE_THRESHOLD = 5000;

// Grille partagée header / lignes — doit rester identique des deux côtés
const COLS = 'md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.7fr)_6.5rem_4.5rem_5.5rem] md:gap-4 md:items-center';

function anonymize(u: FeedRow['user']): string {
  if (u.twitchUsername) return `@${u.twitchUsername}`;
  if (u.username) return u.username;
  return 'anonyme';
}

function Row({ bet, isNew, reduce }: { bet: FeedRow; isNew: boolean; reduce: boolean | null }) {
  const status = STATUS[bet.status] ?? STATUS.PENDING;
  const StatusIcon = status.icon;
  const whale = bet.pointsWagered >= WHALE_THRESHOLD;

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={reduce ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'relative px-4 py-2.5 transition-colors',
        whale ? 'bg-yellow-500/[0.04]' : 'hover:bg-white/[0.03]'
      )}
    >
      {/* flash d'arrivée d'un nouveau pari */}
      {isNew && !reduce && (
        <motion.span
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className={cn(
            'pointer-events-none absolute inset-0',
            whale ? 'bg-yellow-400/15' : 'bg-emerald-400/10'
          )}
        />
      )}
      {whale && <span className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-linear-to-b from-yellow-400 to-amber-600" />}

      <div className={cn('relative flex flex-col gap-1.5', COLS)}>
        {/* PARIEUR */}
        <div className="flex min-w-0 items-center gap-2">
          <StatusIcon className={cn('h-3.5 w-3.5 shrink-0', status.cls)} />
          <span className="truncate font-mono text-[12px] text-white/90">{anonymize(bet.user)}</span>
          <span
            className={cn(
              'shrink-0 rounded px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.18em]',
              bet.kind === 'market' ? 'bg-purple-500/10 text-purple-300' : 'bg-white/5 text-white/40'
            )}
          >
            {bet.kind === 'market' ? 'Marché' : '1X2'}
          </span>
        </div>

        {/* PARI + CONTEXTE */}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={cn('w-fit max-w-full truncate rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider', TONE[bet.tone])}>
            {bet.pick}
          </span>
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
            {bet.context}
          </span>
        </div>

        {/* MISE */}
        <div className="flex items-center gap-1 md:justify-end">
          {whale && <Flame className="h-3 w-3 text-yellow-400" />}
          <span className={cn('text-sm font-black tabular-nums', whale ? 'text-yellow-300' : 'text-yellow-400')}>
            {bet.pointsWagered.toLocaleString('fr-FR')}
          </span>
          <span className="font-mono text-[9px] uppercase text-white/40 md:hidden">pts</span>
        </div>

        {/* COTE */}
        <div className="font-mono text-[11px] tabular-nums text-white/55 md:text-right">
          ×{bet.odds.toFixed(2)}
        </div>

        {/* QUAND */}
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 md:text-right">
          {formatDistanceToNowStrict(new Date(bet.createdAt), { locale: fr })}
        </div>
      </div>
    </motion.li>
  );
}

export function LiveBetsTable({
  initial,
  live = true,
  limit = 40,
  pollMs = 6000,
}: {
  initial: FeedRow[];
  live?: boolean;
  limit?: number;
  pollMs?: number;
}) {
  const reduce = useReducedMotion();
  const [bets, setBets] = useState<FeedRow[]>(initial);
  const [paused, setPaused] = useState(false);
  const seenRef = useRef<Set<string>>(new Set(initial.map((b) => b.id)));
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!live) return;

    let active = true;
    let controller: AbortController | null = null;

    const tick = async () => {
      if (document.hidden) return;
      controller = new AbortController();
      try {
        const res = await fetch(`/api/bets/recent?limit=${limit}`, { signal: controller.signal });
        if (!res.ok) return;
        const json = (await res.json()) as { success: boolean; data?: FeedRow[] };
        if (!active || !json.success || !json.data) return;

        const fresh = json.data.filter((b) => !seenRef.current.has(b.id)).map((b) => b.id);
        if (fresh.length > 0) {
          fresh.forEach((id) => seenRef.current.add(id));
          setNewIds(new Set(fresh));
          // on efface le marqueur "nouveau" après l'animation
          setTimeout(() => active && setNewIds(new Set()), 1800);
        }
        setBets(json.data);
      } catch {
        // réseau / abort → on garde l'état courant, pas de crash
      }
    };

    const interval = setInterval(() => {
      if (!paused) tick();
    }, pollMs);

    // refresh immédiat à la reprise de focus
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      clearInterval(interval);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [live, limit, pollMs, paused]);

  if (bets.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
        <Activity className="mx-auto mb-3 h-8 w-8 text-white/20" />
        <div className="font-mono text-sm uppercase tracking-[0.24em] text-white/40">/ pas encore de mise</div>
        <div className="mt-2 font-mono text-xs text-white/30">place ton pari depuis la page d&apos;un match</div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* barre de titre + indicateur live */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-purple-300">
          <Coins className="h-3.5 w-3.5" />
          / dernières mises
        </div>
        {live ? (
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
            <span className="relative flex h-2 w-2">
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live
          </div>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">flux</span>
        )}
      </div>

      {/* en-tête de colonnes (desktop) */}
      <div className={cn('hidden border-b border-white/5 bg-white/[0.015] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-white/35', COLS)}>
        <span>Parieur</span>
        <span>Pari · contexte</span>
        <span className="md:text-right">Mise</span>
        <span className="md:text-right">Cote</span>
        <span className="md:text-right">Quand</span>
      </div>

      {/* corps scrollable — supporte beaucoup de lignes */}
      <ul className="max-h-[560px] divide-y divide-white/5 overflow-y-auto">
        <AnimatePresence initial={false} mode="popLayout">
          {bets.map((bet) => (
            <Row key={bet.id} bet={bet} isNew={newIds.has(bet.id)} reduce={reduce} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
