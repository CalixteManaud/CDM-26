import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Flame, Radio, Trophy, Layers } from 'lucide-react';

import { cn } from '@/lib/utils';
import { MatchBetCard } from '@/components/betting/match-bet-card';

type Match = Parameters<typeof MatchBetCard>[0]['match'];

/**
 * Filtre client des matchs ouverts aux paris : par tournoi + bascule « en
 * direct ». Synchronise l'état avec l'URL (?tournoi=…&live=1) pour des liens
 * partageables, à la manière du filtre de /tournaments.
 */
export function OpenMatchesFilter({ matches }: { matches: Match[] }) {
  const router = useRouter();
  const [tournamentId, setTournamentId] = useState<string>('all');
  const [liveOnly, setLiveOnly] = useState(false);

  // Lit l'état initial depuis l'URL (au mount + sur navigation arrière/avant).
  useEffect(() => {
    const t = router.query.tournoi;
    const l = router.query.live;
    setTournamentId(typeof t === 'string' && t ? t : 'all');
    setLiveOnly(l === '1');
  }, [router.query.tournoi, router.query.live]);

  const tournaments = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const m of matches) {
      const cur = map.get(m.tournament.id);
      if (cur) cur.count += 1;
      else map.set(m.tournament.id, { id: m.tournament.id, name: m.tournament.name, count: 1 });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);

  const liveCount = useMemo(() => matches.filter((m) => m.status === 'LIVE').length, [matches]);

  const filtered = useMemo(
    () =>
      matches.filter(
        (m) =>
          (tournamentId === 'all' || m.tournament.id === tournamentId) &&
          (!liveOnly || m.status === 'LIVE')
      ),
    [matches, tournamentId, liveOnly]
  );

  // Pousse l'état dans l'URL sans recharger ni scroller.
  const syncUrl = (next: { tournoi?: string; live?: boolean }) => {
    const query: Record<string, string> = {};
    const t = next.tournoi ?? tournamentId;
    const l = next.live ?? liveOnly;
    if (t && t !== 'all') query.tournoi = t;
    if (l) query.live = '1';
    router.replace({ pathname: router.pathname, query }, undefined, { scroll: false, shallow: true });
  };

  // Pas de filtre utile si un seul tournoi et aucun live : on rend juste la grille.
  const showFilters = tournaments.length > 1 || liveCount > 0;

  return (
    <div>
      {showFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {tournaments.length > 1 && (
            <>
              <FilterPill
                active={tournamentId === 'all'}
                onClick={() => {
                  setTournamentId('all');
                  syncUrl({ tournoi: 'all' });
                }}
                icon={Layers}
                accent="emerald"
              >
                Tous <Count>{matches.length}</Count>
              </FilterPill>
              {tournaments.map((t) => (
                <FilterPill
                  key={t.id}
                  active={tournamentId === t.id}
                  onClick={() => {
                    setTournamentId(t.id);
                    syncUrl({ tournoi: t.id });
                  }}
                  icon={Trophy}
                  accent="yellow"
                >
                  <span className="max-w-[160px] truncate">{t.name}</span> <Count>{t.count}</Count>
                </FilterPill>
              ))}
              {liveCount > 0 && <span className="mx-1 h-5 w-px bg-white/10" />}
            </>
          )}
          {liveCount > 0 && (
            <FilterPill
              active={liveOnly}
              onClick={() => {
                const next = !liveOnly;
                setLiveOnly(next);
                syncUrl({ live: next });
              }}
              icon={Radio}
              accent="red"
              pulse={liveOnly}
            >
              En direct <Count>{liveCount}</Count>
            </FilterPill>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/2 p-12 text-center">
          <Flame className="h-10 w-10 text-white/15 mx-auto mb-4" />
          <div className="text-base font-bold text-white/70">Aucun match pour ce filtre</div>
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-white/40 mt-2">
            / essaie un autre tournoi ou retire le filtre « en direct »
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <MatchBetCard match={m} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 text-white/35 tabular-nums">{children}</span>;
}

const ACCENT_ACTIVE: Record<string, string> = {
  emerald: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
  yellow: 'border-yellow-400/50 bg-yellow-500/10 text-yellow-200',
  red: 'border-red-400/50 bg-red-500/10 text-red-200',
};

function FilterPill({
  active,
  onClick,
  icon: Icon,
  accent,
  pulse,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  accent: 'emerald' | 'yellow' | 'red';
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] transition-all',
        active
          ? ACCENT_ACTIVE[accent]
          : 'border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25 hover:text-white/85'
      )}
    >
      <Icon className={cn('h-3 w-3', pulse && 'animate-pulse')} />
      {children}
    </button>
  );
}
