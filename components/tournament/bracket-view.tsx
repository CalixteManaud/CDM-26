'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Crown, Sparkles, Swords, CheckCircle2 } from 'lucide-react';
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

const ROUND_META: Record<string, { label: string; code: string }> = {
  ROUND_OF_16: { label: '8es de finale', code: 'R16' },
  QUARTER_FINAL: { label: 'Quarts de finale', code: 'QF' },
  SEMI_FINAL: { label: 'Demi-finales', code: 'SF' },
  FINAL: { label: 'Finale', code: 'F' },
};

const TREE_ORDER: MatchStage[] = ['ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];

// ── Ligne d'une équipe ───────────────────────────────────────────────────────
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
        'group/row relative flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-300',
        won && 'bg-linear-to-r from-amber-400/20 via-amber-400/10 to-transparent ring-1 ring-amber-400/40',
        lost && 'opacity-40 saturate-50',
        !decided && 'bg-emerald-950/30'
      )}
    >
      {/* liseré or du qualifié */}
      {won && <span className="absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />}

      <div className="flex min-w-0 items-center gap-2.5">
        {team.logo ? (
          // user-uploaded logo → <img> natif (pas de facturation Vercel Image)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo}
            alt={team.name}
            className={cn(
              'h-9 w-9 shrink-0 rounded-md object-cover ring-1 transition-all',
              won ? 'ring-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.35)]' : 'ring-white/10'
            )}
          />
        ) : (
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-black text-white ring-1',
              won
                ? 'bg-linear-to-br from-amber-400 to-amber-600 ring-amber-400/60'
                : 'bg-linear-to-br from-emerald-500 to-emerald-700 ring-white/10'
            )}
          >
            {team.shortName?.charAt(0) ?? '?'}
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <span className={cn('truncate text-sm font-extrabold leading-tight', won ? 'text-amber-100' : 'text-white/90')}>
            {team.name}
          </span>
          <span className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
            {team.shortName}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {won && <CheckCircle2 className="h-3.5 w-3.5 text-amber-300" />}
        {score != null && (
          <span
            className={cn(
              'min-w-[1.5rem] text-center text-xl font-black tabular-nums',
              won ? 'text-amber-200' : 'text-white/35'
            )}
          >
            {score}
          </span>
        )}
      </div>
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
        'relative w-full overflow-hidden rounded-2xl border p-2.5 backdrop-blur-md transition-all duration-300',
        // base pelouse
        'bg-linear-to-b from-emerald-900/30 via-emerald-950/40 to-black/50',
        isHovered ? 'border-amber-400/40 shadow-xl shadow-emerald-950/50 scale-[1.015]' : 'border-emerald-500/15',
        isFinal && 'border-amber-400/40 shadow-lg shadow-amber-500/10',
        isChampionCard && 'border-amber-400/60 from-amber-900/25 via-emerald-950/40'
      )}
    >
      {/* texture de pelouse subtile */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-emerald-500/[0.03] to-transparent" />

      {/* en-tête : tour + statut */}
      <div className="relative mb-2 flex items-center justify-between px-1">
        {decided ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-300/80">
            <span className="h-1 w-1 rounded-full bg-emerald-400" /> Terminé
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-yellow-300">
            <Swords className="h-2.5 w-2.5" /> À jouer
          </span>
        )}
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/20">VS</span>
      </div>

      <div className="relative space-y-1.5">
        <TeamRow team={match.homeTeam} score={match.homeScore} won={homeWon} lost={awayWon} decided={decided} />
        <TeamRow team={match.awayTeam} score={match.awayScore} won={awayWon} lost={homeWon} decided={decided} />
      </div>

      {isChampionCard && (
        <BorderBeam size={140} duration={6} colorFrom="#fbbf24" colorTo="#10b981" borderWidth={2} />
      )}
    </div>
  );
}

// ── Connecteurs (lignes de l'arbre) ──────────────────────────────────────────
// Gouttière entre colonnes = gap-x-14 (3.5rem). Chaque demi-connecteur fait 1.75rem.
// Le chemin s'illumine en OR dès que l'équipe qualifiée est connue (feederDecided).
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
  const lit = feederDecided;
  const line = lit ? 'bg-amber-400/70' : 'bg-emerald-300/12';
  const glow = lit ? 'shadow-[0_0_6px_rgba(251,191,36,0.6)]' : '';
  return (
    <>
      {/* arrivée depuis le tour précédent */}
      {hasPrev && (
        <span className="pointer-events-none absolute left-0 top-1/2 h-px w-[1.75rem] -translate-x-full -translate-y-1/2 bg-emerald-300/12" />
      )}
      {/* départ vers le tour suivant */}
      {hasNext && (
        <>
          {/* point de départ lumineux */}
          {lit && (
            <span className="pointer-events-none absolute right-0 top-1/2 z-10 h-1.5 w-1.5 -translate-y-1/2 translate-x-[0.4rem] rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          )}
          {/* segment horizontal sortant */}
          <span className={cn('pointer-events-none absolute right-0 top-1/2 h-px w-[1.75rem] translate-x-full -translate-y-1/2', line, glow)} />
          {/* demi-segment vertical : haut de paire descend, bas de paire monte */}
          <span
            className={cn(
              'pointer-events-none absolute right-[-1.75rem] w-px',
              line,
              glow,
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
    <div className="relative w-full overflow-x-auto rounded-3xl">
      {/* ── Terrain : dégradé pelouse + halo or au centre ── */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-b from-emerald-950/40 via-emerald-900/10 to-black/30" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_60%_50%_at_85%_50%,rgba(251,191,36,0.08),transparent)]" />

      {/* ── Barrages (repêchage des meilleurs 3es) ── */}
      {playoffMatches.length > 0 && (
        <div className="relative mb-10 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-blue-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
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
        <div className="relative flex min-h-[28rem] min-w-max gap-x-14 px-3 pb-8 pt-5">
          {treeRounds.map((round, rIdx) => {
            const hasPrev = rIdx > 0;
            const hasNext = rIdx < treeRounds.length - 1;
            const isFinalCol = round.stage === 'FINAL';

            return (
              <div key={round.stage} className={cn('flex min-w-[17rem] flex-1 flex-col', isFinalCol && 'min-w-[19rem]')}>
                {/* en-tête de colonne (hauteur fixe → aligne les zones de matchs) */}
                <div className="mb-5 flex h-9 items-center justify-center">
                  {isFinalCol ? (
                    <motion.div
                      animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-linear-to-r from-amber-400/20 via-yellow-400/15 to-amber-500/20 px-5 py-1.5 font-mono text-[12px] font-black uppercase tracking-[0.3em] text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Finale <Trophy className="h-3.5 w-3.5" />
                    </motion.div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-950/40 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                      <span className="font-black">{round.meta.code}</span>
                      <span className="text-emerald-500/40">·</span>
                      <span className="text-emerald-100/70">{round.meta.label}</span>
                    </div>
                  )}
                </div>

                {/* zone des matchs : slots de hauteur égale (flex-1) → centrage auto entre les deux feeders */}
                <div className="flex flex-1 flex-col">
                  {round.list.map((match, i) => {
                    const parity = (i % 2) as 0 | 1;
                    const feederDecided = match.homeScore != null && match.awayScore != null && !!match.winnerTeamId;
                    return (
                      <div key={match.id} className="relative flex flex-1 items-center px-1 py-2.5">
                        <Connectors hasPrev={hasPrev} hasNext={hasNext} parity={parity} feederDecided={feederDecided} />

                        <div className="relative w-full">
                          {/* podium doré + couronne du champion au-dessus de la finale gagnée */}
                          {isFinalCol && match.winnerTeamId && (
                            <motion.div
                              initial={reduce ? false : { scale: 0, rotate: -160 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', duration: 0.9 }}
                              className="absolute -top-11 left-1/2 z-20 -translate-x-1/2"
                            >
                              <div className="relative">
                                <div className="absolute inset-0 animate-pulse rounded-full bg-amber-400 opacity-50 blur-xl" />
                                <Crown className="relative h-11 w-11 text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.7)]" />
                              </div>
                            </motion.div>
                          )}

                          {/* lueur de scène derrière la finale */}
                          {isFinalCol && (
                            <div className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.12),transparent_70%)]" />
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
