'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  Trophy,
  RefreshCw,
  Play,
  Pause,
  ArrowRight,
  ChevronRight,
  Crown,
  CircleDot,
  Zap,
  Lock,
  AlertTriangle,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BorderBeam } from '@/components/ui/border-beam';
import { Ripple } from '@/components/ui/ripple';
import { ShimmerButton } from '@/components/ui/shimmer-button';

import type { DrawPageProps, DrawTeam, DrawGroup } from '@/pages/tournaments/[id]/draw';

// ─────────────────────────────────────────────────────────────────────────────
// Constants — timing in ms, divided by speed multiplier
// ─────────────────────────────────────────────────────────────────────────────

const LIFT_MS = 650;
const REVEAL_MS = 1300;
const PLACE_MS = 650;
const GAP_MS = 250;

const SPEED_PRESETS = [
  { value: '1', label: '1×', note: 'cérémonie' },
  { value: '1.6', label: '1.6×', note: 'standard' },
  { value: '2.5', label: '2.5×', note: 'rapide' },
  { value: '5', label: '5×', note: 'éclair' },
] as const;

const POT_ACCENTS = [
  { ring: 'border-emerald-500/40', bg: 'from-emerald-950/30', text: 'text-emerald-300', from: '#10b981', to: '#facc15' },
  { ring: 'border-yellow-500/40', bg: 'from-yellow-950/30', text: 'text-yellow-300', from: '#facc15', to: '#dc2626' },
  { ring: 'border-red-500/40', bg: 'from-red-950/30', text: 'text-red-300', from: '#dc2626', to: '#a855f7' },
  { ring: 'border-purple-500/40', bg: 'from-purple-950/30', text: 'text-purple-300', from: '#a855f7', to: '#10b981' },
  { ring: 'border-cyan-500/40', bg: 'from-cyan-950/30', text: 'text-cyan-300', from: '#06b6d4', to: '#facc15' },
  { ring: 'border-fuchsia-500/40', bg: 'from-fuchsia-950/30', text: 'text-fuchsia-300', from: '#d946ef', to: '#10b981' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Pot = { index: number; teams: DrawTeam[] };
type DrawStep = { teamId: string; potIndex: number; groupIndex: number };

/**
 * Répartit les équipes en `potCount` chapeaux équilibrés. Random.
 */
function allocatePots(teams: DrawTeam[], potCount: number): Pot[] {
  if (potCount <= 0) return [];
  const shuffled = shuffle(teams);
  const perPot = Math.ceil(shuffled.length / potCount);
  const pots: Pot[] = [];
  for (let i = 0; i < potCount; i++) {
    pots.push({
      index: i,
      teams: shuffled.slice(i * perPot, (i + 1) * perPot),
    });
  }
  return pots;
}

/**
 * Construit la séquence : pour chaque chapeau, chaque équipe tirée part dans
 * un groupe successif (A, B, C, …). Format FIFA / UCL.
 */
function buildSequence(pots: Pot[], groupCount: number): DrawStep[] {
  const seq: DrawStep[] = [];
  for (const pot of pots) {
    const order = shuffle(pot.teams);
    for (let g = 0; g < groupCount && g < order.length; g++) {
      seq.push({ teamId: order[g].id, potIndex: pot.index, groupIndex: g });
    }
  }
  return seq;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'running' | 'paused' | 'complete' | 'submitting' | 'done';
type Step = 'lift' | 'reveal' | 'place' | 'gap';

export function DrawCeremony({ tournament, groups, teams }: DrawPageProps) {
  const router = useRouter();
  const potCount = Math.max(1, tournament.teamsPerGroup);
  const groupCount = Math.max(1, tournament.groupCount);

  // Pots aléatoires — re-shufflables avant de lancer.
  const [pots, setPots] = useState<Pot[]>(() => allocatePots(teams, potCount));
  const sequence = useMemo(() => buildSequence(pots, groupCount), [pots, groupCount]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState<Step>('lift');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assignments, setAssignments] = useState<Array<{ teamId: string; groupId: string }>>([]);
  const [speed, setSpeed] = useState<string>('1.6');

  const teamById = useMemo(() => {
    const m = new Map<string, DrawTeam>();
    teams.forEach((t) => m.set(t.id, t));
    return m;
  }, [teams]);

  const assignedTeamIds = useMemo(
    () => new Set(assignments.map((a) => a.teamId)),
    [assignments]
  );

  const teamsByGroupId = useMemo(() => {
    const m = new Map<string, DrawTeam[]>();
    groups.forEach((g) => m.set(g.id, []));
    for (const a of assignments) {
      const t = teamById.get(a.teamId);
      if (t) m.get(a.groupId)?.push(t);
    }
    return m;
  }, [assignments, groups, teamById]);

  const currentDraw = sequence[currentIndex];
  const currentTeam = currentDraw ? teamById.get(currentDraw.teamId) : null;
  const currentPotAccent = currentDraw ? POT_ACCENTS[currentDraw.potIndex % POT_ACCENTS.length] : POT_ACCENTS[0];

  // ───── Reshuffle pots (before start) ─────
  const onReshuffle = () => {
    if (phase !== 'idle') return;
    setPots(allocatePots(teams, potCount));
  };

  // ───── Run / pause / reset ─────
  const onStart = () => {
    if (phase === 'idle') {
      if (tournament.hasGroupMatches) {
        toast.error('Des matchs de poules existent déjà — supprime-les avant le tirage.');
        return;
      }
      setAssignments([]);
      setCurrentIndex(0);
      setStep('lift');
      setPhase('running');
    } else if (phase === 'paused') {
      setPhase('running');
    }
  };

  const onPause = () => {
    if (phase === 'running') setPhase('paused');
  };

  const onReset = () => {
    setPhase('idle');
    setAssignments([]);
    setCurrentIndex(0);
    setStep('lift');
    setPots(allocatePots(teams, potCount));
  };

  // ───── Step advancer ─────
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (phase !== 'running') return;
    const mult = Number.parseFloat(speed) || 1;
    let id: number | undefined;

    if (step === 'lift') {
      id = window.setTimeout(() => setStep('reveal'), LIFT_MS / mult);
    } else if (step === 'reveal') {
      id = window.setTimeout(() => setStep('place'), REVEAL_MS / mult);
    } else if (step === 'place') {
      id = window.setTimeout(() => {
        const d = sequence[currentIndex];
        if (d) {
          const groupId = groups[d.groupIndex]?.id;
          if (groupId) {
            setAssignments((prev) => [...prev, { teamId: d.teamId, groupId }]);
          }
        }
        setStep('gap');
      }, PLACE_MS / mult);
    } else if (step === 'gap') {
      id = window.setTimeout(() => {
        if (currentIndex + 1 >= sequence.length) {
          setPhase('complete');
        } else {
          setCurrentIndex((i) => i + 1);
          setStep('lift');
        }
      }, GAP_MS / mult);
    }

    return () => {
      if (id !== undefined) window.clearTimeout(id);
    };
  }, [phase, step, currentIndex, sequence, groups, speed]);

  // ───── Confetti on complete ─────
  useEffect(() => {
    if (phase !== 'complete') return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('canvas-confetti');
        if (cancelled) return;
        const confetti = mod.default;
        confetti({
          particleCount: 140,
          spread: 80,
          startVelocity: 45,
          origin: { y: 0.6 },
          colors: ['#10b981', '#facc15', '#dc2626', '#a855f7', '#ffffff'],
        });
        setTimeout(() => {
          if (cancelled) return;
          confetti({
            particleCount: 80,
            spread: 110,
            startVelocity: 35,
            origin: { x: 0.15, y: 0.7 },
            colors: ['#10b981', '#facc15'],
          });
          confetti({
            particleCount: 80,
            spread: 110,
            startVelocity: 35,
            origin: { x: 0.85, y: 0.7 },
            colors: ['#dc2626', '#a855f7'],
          });
        }, 250);
      } catch {
        // canvas-confetti pas installé → on no-op silencieusement
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // ───── Submit ─────
  const onSubmit = async () => {
    setPhase('submitting');
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Erreur lors de l\'enregistrement');
      }
      setPhase('done');
      toast.success('Tirage validé ✅');
      setTimeout(() => {
        router.push(`/tournaments/${tournament.id}?tab=teams`);
      }, 800);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
      setPhase('complete');
    }
  };

  const progress = Math.min(1, currentIndex / Math.max(1, sequence.length));
  const drawnCount =
    phase === 'complete' || phase === 'done' || phase === 'submitting'
      ? assignments.length
      : assignments.length + (phase === 'running' && (step === 'lift' || step === 'reveal' || step === 'place') ? 0 : 0);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden isolate">
      {/* Background atmosphere */}
      <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 via-yellow-500/60 via-red-500/60 to-purple-500/60" />
      <div className="absolute -left-40 top-20 w-150 h-150 rounded-full bg-emerald-700/10 blur-[140px] pointer-events-none" />
      <div className="absolute -right-40 bottom-20 w-150 h-150 rounded-full bg-purple-700/10 blur-[140px] pointer-events-none" />

      <CeremonyHeader tournament={tournament} drawn={assignments.length} total={sequence.length} progress={progress} />

      {tournament.hasGroupMatches && (
        <div className="relative container mx-auto px-4 pt-4">
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-center gap-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />
            <span className="text-red-200">
              Des matchs de poules existent déjà. Supprime-les avant de lancer un nouveau tirage —
              sinon le calendrier sera incohérent.
            </span>
          </div>
        </div>
      )}

      {/* Main grid */}
      <section className="relative container mx-auto px-4 py-10 lg:py-14">
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* LEFT — Pots */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <RailLabel num="POT" label="Chapeaux" />
            {pots.map((pot, i) => (
              <PotCard
                key={pot.index}
                pot={pot}
                index={i}
                isActive={
                  phase === 'running' && currentDraw?.potIndex === pot.index && (step === 'lift' || step === 'reveal')
                }
                drawnIds={assignedTeamIds}
                currentTeamId={
                  phase === 'running' && (step === 'lift' || step === 'reveal' || step === 'place')
                    ? currentDraw?.teamId ?? null
                    : null
                }
              />
            ))}
          </div>

          {/* CENTER — Stage */}
          <div className="col-span-12 lg:col-span-5 order-first lg:order-none">
            <RailLabel num="STG" label="Stage" />
            <StageArea
              phase={phase}
              step={step}
              currentTeam={currentTeam ?? null}
              currentDraw={currentDraw ?? null}
              currentAccent={currentPotAccent}
              groupName={currentDraw ? groups[currentDraw.groupIndex]?.name ?? '' : ''}
              speed={speed}
              onSpeedChange={setSpeed}
              onStart={onStart}
              onPause={onPause}
              onReset={onReset}
              onReshuffle={onReshuffle}
              drawIndex={currentIndex}
              totalDraws={sequence.length}
            />
          </div>

          {/* RIGHT — Groups */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <RailLabel num="GRP" label="Groupes" align="right" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map((g, i) => (
                <GroupSlot
                  key={g.id}
                  group={g}
                  index={i}
                  teams={teamsByGroupId.get(g.id) ?? []}
                  expectedCount={tournament.teamsPerGroup}
                  isTargetedNow={
                    phase === 'running' && step === 'place' && currentDraw?.groupIndex === i
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* COMPLETE BAR (sticky bottom so the "Valider" CTA reste toujours visible) */}
        <AnimatePresence>
          {(phase === 'complete' || phase === 'submitting' || phase === 'done') && (
            <motion.div
              key="complete-bar"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="sticky bottom-4 z-40 mt-10"
            >
              <CompleteBar
                onSubmit={onSubmit}
                onReset={onReset}
                phase={phase}
                count={assignments.length}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.32em] text-white/25">
          <span className="flex items-center gap-2">
            <CircleDot className="w-3 h-3 text-emerald-500" />
            CDM 26 · TIRAGE OFFICIEL
          </span>
          <span>{drawnCount}/{sequence.length} · tirage v1</span>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────────────────────

function CeremonyHeader({
  tournament,
  drawn,
  total,
  progress,
}: {
  tournament: DrawPageProps['tournament'];
  drawn: number;
  total: number;
  progress: number;
}) {
  return (
    <header className="relative border-b border-white/10 bg-black/40 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-6 flex items-end justify-between flex-wrap gap-6">
        <div>
          <Link
            href={`/tournaments/${tournament.id}`}
            className="inline-flex items-center gap-1.5 text-[10px] font-mono text-white/45 hover:text-white uppercase tracking-[0.3em] transition mb-4"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Retour au tournoi
          </Link>
          <div className="flex items-center gap-3">
            <Badge className="bg-red-500/15 border-red-500/40 text-red-300 uppercase tracking-[0.22em] text-[10px] font-mono">
              <span className="live-dot mr-1.5" /> LIVE
            </Badge>
            <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
              <Sparkles className="w-3 h-3 mr-1" /> Cérémonie officielle
            </Badge>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
              # CDM-DRAW-{tournament.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mt-3 tracking-tight leading-[0.9]">
            <span className="italic font-light text-white/35">Tirage au</span>{' '}
            <span className="text-gradient-worldcup">sort</span>
            <span className="text-white/35"> · </span>
            <span className="text-white">{tournament.name}</span>
          </h1>
        </div>

        <div className="flex flex-col items-end gap-2 min-w-[280px]">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/45">
            Boules tirées
          </div>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-4xl font-black text-gradient-worldcup">{drawn}</span>
            <span className="text-lg font-bold text-white/35">/ {total}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-linear-to-r from-emerald-400 via-yellow-400 to-red-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RAIL LABEL
// ─────────────────────────────────────────────────────────────────────────────

function RailLabel({ num, label, align = 'left' }: { num: string; label: string; align?: 'left' | 'right' }) {
  return (
    <div
      className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.32em] text-white/45 mb-3 ${
        align === 'right' ? 'justify-end' : ''
      }`}
    >
      <span className="block w-8 h-px bg-white/20" />
      <span>/ {num}</span>
      <span className="text-white/25">—</span>
      <span>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POT CARD
// ─────────────────────────────────────────────────────────────────────────────

function PotCard({
  pot,
  index,
  isActive,
  drawnIds,
  currentTeamId,
}: {
  pot: Pot;
  index: number;
  isActive: boolean;
  drawnIds: Set<string>;
  currentTeamId: string | null;
}) {
  const accent = POT_ACCENTS[index % POT_ACCENTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="relative"
    >
      <Card
        className={`relative overflow-hidden bg-linear-to-br ${accent.bg} via-black to-black border ${
          isActive ? accent.ring : 'border-white/10'
        } p-4 transition-colors`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-[9px] font-mono uppercase tracking-[0.3em] ${accent.text}`}
            >
              / POT-0{index + 1}
            </span>
            {isActive && (
              <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.25em] text-red-300">
                <span className="live-dot" /> tirage en cours
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono tabular-nums text-white/40">
            {pot.teams.filter((t) => !drawnIds.has(t.id)).length}/{pot.teams.length}
          </span>
        </div>

        {/* Balls floating in the pot */}
        <div className="flex flex-wrap gap-2 min-h-[60px]">
          <AnimatePresence>
            {pot.teams.map((t, i) => {
              if (drawnIds.has(t.id)) return null;
              if (t.id === currentTeamId) return null; // ball is "outside" — at center
              return (
                <motion.div
                  key={t.id}
                  layoutId={`ball-${t.id}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: [0, -4, 0],
                  }}
                  transition={{
                    layout: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.3 },
                    scale: { duration: 0.3 },
                    y: { repeat: Infinity, duration: 2 + Math.random() * 1, delay: i * 0.07, ease: 'easeInOut' },
                  }}
                  className="relative"
                >
                  <PotBall accent={accent} title={t.name} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {isActive && (
          <BorderBeam size={90} duration={6} colorFrom={accent.from} colorTo={accent.to} borderWidth={1.2} />
        )}
      </Card>
    </motion.div>
  );
}

function PotBall({ accent, title }: { accent: typeof POT_ACCENTS[number]; title: string }) {
  return (
    <div
      title={title}
      className={`relative w-7 h-7 rounded-full bg-linear-to-br from-white/40 via-white/15 to-white/5 border ${accent.ring} shadow-lg`}
    >
      <div
        className="absolute inset-0 rounded-full opacity-60"
        style={{
          background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.9), transparent 55%), radial-gradient(circle at 65% 80%, ${accent.from}40, transparent 70%)`,
        }}
      />
      <div className="absolute inset-[3px] rounded-full ring-1 ring-inset ring-white/20" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE AREA
// ─────────────────────────────────────────────────────────────────────────────

function StageArea({
  phase,
  step,
  currentTeam,
  currentDraw,
  currentAccent,
  groupName,
  speed,
  onSpeedChange,
  onStart,
  onPause,
  onReset,
  onReshuffle,
  drawIndex,
  totalDraws,
}: {
  phase: Phase;
  step: Step;
  currentTeam: DrawTeam | null;
  currentDraw: DrawStep | null;
  currentAccent: typeof POT_ACCENTS[number];
  groupName: string;
  speed: string;
  onSpeedChange: (v: string) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onReshuffle: () => void;
  drawIndex: number;
  totalDraws: number;
}) {
  const isRunningCenter = phase === 'running' && (step === 'lift' || step === 'reveal');
  const isPlacing = phase === 'running' && step === 'place';

  return (
    <Card className="relative overflow-hidden bg-linear-to-b from-white/3 via-black to-black border-white/10 p-6 lg:p-8 min-h-[480px]">
      {/* Ripple background — fades when not running */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${
        isRunningCenter || isPlacing ? 'opacity-100' : 'opacity-30'
      }`}>
        <Ripple mainCircleSize={220} numCircles={5} />
      </div>

      {/* Stage frame */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${
            phase === 'running' ? 'text-red-300' : phase === 'complete' ? 'text-emerald-300' : 'text-white/45'
          }`}>
            {phase === 'idle' && '/ standby'}
            {phase === 'running' && step === 'lift' && '/ lifting…'}
            {phase === 'running' && step === 'reveal' && '/ reveal'}
            {phase === 'running' && step === 'place' && '/ placement'}
            {phase === 'running' && step === 'gap' && '/ next…'}
            {phase === 'paused' && '/ paused'}
            {phase === 'complete' && '/ tirage complet'}
            {phase === 'submitting' && '/ enregistrement…'}
            {phase === 'done' && '/ validé'}
          </span>
          <span className="text-[10px] font-mono tabular-nums uppercase tracking-[0.3em] text-white/30">
            draw #{String(Math.min(drawIndex + 1, totalDraws)).padStart(2, '0')}/{String(totalDraws).padStart(2, '0')}
          </span>
        </div>

        {/* Reveal area — center */}
        <div className="relative h-[280px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="w-32 h-32 mx-auto mb-5 relative">
                  <div className="absolute inset-0 rounded-full bg-linear-to-br from-emerald-500/20 via-yellow-500/15 to-red-500/20 blur-2xl" />
                  <div className="relative w-full h-full rounded-full bg-linear-to-br from-white/15 via-white/5 to-transparent border border-white/20 flex items-center justify-center shadow-2xl">
                    <Trophy className="w-12 h-12 text-yellow-300/80" />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                  <span className="italic font-light text-white/35">Prêt pour le</span>{' '}
                  <span className="text-gradient-worldcup">tirage</span>.
                </div>
                <p className="text-sm text-white/55 max-w-md mx-auto leading-relaxed">
                  Les équipes sont distribuées dans {SPEED_PRESETS.length} chapeaux. Au lancement,
                  chaque boule sort dans l&apos;ordre — pot 1 vers tous les groupes, puis pot 2, etc.
                </p>
              </motion.div>
            )}

            {(isRunningCenter || isPlacing || phase === 'paused') && currentTeam && currentDraw && (
              <motion.div
                key={`reveal-${currentDraw.teamId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative w-full flex flex-col items-center"
              >
                <RevealBall team={currentTeam} accent={currentAccent} step={step} groupName={groupName} />
              </motion.div>
            )}

            {phase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="w-32 h-32 mx-auto mb-5 relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-3xl animate-pulse" />
                  <div className="relative w-full h-full rounded-full bg-linear-to-br from-emerald-400 via-yellow-400 to-red-400 flex items-center justify-center shadow-2xl">
                    <Check className="w-14 h-14 text-black" strokeWidth={3} />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                  Tirage <span className="text-gradient-worldcup">complet</span>.
                </div>
                <p className="text-sm text-white/55 max-w-md mx-auto">
                  Toutes les équipes sont placées. Valide ci-dessous pour enregistrer en base.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Speed */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mr-1">
                Vitesse
              </span>
              {SPEED_PRESETS.map((s) => {
                const active = speed === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onSpeedChange(s.value)}
                    disabled={phase === 'submitting' || phase === 'done'}
                    className={`relative px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-[0.22em] transition ${
                      active
                        ? 'bg-white text-black font-black'
                        : 'bg-white/5 text-white/55 hover:text-white border border-white/10 hover:border-white/30'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Play / pause / reset */}
            <div className="flex items-center gap-2">
              {phase === 'idle' && (
                <>
                  <Button
                    type="button"
                    onClick={onReshuffle}
                    variant="outline"
                    size="sm"
                    className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-[10px] px-3"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Re-shuffle
                  </Button>
                  <ShimmerButton
                    onClick={onStart}
                    background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                    shimmerColor="#ffffff"
                    className="px-6 py-3 font-black uppercase tracking-[0.18em] text-xs"
                  >
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Lancer le tirage
                  </ShimmerButton>
                </>
              )}

              {phase === 'running' && (
                <Button
                  type="button"
                  onClick={onPause}
                  variant="outline"
                  className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs px-5"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}

              {phase === 'paused' && (
                <>
                  <Button
                    type="button"
                    onClick={onReset}
                    variant="outline"
                    size="sm"
                    className="border-white/20 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-300 text-white font-black uppercase tracking-[0.18em] text-[10px] px-3"
                  >
                    Reset
                  </Button>
                  <ShimmerButton
                    onClick={onStart}
                    background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                    shimmerColor="#ffffff"
                    className="px-5 py-2.5 font-black uppercase tracking-[0.18em] text-xs"
                  >
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Reprendre
                  </ShimmerButton>
                </>
              )}

              {phase === 'complete' && (
                <Button
                  type="button"
                  onClick={onReset}
                  variant="outline"
                  size="sm"
                  className="border-white/20 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-300 text-white font-black uppercase tracking-[0.18em] text-[10px] px-3"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refaire
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RevealBall({
  team,
  accent,
  step,
  groupName,
}: {
  team: DrawTeam;
  accent: typeof POT_ACCENTS[number];
  step: Step;
  groupName: string;
}) {
  // sub-animation states based on step
  const open = step === 'reveal' || step === 'place';
  const exiting = step === 'place';

  return (
    <div className="relative flex flex-col items-center">
      {/* The ball that arrived from the pot */}
      <motion.div
        layoutId={`ball-${team.id}`}
        transition={{
          layout: { duration: exiting ? 0.65 : 0.7, ease: [0.22, 1, 0.36, 1] },
        }}
        className="relative"
        style={{ zIndex: 10 }}
      >
        <motion.div
          animate={
            step === 'lift'
              ? { scale: 1.05 }
              : step === 'reveal'
              ? { scale: 1.4 }
              : { scale: 0.6, opacity: 0.4 }
          }
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div
            className="relative w-32 h-32 rounded-full shadow-[0_0_80px_-10px_rgba(255,255,255,0.4)]"
            style={{
              background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95), rgba(255,255,255,0.15) 40%, transparent 70%), radial-gradient(circle at 65% 80%, ${accent.from}80, ${accent.to}30 60%, transparent 90%)`,
            }}
          >
            <div className="absolute inset-[6px] rounded-full ring-1 ring-inset ring-white/30" />
            <div className="absolute inset-0 rounded-full border-2 border-white/15" />
          </div>
          <BorderBeam size={140} duration={4} colorFrom={accent.from} colorTo={accent.to} borderWidth={1.5} />
        </motion.div>
      </motion.div>

      {/* Reveal panel — appears after lift */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full mt-6 inset-x-0 flex flex-col items-center"
          >
            {/* Team logo + name */}
            <div className="relative flex items-center gap-4 px-5 py-3 rounded-xl bg-linear-to-br from-white/10 via-white/5 to-transparent border border-white/15 backdrop-blur-md shadow-2xl">
              {team.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={team.logo}
                  alt={team.name}
                  className="w-12 h-12 rounded-full ring-2 ring-white/20 object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-black text-white">
                  {team.shortName.slice(0, 3).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/50">
                  Équipe tirée
                </div>
                <div className="text-xl md:text-2xl font-black text-white tracking-tight truncate max-w-[260px]">
                  {team.name}
                </div>
              </div>
            </div>

            {/* Destination badge */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30"
            >
              <ArrowRight className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-emerald-200">
                Direction · groupe {groupName}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP SLOT
// ─────────────────────────────────────────────────────────────────────────────

function GroupSlot({
  group,
  index,
  teams,
  expectedCount,
  isTargetedNow,
}: {
  group: DrawGroup;
  index: number;
  teams: DrawTeam[];
  expectedCount: number;
  isTargetedNow: boolean;
}) {
  const accents = ['emerald', 'yellow', 'red', 'purple', 'cyan', 'fuchsia'];
  const accent = accents[index % accents.length];

  const accentMap: Record<string, { text: string; ring: string; from: string; to: string }> = {
    emerald: { text: 'text-emerald-300', ring: 'border-emerald-500/40', from: '#10b981', to: '#facc15' },
    yellow: { text: 'text-yellow-300', ring: 'border-yellow-500/40', from: '#facc15', to: '#dc2626' },
    red: { text: 'text-red-300', ring: 'border-red-500/40', from: '#dc2626', to: '#a855f7' },
    purple: { text: 'text-purple-300', ring: 'border-purple-500/40', from: '#a855f7', to: '#10b981' },
    cyan: { text: 'text-cyan-300', ring: 'border-cyan-500/40', from: '#06b6d4', to: '#facc15' },
    fuchsia: { text: 'text-fuchsia-300', ring: 'border-fuchsia-500/40', from: '#d946ef', to: '#10b981' },
  };
  const a = accentMap[accent];

  const isComplete = teams.length >= expectedCount;
  const slotsRemaining = expectedCount - teams.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5 }}
    >
      <Card
        className={`relative overflow-hidden bg-linear-to-br ${
          isComplete ? 'from-emerald-950/30' : 'from-white/3'
        } via-black to-black border ${isTargetedNow ? a.ring : 'border-white/10'} p-4 transition-colors min-h-[160px]`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${a.text}`}>
              / GRP-{group.name}
            </span>
            {isComplete && <Crown className="w-3 h-3 text-yellow-300" />}
          </div>
          <span className="text-[10px] font-mono tabular-nums text-white/40">
            {teams.length}/{expectedCount}
          </span>
        </div>

        <div className="space-y-1.5">
          <AnimatePresence>
            {teams.map((t) => (
              <motion.div
                key={t.id}
                layoutId={`ball-${t.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ layout: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/4 border border-white/10"
              >
                {t.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logo} alt={t.name} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[8px] font-black text-white">
                    {t.shortName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-white truncate">{t.name}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, slotsRemaining) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/2 border border-dashed border-white/8"
            >
              <Lock className="w-3 h-3 text-white/20" />
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/25">
                {isTargetedNow && i === 0 ? '…incoming' : 'slot vide'}
              </span>
            </div>
          ))}
        </div>

        {(isTargetedNow || isComplete) && (
          <BorderBeam size={90} duration={6} colorFrom={a.from} colorTo={a.to} borderWidth={1.2} />
        )}
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE BAR
// ─────────────────────────────────────────────────────────────────────────────

function CompleteBar({
  onSubmit,
  onReset,
  phase,
  count,
}: {
  onSubmit: () => void;
  onReset: () => void;
  phase: Phase;
  count: number;
}) {
  const isSubmitting = phase === 'submitting';
  const isDone = phase === 'done';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-linear-to-br from-emerald-950/40 via-black to-purple-950/30 p-5 md:p-7">
      <div className="absolute inset-0 bg-mesh-cdm opacity-30 pointer-events-none" />
      <div className="relative flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-300 mb-1">
              § Cérémonie terminée
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {count} équipe{count > 1 ? 's' : ''} prête{count > 1 ? 's' : ''} à être enregistrée{count > 1 ? 's' : ''}
            </h3>
            <p className="text-xs text-white/55 mt-0.5 font-mono uppercase tracking-[0.2em]">
              valider écrira les groupes en base
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onReset}
            disabled={isSubmitting || isDone}
            variant="outline"
            className="border-white/20 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-300 text-white font-black uppercase tracking-[0.18em] text-xs"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refaire
          </Button>
          <ShimmerButton
            onClick={onSubmit}
            disabled={isSubmitting || isDone}
            background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
            shimmerColor="#ffffff"
            className="px-7 py-3.5 font-black uppercase tracking-[0.18em] text-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement…
              </>
            ) : isDone ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Validé
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Valider le tirage
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </ShimmerButton>
        </div>
      </div>

      <BorderBeam size={300} duration={10} colorFrom="#10b981" colorTo="#facc15" borderWidth={1.5} />
    </div>
  );
}
