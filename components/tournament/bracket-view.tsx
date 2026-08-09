'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Crown, Sparkles, Swords, CheckCircle2, Medal } from 'lucide-react';
import { useState } from 'react';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';

type MatchStage =
  | 'GROUP'
  | 'PLAYOFF'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

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
  ROUND_OF_32: { label: '16es de finale', code: 'R32' },
  ROUND_OF_16: { label: '8es de finale', code: 'R16' },
  QUARTER_FINAL: { label: 'Quarts', code: 'QF' },
  SEMI_FINAL: { label: 'Demies', code: 'SF' },
  FINAL: { label: 'Finale', code: 'F' },
};

// Ordre des tours de l'arbre, du plus large vers la finale.
const TREE_STAGES: MatchStage[] = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];

type Side = 'left' | 'right';
type Slot = BracketMatch | null;
type Round = { stage: MatchStage; meta: { label: string; code: string }; slots: Slot[] };

const decided = (m: BracketMatch) => m.homeScore != null && m.awayScore != null && !!m.winnerTeamId;

// ── Ligne d'une équipe ───────────────────────────────────────────────────────
function TeamRow({
  team,
  score,
  won,
  lost,
  matchDecided,
  compact,
}: {
  team: BracketTeam;
  score: number | null | undefined;
  won: boolean;
  lost: boolean;
  matchDecided: boolean;
  compact?: boolean;
}) {
  const logoSize = compact ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <div
      className={cn(
        'group/row relative flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-all duration-300',
        won && 'bg-linear-to-r from-amber-400/20 via-amber-400/10 to-transparent ring-1 ring-amber-400/40',
        lost && 'opacity-40 saturate-50',
        !matchDecided && 'bg-emerald-950/30'
      )}
    >
      {won && (
        <span className="absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      )}

      <div className="flex min-w-0 items-center gap-2">
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo}
            alt={team.name}
            className={cn(
              logoSize,
              'shrink-0 rounded-md object-cover ring-1 transition-all',
              won ? 'ring-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.35)]' : 'ring-white/10'
            )}
          />
        ) : (
          <div
            className={cn(
              logoSize,
              'flex shrink-0 items-center justify-center rounded-md font-black text-white ring-1',
              compact ? 'text-xs' : 'text-sm',
              won
                ? 'bg-linear-to-br from-amber-400 to-amber-600 ring-amber-400/60'
                : 'bg-linear-to-br from-emerald-500 to-emerald-700 ring-white/10'
            )}
          >
            {team.shortName?.charAt(0) ?? '?'}
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <span
            className={cn(
              'truncate font-extrabold leading-tight',
              compact ? 'text-[12px]' : 'text-sm',
              won ? 'text-amber-100' : 'text-white/90'
            )}
          >
            {team.name}
          </span>
          {!compact && (
            <span className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
              {team.shortName}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {won && <CheckCircle2 className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-amber-300')} />}
        {score != null && (
          <span
            className={cn(
              'min-w-[1.25rem] text-center font-black tabular-nums',
              compact ? 'text-base' : 'text-xl',
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
  compact,
}: {
  match: BracketMatch;
  isFinal: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  compact?: boolean;
}) {
  const matchDecided = match.homeScore != null && match.awayScore != null;
  const homeWon = matchDecided && match.winnerTeamId === match.homeTeam.id;
  const awayWon = matchDecided && match.winnerTeamId === match.awayTeam.id;
  const isChampionCard = isFinal && !!match.winnerTeamId;

  return (
    <div
      onMouseEnter={() => onHover(match.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border p-2 backdrop-blur-md transition-all duration-300',
        'bg-linear-to-b from-emerald-900/30 via-emerald-950/40 to-black/50',
        isHovered ? 'border-amber-400/40 shadow-xl shadow-emerald-950/50 scale-[1.015]' : 'border-emerald-500/15',
        isFinal && 'border-amber-400/40 shadow-lg shadow-amber-500/10',
        isChampionCard && 'border-amber-400/60 from-amber-900/25 via-emerald-950/40'
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-emerald-500/[0.03] to-transparent" />

      {(!compact || isFinal) && (
        <div className="relative mb-1.5 flex items-center justify-between px-1">
          {matchDecided ? (
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
      )}

      <div className="relative space-y-1">
        <TeamRow team={match.homeTeam} score={match.homeScore} won={homeWon} lost={awayWon} matchDecided={matchDecided} compact={compact} />
        <TeamRow team={match.awayTeam} score={match.awayScore} won={awayWon} lost={homeWon} matchDecided={matchDecided} compact={compact} />
      </div>

      {isChampionCard && <BorderBeam size={140} duration={6} colorFrom="#fbbf24" colorTo="#10b981" borderWidth={2} />}
    </div>
  );
}

// Emplacement d'un match pas encore généré (tour futur).
function PlaceholderCard({ compact, label = 'À déterminer' }: { compact?: boolean; label?: string }) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center rounded-2xl border border-dashed border-white/12 bg-black/25 text-center',
        compact ? 'min-h-[3.5rem] px-3 py-4' : 'min-h-[5rem] px-4 py-7'
      )}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/25">{label}</span>
    </div>
  );
}

// ── Connecteurs (lignes de l'arbre), orientés selon le bras ──────────────────
// Gouttière entre colonnes = gap-x-10 (2.5rem). Demi-connecteur = 1.25rem.
function Connectors({
  hasPrev,
  hasNext,
  mergeVertical,
  parity,
  feederDecided,
  side,
}: {
  hasPrev: boolean;
  hasNext: boolean;
  mergeVertical: boolean;
  parity: 0 | 1;
  feederDecided: boolean;
  side: Side;
}) {
  const lit = feederDecided;
  const line = lit ? 'bg-amber-400/70' : 'bg-emerald-300/25';
  const glow = lit ? 'shadow-[0_0_6px_rgba(251,191,36,0.6)]' : '';
  const isLeft = side === 'left';
  return (
    <>
      {hasPrev && (
        <span
          className={cn(
            'pointer-events-none absolute top-1/2 h-px w-[1.25rem] -translate-y-1/2 bg-emerald-300/25',
            isLeft ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
          )}
        />
      )}
      {hasNext && (
        <>
          {lit && (
            <span
              className={cn(
                'pointer-events-none absolute top-1/2 z-10 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]',
                isLeft ? 'right-0 translate-x-[0.35rem]' : 'left-0 -translate-x-[0.35rem]'
              )}
            />
          )}
          <span
            className={cn(
              'pointer-events-none absolute top-1/2 h-px w-[1.25rem] -translate-y-1/2',
              isLeft ? 'right-0 translate-x-full' : 'left-0 -translate-x-full',
              line,
              glow
            )}
          />
          {mergeVertical && (
            <span
              className={cn(
                'pointer-events-none absolute w-px',
                isLeft ? 'right-[-1.25rem]' : 'left-[-1.25rem]',
                line,
                glow,
                parity === 0 ? 'top-1/2 bottom-0' : 'top-0 bottom-1/2'
              )}
            />
          )}
        </>
      )}
    </>
  );
}

function ColHeader({ meta }: { meta: { label: string; code: string } }) {
  return (
    <div className="mb-4 flex h-8 items-center justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-950/40 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
        <span className="font-black">{meta.code}</span>
      </div>
    </div>
  );
}

// ── Un bras (gauche ou droite) ───────────────────────────────────────────────
function Arm({
  rounds,
  side,
  reduce,
  hovered,
  setHovered,
}: {
  rounds: Round[];
  side: Side;
  reduce: boolean | null;
  hovered: string | null;
  setHovered: (id: string | null) => void;
}) {
  return (
    <div className={cn('flex gap-x-10', side === 'right' && 'flex-row-reverse')}>
      {rounds.map((round, rIdx) => {
        const hasPrev = rIdx > 0; // le tour le plus large n'a pas d'arrivée
        const isLast = rIdx === rounds.length - 1; // SF : sort vers le centre, sans fusion interne
        return (
          <div key={`${round.stage}-${side}`} className="flex min-w-[11rem] flex-col">
            <ColHeader meta={round.meta} />
            <div className="flex flex-1 flex-col">
              {round.slots.map((slot, i) => {
                const parity = (i % 2) as 0 | 1;
                return (
                  <div key={slot?.id ?? `${round.stage}-${side}-${i}`} className="relative flex flex-1 items-center px-1 py-2">
                    <Connectors
                      hasPrev={hasPrev}
                      hasNext
                      mergeVertical={!isLast}
                      parity={parity}
                      feederDecided={slot ? decided(slot) : false}
                      side={side}
                    />
                    <motion.div
                      initial={reduce ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: rIdx * 0.1 + i * 0.05, duration: 0.4 }}
                      className="relative w-full"
                    >
                      {slot ? (
                        <MatchCard compact match={slot} isFinal={false} isHovered={hovered === slot.id} onHover={setHovered} />
                      ) : (
                        <PlaceholderCard compact />
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Colonne centrale : la finale (+ la petite finale si présente) ────────────
function CenterFinal({
  finalSlot,
  thirdPlace,
  hasArms,
  reduce,
  hovered,
  setHovered,
}: {
  finalSlot: Slot;
  thirdPlace: BracketMatch | null;
  hasArms: boolean;
  reduce: boolean | null;
  hovered: string | null;
  setHovered: (id: string | null) => void;
}) {
  return (
    <div className="flex min-w-[13rem] flex-col">
      <div className="mb-4 flex h-8 items-center justify-center">
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-linear-to-r from-amber-400/20 via-yellow-400/15 to-amber-500/20 px-4 py-1 font-mono text-[11px] font-black uppercase tracking-[0.28em] text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
        >
          <Sparkles className="h-3 w-3" /> Finale <Trophy className="h-3 w-3" />
        </motion.div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative flex w-full items-center px-1 py-2">
          {hasArms && (
            <>
              <span className="pointer-events-none absolute left-0 top-1/2 h-px w-[1.25rem] -translate-x-full -translate-y-1/2 bg-emerald-300/25" />
              <span className="pointer-events-none absolute right-0 top-1/2 h-px w-[1.25rem] translate-x-full -translate-y-1/2 bg-emerald-300/25" />
            </>
          )}

          <div className="relative w-full">
            {finalSlot?.winnerTeamId && (
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
            <div className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.12),transparent_70%)]" />
            {finalSlot ? (
              <MatchCard match={finalSlot} isFinal isHovered={hovered === finalSlot.id} onHover={setHovered} />
            ) : (
              <PlaceholderCard />
            )}
          </div>
        </div>

        <div className="mt-2 font-mono text-[10px] font-black uppercase tracking-[0.4em] text-amber-300/80">
          ◆ Champion ◆
        </div>

        {/* Petite finale (3e place) — sous la finale, comme sur un tableau Coupe du Monde */}
        {thirdPlace && (
          <div className="mt-6 w-full">
            <div className="mb-2 flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.28em] text-amber-600/80">
              <Medal className="h-3 w-3 text-amber-600" /> 3e place
            </div>
            <MatchCard compact match={thirdPlace} isFinal={false} isHovered={hovered === thirdPlace.id} onHover={setHovered} />
          </div>
        )}
      </div>
    </div>
  );
}

export function BracketView({ matches }: BracketViewProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  const playoffMatches = matches.filter((m) => m.stage === 'PLAYOFF');
  const thirdPlace = matches.find((m) => m.stage === 'THIRD_PLACE') ?? null;

  // Construit le SQUELETTE complet de l'arbre à partir du tour le plus large
  // présent, jusqu'à la finale — même si des tours ne sont pas encore générés
  // (ils s'affichent en « À déterminer »).
  const byStage: Record<string, BracketMatch[]> = {};
  for (const s of TREE_STAGES) byStage[s] = matches.filter((m) => m.stage === s);
  const startIdx = TREE_STAGES.findIndex((s) => byStage[s].length > 0);

  const treeRounds: Round[] = [];
  if (startIdx !== -1) {
    let expected = byStage[TREE_STAGES[startIdx]].length;
    for (let i = startIdx; i < TREE_STAGES.length; i++) {
      const stage = TREE_STAGES[i];
      const list = byStage[stage];
      const count = Math.max(expected, list.length);
      const slots: Slot[] = Array.from({ length: count }, (_, k) => list[k] ?? null);
      treeRounds.push({ stage, meta: ROUND_META[stage], slots });
      expected = Math.max(1, Math.ceil(expected / 2));
    }
  }

  const finalRound = treeRounds.find((r) => r.stage === 'FINAL') ?? null;
  const finalSlot: Slot = finalRound?.slots[0] ?? null;
  const armRoundsAll = treeRounds.filter((r) => r.stage !== 'FINAL');
  const hasArms = armRoundsAll.length > 0;

  const half = (n: number) => Math.ceil(n / 2);
  const leftRounds: Round[] = armRoundsAll.map((r) => ({ ...r, slots: r.slots.slice(0, half(r.slots.length)) }));
  const rightRounds: Round[] = armRoundsAll.map((r) => ({ ...r, slots: r.slots.slice(half(r.slots.length)) }));

  const hasTree = treeRounds.length > 0;
  if (!hasTree && playoffMatches.length === 0) return null;

  return (
    <div className="relative w-full overflow-x-auto rounded-3xl">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-b from-emerald-950/40 via-emerald-900/10 to-black/30" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_45%_55%_at_50%_45%,rgba(251,191,36,0.08),transparent)]" />

      {/* ── Barrages (repêchage des meilleurs 3es, avant l'arbre) ── */}
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

      {/* ── Arbre symétrique : bras gauche → finale ← bras droite ── */}
      {hasTree && (
        <div className="relative flex min-h-[26rem] min-w-max items-stretch justify-center gap-x-10 px-3 pb-8 pt-6">
          {hasArms && <Arm rounds={leftRounds} side="left" reduce={reduce} hovered={hovered} setHovered={setHovered} />}

          <CenterFinal
            finalSlot={finalSlot}
            thirdPlace={thirdPlace}
            hasArms={hasArms}
            reduce={reduce}
            hovered={hovered}
            setHovered={setHovered}
          />

          {hasArms && <Arm rounds={rightRounds} side="right" reduce={reduce} hovered={hovered} setHovered={setHovered} />}
        </div>
      )}
    </div>
  );
}
