'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Crown, Sparkles, Swords } from 'lucide-react';
import { useState } from 'react';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';

type MatchStage = 'GROUP' | 'PLAYOFF' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';

export type BracketTeam = {
  id: string;
  name: string;
  shortName: string;
  logo?: string | null;
};

export type BracketMatch = {
  id: string;
  homeTeam: BracketTeam;
  awayTeam: BracketTeam;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerTeamId?: string | null;
  stage: MatchStage | string;
};

interface BracketViewProps {
  matches: BracketMatch[];
}

const ROUND_META: Record<string, { label: string; code: string; dot: string; chip: string }> = {
  ROUND_OF_16: { label: '8es de finale', code: 'R16', dot: 'bg-emerald-400', chip: 'text-emerald-300 border-emerald-500/30' },
  QUARTER_FINAL: { label: 'Quarts', code: 'QF', dot: 'bg-yellow-400', chip: 'text-yellow-300 border-yellow-500/30' },
  SEMI_FINAL: { label: 'Demi-finales', code: 'SF', dot: 'bg-orange-400', chip: 'text-orange-300 border-orange-500/30' },
  FINAL: { label: 'Finale', code: 'F', dot: 'bg-red-400', chip: 'text-red-300 border-red-500/30' },
};

const TREE_ORDER: MatchStage[] = ['ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];

// ── Carte d'un match ────────────────────────────────────────────────────────
function TeamRow({
  team,
  score,
  won,
  lost,
  decided,
}: {
  team: BracketTeam;
  score: number | null | undefined;
  won: boolean;
  lost: boolean;
  decided: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2.5 rounded-md px-3 py-2 transition-colors',
        won && 'bg-emerald-500/12 ring-1 ring-emerald-500/30',
        lost && 'opacity-45',
        !decided && 'bg-white/[0.03]'
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {team.logo ? (
          // user-uploaded logo → <img> natif (pas de facturation Vercel Image)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo}
            alt={team.name}
            className="h-7 w-7 shrink-0 rounded-md object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-emerald-500 to-emerald-700 text-xs font-black text-white ring-1 ring-white/10">
            {team.shortName?.charAt(0) ?? '?'}
          </div>
        )}
        <span className={cn('truncate text-sm font-bold', won ? 'text-emerald-200' : 'text-white/85')}>
          {team.name}
        </span>
      </div>
      {score != null && (
        <span className={cn('shrink-0 text-lg font-black tabular-nums', won ? 'text-emerald-200' : 'text-white/40')}>
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({
  match,
  isFinal,
  isHovered,
  onHover,
}: {
  match: BracketMatch;
  isFinal: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const decided = match.homeScore != null && match.awayScore != null;
  const homeWon = decided && match.winnerTeamId === match.homeTeam.id;
  const awayWon = decided && match.winnerTeamId === match.awayTeam.id;
  const isChampionCard = isFinal && !!match.winnerTeamId;

  return (
    <div
      onMouseEnter={() => onHover(match.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border bg-linear-to-b from-white/[0.05] to-white/[0.01] p-2.5 backdrop-blur-sm transition-all duration-300',
        isHovered ? 'border-white/30 shadow-lg shadow-black/30' : 'border-white/10',
        isChampionCard && 'border-yellow-500/40'
      )}
    >
      {/* en-tête : code + statut */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">
          #{match.id.slice(0, 5)}
        </span>
        {decided ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">Terminé</span>
        ) : (
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em] text-yellow-300/90">
            <Swords className="h-2.5 w-2.5" /> À venir
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <TeamRow team={match.homeTeam} score={match.homeScore} won={homeWon} lost={awayWon} decided={decided} />
        <TeamRow team={match.awayTeam} score={match.awayScore} won={awayWon} lost={homeWon} decided={decided} />
      </div>

      {isChampionCard && (
        <BorderBeam size={120} duration={7} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1.5} />
      )}
    </div>
  );
}

// ── Connecteurs (lignes de l'arbre) ──────────────────────────────────────────
// Gouttière entre colonnes = gap-x-12 (3rem). Chaque demi-connecteur fait 1.5rem.
function Connectors({
  hasPrev,
  hasNext,
  parity,
  feederDecided,
}: {
  hasPrev: boolean;
  hasNext: boolean;
  parity: 0 | 1;
  feederDecided: boolean;
}) {
  const line = feederDecided ? 'bg-emerald-500/40' : 'bg-white/12';
  return (
    <>
      {/* arrivée depuis le tour précédent */}
      {hasPrev && (
        <span className="pointer-events-none absolute left-0 top-1/2 h-px w-[1.5rem] -translate-x-full -translate-y-1/2 bg-white/12" />
      )}
      {/* départ vers le tour suivant */}
      {hasNext && (
        <>
          {/* segment horizontal sortant */}
          <span className={cn('pointer-events-none absolute right-0 top-1/2 h-px w-[1.5rem] translate-x-full -translate-y-1/2', line)} />
          {/* demi-segment vertical : haut de paire descend, bas de paire monte */}
          <span
            className={cn(
              'pointer-events-none absolute right-[-1.5rem] w-px',
              line,
              parity === 0 ? 'top-1/2 bottom-0' : 'top-0 bottom-1/2'
            )}
          />
        </>
      )}
    </>
  );
}

export function BracketView({ matches }: BracketViewProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  const playoffMatches = matches.filter((m) => m.stage === 'PLAYOFF');
  const treeRounds = TREE_ORDER.map((stage) => ({
    stage,
    meta: ROUND_META[stage],
    list: matches.filter((m) => m.stage === stage),
  })).filter((r) => r.list.length > 0);

  if (treeRounds.length === 0 && playoffMatches.length === 0) return null;

  return (
    <div className="relative w-full overflow-x-auto">
      {/* halo d'ambiance */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-r from-emerald-500/[0.04] via-yellow-500/[0.04] to-red-500/[0.05]" />

      {/* ── Barrages (repêchage des meilleurs 3es) ── */}
      {playoffMatches.length > 0 && (
        <div className="relative mb-10 rounded-2xl border border-blue-500/20 bg-blue-500/[0.03] p-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span>Barrages · repêchage des meilleurs 3es</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {playoffMatches.map((m, i) => (
              <motion.div
                key={m.id}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="w-full max-w-[18rem] flex-1"
              >
                <div className="mb-1.5 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-blue-300/70">
                  {i < playoffMatches.length - 1 || playoffMatches.length < 3 ? `Barrage ½ · ${i + 1}` : 'Finale des barrages'}
                </div>
                <MatchCard match={m} isFinal={false} isHovered={hovered === m.id} onHover={setHovered} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Arbre principal ── */}
      {treeRounds.length > 0 && (
        <div className="relative flex min-h-[26rem] min-w-max gap-x-12 px-2 pb-6 pt-4">
          {treeRounds.map((round, rIdx) => {
            const hasPrev = rIdx > 0;
            const hasNext = rIdx < treeRounds.length - 1;
            const isFinalCol = round.stage === 'FINAL';

            return (
              <div key={round.stage} className="flex min-w-[16rem] flex-1 flex-col">
                {/* en-tête de colonne (hauteur fixe → aligne les zones de matchs) */}
                <div className="mb-4 flex h-7 items-center justify-center">
                  {isFinalCol ? (
                    <motion.div
                      animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-linear-to-r from-yellow-500/15 via-amber-500/15 to-red-500/15 px-4 py-1 font-mono text-[11px] font-black uppercase tracking-[0.28em] text-yellow-200"
                    >
                      <Sparkles className="h-3 w-3" /> Finale <Trophy className="h-3 w-3" />
                    </motion.div>
                  ) : (
                    <div className={cn('inline-flex items-center gap-2 rounded-full border bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]', round.meta.chip)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', round.meta.dot)} />
                      <span>{round.meta.code}</span>
                      <span className="text-white/25">·</span>
                      <span>{round.meta.label}</span>
                    </div>
                  )}
                </div>

                {/* zone des matchs : slots de hauteur égale (flex-1) → centrage auto entre les deux feeders */}
                <div className="flex flex-1 flex-col">
                  {round.list.map((match, i) => {
                    const parity = (i % 2) as 0 | 1;
                    const feederDecided = match.homeScore != null && match.awayScore != null && !!match.winnerTeamId;
                    return (
                      <div key={match.id} className="relative flex flex-1 items-center px-1 py-2">
                        <Connectors hasPrev={hasPrev} hasNext={hasNext} parity={parity} feederDecided={feederDecided} />

                        <div className="relative w-full">
                          {/* couronne du champion au-dessus de la finale gagnée */}
                          {isFinalCol && match.winnerTeamId && (
                            <motion.div
                              initial={reduce ? false : { scale: 0, rotate: -160 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', duration: 0.9 }}
                              className="absolute -top-9 left-1/2 z-10 -translate-x-1/2"
                            >
                              <div className="relative">
                                <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-400 opacity-50 blur-xl" />
                                <Crown className="relative h-9 w-9 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
                              </div>
                            </motion.div>
                          )}

                          <motion.div
                            initial={reduce ? false : { opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: rIdx * 0.12 + i * 0.06, duration: 0.45 }}
                          >
                            <MatchCard
                              match={match}
                              isFinal={isFinalCol}
                              isHovered={hovered === match.id}
                              onHover={setHovered}
                            />
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
