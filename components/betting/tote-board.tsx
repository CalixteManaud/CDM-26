'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useReducedMotion } from 'framer-motion';
import { Radio, ChevronRight } from 'lucide-react';

import { computeLiveOdds } from '@/lib/utils/odds';
import { FlapNumber } from '@/components/betting/flap-number';
import type { MatchBetCard } from '@/components/betting/match-bet-card';

type Match = Parameters<typeof MatchBetCard>[0]['match'];

const STAGE_CODE: Record<string, string> = {
  GROUP: 'GS',
  PLAYOFF: 'PO',
  ROUND_OF_16: 'R16',
  QUARTER_FINAL: 'QF',
  SEMI_FINAL: 'SF',
  FINAL: 'F',
};

function PoolMiniBar({
  pool,
}: {
  pool: { totalHomePool: number; totalDrawPool: number; totalAwayPool: number };
}) {
  const h = Number(pool.totalHomePool);
  const d = Number(pool.totalDrawPool);
  const a = Number(pool.totalAwayPool);
  const t = h + d + a;
  if (t === 0) return <div className="h-1 rounded-full bg-white/[0.06]" />;
  const pct = (n: number) => `${(n / t) * 100}%`;
  return (
    <div className="flex h-1 overflow-hidden rounded-full bg-white/[0.06]">
      {h > 0 && <div className="bg-emerald-400/80" style={{ width: pct(h) }} />}
      {d > 0 && <div className="bg-[var(--tote-amber)]/80" style={{ width: pct(d) }} />}
      {a > 0 && <div className="bg-red-400/80" style={{ width: pct(a) }} />}
    </div>
  );
}

function BoardRow({ match, animate }: { match: Match; animate: boolean }) {
  const pool = match.bettingPool;
  const odds = pool ? computeLiveOdds(pool) : { home: null, draw: null, away: null };
  const total = pool
    ? Number(pool.totalHomePool) + Number(pool.totalDrawPool) + Number(pool.totalAwayPool)
    : 0;
  const live = match.status === 'LIVE';
  const fmt = (o: number | null) => (o != null ? o.toFixed(2) : '—');

  const cols: Array<{ key: string; label: string; value: string }> = [
    { key: '1', label: match.homeTeam.shortName, value: fmt(odds.home) },
    { key: 'X', label: 'Nul', value: fmt(odds.draw) },
    { key: '2', label: match.awayTeam.shortName, value: fmt(odds.away) },
  ];

  return (
    <Link
      href={`/paris?bet=${match.id}`}
      className="group block border-t border-white/[0.07] px-3 py-3 transition-colors hover:bg-[var(--tote-amber)]/[0.05] md:px-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        {/* Rencontre */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="ff-board shrink-0 rounded border border-white/12 bg-black/40 px-1.5 py-0.5 text-[10px] tracking-[0.18em] text-white/55">
            {STAGE_CODE[match.stage] ?? match.stage}
          </span>
          <div className="min-w-0">
            <div className="ff-display truncate text-lg font-bold uppercase leading-none tracking-wide text-[var(--tote-chalk)]">
              {match.homeTeam.shortName}
              <span className="mx-1.5 text-white/25">v</span>
              {match.awayTeam.shortName}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/35">
              {live ? (
                <span className="inline-flex items-center gap-1 text-red-300">
                  <span className="tote-lamp inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  Direct
                </span>
              ) : (
                <span className="ff-board text-white/45">
                  {format(new Date(match.matchDate), "dd MMM · HH'h'mm", { locale: fr })}
                </span>
              )}
              <span className="text-white/15">·</span>
              <span className="truncate max-w-[140px]">{match.tournament.name}</span>
            </div>
          </div>
        </div>

        {/* Cotes 1 X 2 en cellules clapet */}
        <div className="flex items-end gap-2.5 sm:gap-3.5">
          {cols.map((c) => (
            <div key={c.key} className="flex flex-col items-center gap-1">
              <span className="ff-board text-[9px] uppercase tracking-[0.2em] text-white/35">
                <span className="text-white/55">{c.key}</span> {c.label}
              </span>
              <span className="text-base sm:text-lg">
                <FlapNumber value={c.value} animate={animate} />
              </span>
            </div>
          ))}
        </div>

        {/* Cagnotte */}
        <div className="flex items-center gap-3 md:w-[150px] md:flex-col md:items-end md:gap-1.5">
          <div className="flex-1 md:w-full">
            <div className="ff-board text-right text-sm font-bold tabular-nums text-emerald-300">
              {total.toLocaleString('fr-FR')}
              <span className="ml-1 text-[10px] font-normal text-white/35">pts</span>
            </div>
            <div className="mt-1 w-full md:w-full">
              <PoolMiniBar
                pool={pool ?? { totalHomePool: 0, totalDrawPool: 0, totalAwayPool: 0 }}
              />
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--tote-amber)]" />
        </div>
      </div>
    </Link>
  );
}

export function ToteBoard({ matches }: { matches: Match[] }) {
  const reduce = useReducedMotion();
  const [armed, setArmed] = useState(false);

  // « Power-on » : on déclenche le settle des cellules juste après le montage.
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  const animate = !reduce && armed;

  // Les rencontres les plus actives en tête (plus grosse cagnotte), puis imminentes.
  const rows = [...matches]
    .sort((a, b) => {
      const pa = a.bettingPool
        ? a.bettingPool.totalHomePool + a.bettingPool.totalDrawPool + a.bettingPool.totalAwayPool
        : 0;
      const pb = b.bettingPool
        ? b.bettingPool.totalHomePool + b.bettingPool.totalDrawPool + b.bettingPool.totalAwayPool
        : 0;
      if (pb !== pa) return pb - pa;
      return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
    })
    .slice(0, 6);

  const liveCount = matches.filter((m) => m.status === 'LIVE').length;

  return (
    <div className="relative">
      {/* En-tête — thèse */}
      <div className="flex items-center gap-2.5">
        <span className="tote-lamp inline-block h-2 w-2 rounded-full bg-[var(--tote-amber)] [box-shadow:0_0_10px_2px_rgba(251,191,36,.6)]" />
        <span className="ff-board text-[11px] uppercase tracking-[0.3em] text-[var(--tote-amber)]/90">
          Pari mutuel · pas de bookmaker
        </span>
      </div>
      <h1 className="ff-display mt-4 text-6xl font-black uppercase leading-[0.86] tracking-tight text-[var(--tote-chalk)] md:text-8xl">
        La cote
        <br />
        est <span className="text-[var(--tote-amber)] [text-shadow:0_0_30px_rgba(251,191,36,.35)]">vivante</span>
      </h1>
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/55 md:text-base">
        Les cotes ne sont pas fixées par une maison : c&apos;est l&apos;argent de la foule, redistribué en
        direct. Chaque mise les fait bouger. Tu joues contre les autres viewers, avec tes points de chaîne.
      </p>

      {/* Le tableau */}
      <div className="mt-9 overflow-hidden rounded-2xl border border-white/12 bg-[var(--tote-raised)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        {/* Rail supérieur du tableau */}
        <div className="flex items-center justify-between border-b border-white/12 bg-black/30 px-4 py-2.5">
          <span className="ff-board text-[11px] uppercase tracking-[0.26em] text-white/55">Tableau des cotes</span>
          <span className="ff-board flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/40">
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-red-300">
                <Radio className="h-3 w-3" /> {liveCount} en direct
              </span>
            )}
            <span>{matches.length} ouverts</span>
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <div className="ff-display text-2xl font-bold uppercase tracking-wide text-white/45">
              Tableau éteint
            </div>
            <p className="ff-board mt-2 text-[11px] uppercase tracking-[0.22em] text-white/30">
              Aucun marché ouvert — les cotes s&apos;allument avant chaque match
            </p>
          </div>
        ) : (
          <div>
            {rows.map((m) => (
              <BoardRow key={m.id} match={m} animate={animate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
