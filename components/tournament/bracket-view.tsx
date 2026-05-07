'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Trophy, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { BorderBeam } from '@/components/ui/border-beam';

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

const ROUND_META: Record<string, { label: string; code: string; accent: string }> = {
  PLAYOFF: { label: 'Barrages', code: 'PO', accent: 'text-blue-400 border-blue-500/30' },
  ROUND_OF_16: { label: '8es de finale', code: 'R16', accent: 'text-emerald-400 border-emerald-500/30' },
  QUARTER_FINAL: { label: 'Quarts', code: 'QF', accent: 'text-yellow-400 border-yellow-500/30' },
  SEMI_FINAL: { label: 'Demi-finales', code: 'SF', accent: 'text-orange-400 border-orange-500/30' },
  FINAL: { label: 'Finale', code: 'F', accent: 'text-red-400 border-red-500/30' },
};

export function BracketView({ matches }: BracketViewProps) {
  const [hoveredMatch, setHoveredMatch] = useState<string | null>(null);

  const rounds: Record<string, BracketMatch[]> = {
    PLAYOFF: matches.filter((m) => m.stage === 'PLAYOFF'),
    ROUND_OF_16: matches.filter((m) => m.stage === 'ROUND_OF_16'),
    QUARTER_FINAL: matches.filter((m) => m.stage === 'QUARTER_FINAL'),
    SEMI_FINAL: matches.filter((m) => m.stage === 'SEMI_FINAL'),
    FINAL: matches.filter((m) => m.stage === 'FINAL'),
  };

  const renderTeamRow = (team: BracketTeam, score: number | null | undefined, won: boolean, lost: boolean) => (
    <div
      className={`flex items-center justify-between px-3.5 py-2.5 rounded-md transition-all ${
        won
          ? 'bg-emerald-500/10 border border-emerald-500/30'
          : lost
          ? 'bg-white/2 border border-white/5 opacity-50'
          : 'bg-white/3er border-white/10'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {team.logo ? (
          <Image
            src={team.logo}
            alt={team.name}
            width={28}
            height={28}
            className="rounded-md object-cover ring-1 ring-white/10 shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-md bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-xs shrink-0 ring-1 ring-white/10">
            {team.shortName.charAt(0)}
          </div>
        )}
        <span className={`font-bold text-sm truncate ${won ? 'text-emerald-300' : 'text-white/85'}`}>
          {team.name}
        </span>
      </div>
      {score != null && (
        <span className={`text-xl font-black tabular-nums shrink-0 ml-3 ${won ? 'text-emerald-300' : 'text-white/40'}`}>
          {score}
        </span>
      )}
    </div>
  );

  const renderMatchCard = (match: BracketMatch, index: number, roundIndex: number, isFinal = false) => {
    const isCompleted = match.homeScore != null && match.awayScore != null;
    const homeWon = match.winnerTeamId === match.homeTeam.id;
    const awayWon = match.winnerTeamId === match.awayTeam.id;

    return (
      <motion.div
        key={match.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: roundIndex * 0.15 + index * 0.08, duration: 0.45 }}
        onHoverStart={() => setHoveredMatch(match.id)}
        onHoverEnd={() => setHoveredMatch(null)}
        className="relative group"
      >
        <Card
          className={`relative overflow-hidden bg-linear-to-b from-white/3 to-transparent border-white/10 ${
            hoveredMatch === match.id ? 'border-white/30' : ''
          } transition-all p-3.5 min-w-[18rem]`}
        >
          {/* Match code header */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/40">
              # {match.id.slice(0, 6).toUpperCase()}
            </span>
            {!isCompleted && (
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-yellow-400">À venir</span>
            )}
            {isCompleted && (
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/40">FT</span>
            )}
          </div>

          <div className="space-y-1.5">
            {renderTeamRow(match.homeTeam, match.homeScore, homeWon, awayWon && isCompleted)}
            {renderTeamRow(match.awayTeam, match.awayScore, awayWon, homeWon && isCompleted)}
          </div>

          {isFinal && match.winnerTeamId && (
            <BorderBeam size={140} duration={8} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1.5} />
          )}
        </Card>
      </motion.div>
    );
  };

  const renderRoundColumn = (key: string, label: string, code: string, accent: string, roundIdx: number, isFinal = false) => {
    const list = rounds[key];
    if (!list || list.length === 0) return null;
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/3 border ${accent} text-[10px] font-mono uppercase tracking-[0.25em]`}>
            <span>/ {code}</span>
            <span className="text-white/30">—</span>
            <span>{label}</span>
          </div>
        </div>
        {list.map((m, idx) => renderMatchCard(m, idx, roundIdx, isFinal))}
      </div>
    );
  };

  return (
    <div className="relative w-full overflow-x-auto py-6">
      <div className="absolute inset-0 bg-linear-to-r from-emerald-500/4 via-yellow-500/4 to-red-500/4 rounded-2xl pointer-events-none" />

      <div className="relative flex justify-center items-start gap-10 md:gap-16 min-w-max px-4 md:px-8">
        {renderRoundColumn('PLAYOFF', 'Barrages', 'PO', ROUND_META.PLAYOFF.accent, 0)}
        {renderRoundColumn('ROUND_OF_16', '8es de finale', 'R16', ROUND_META.ROUND_OF_16.accent, 1)}
        {renderRoundColumn('QUARTER_FINAL', 'Quarts', 'QF', ROUND_META.QUARTER_FINAL.accent, 2)}
        {renderRoundColumn('SEMI_FINAL', 'Demi-finales', 'SF', ROUND_META.SEMI_FINAL.accent, 3)}

        {/* Final column with crown */}
        {rounds.FINAL && rounds.FINAL.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-yellow-500/20 via-amber-500/20 to-red-500/20 border border-yellow-500/40 text-[11px] font-mono uppercase tracking-[0.3em] text-yellow-300 font-black"
              >
                <Sparkles className="w-3 h-3" />
                <span>/ F — FINALE</span>
                <Trophy className="w-3 h-3" />
              </motion.div>
            </div>

            {rounds.FINAL.map((m, idx) => (
              <div key={m.id} className="relative">
                {m.winnerTeamId && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.8, type: 'spring' }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 z-10"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-60 animate-pulse" />
                      <Crown className="relative w-10 h-10 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
                    </div>
                  </motion.div>
                )}
                {renderMatchCard(m, idx, 4, true)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
