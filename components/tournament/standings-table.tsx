'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Crown, ShieldAlert, Trophy } from 'lucide-react';
import { DisqualifyTeamModal } from '@/components/admin/disqualify-team-modal';
import { Card } from '@/components/ui/card';

interface Standing {
  position: number;
  team: {
    id: string;
    name: string;
    shortName: string;
    logo?: string;
    disqualified?: boolean;
    disqualificationReason?: string | null;
  };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

interface StandingsTableProps {
  standings: Standing[];
  groupName?: string;
  userRole?: string;
  onRefresh?: () => void;
}

function PositionBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black font-black text-sm shadow-lg shadow-yellow-500/30 ring-1 ring-yellow-300/50">
        <Crown className="w-4 h-4" />
      </div>
    );
  }
  if (position === 2) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-500/20">
        {position}
      </div>
    );
  }
  if (position === 3) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/20">
        {position}
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 font-black text-sm tabular-nums">
      {position}
    </div>
  );
}

export function StandingsTable({ standings, groupName, userRole, onRefresh }: StandingsTableProps) {
  const [selectedTeam, setSelectedTeam] = useState<Standing['team'] | null>(null);
  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="w-full">
      {groupName && (
        <div className="flex items-center gap-3 mb-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-2">
            <span className="block w-8 h-px bg-emerald-400" />
            <Trophy className="w-3 h-3" />
            POULE
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
            {groupName}
          </h2>
        </div>
      )}

      <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 p-0">
        {/* Header */}
        <div className="bg-white/[0.03] border-b border-white/10">
          <div className="grid grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Équipe</div>
            <div className="col-span-1 text-center">J</div>
            <div className="col-span-1 text-center">V</div>
            <div className="col-span-1 text-center">N</div>
            <div className="col-span-1 text-center">D</div>
            <div className="col-span-1 text-center">Diff</div>
            <div className="col-span-1 text-center">Pts</div>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          {standings.map((s, index) => {
            const isDQ = s.team.disqualified;
            const diff = s.goalsFor - s.goalsAgainst;
            const isQualified = s.position <= 2 && !isDQ;
            return (
              <motion.div
                key={s.team.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
                className={`relative px-4 md:px-6 py-3.5 transition-colors hover:bg-white/[0.03] ${
                  isDQ ? 'opacity-60 bg-red-950/15' : ''
                }`}
              >
                {/* Left accent bar for qualified */}
                {isQualified && (
                  <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-400 via-emerald-400 to-yellow-400" />
                )}
                {isDQ && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500" />}

                <div className="grid grid-cols-12 gap-2 md:gap-4 items-center">
                  <div className="col-span-1">
                    <PositionBadge position={s.position} />
                  </div>

                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    {s.team.logo ? (
                      <Image
                        src={s.team.logo}
                        alt={s.team.name}
                        width={36}
                        height={36}
                        className={`rounded-lg object-cover ring-1 ring-white/10 shrink-0 ${
                          isDQ ? 'grayscale' : ''
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ring-1 ring-white/10 ${
                          isDQ
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white'
                        }`}
                      >
                        {s.team.shortName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-black text-white tracking-tight truncate ${
                            isDQ ? 'line-through text-red-300' : ''
                          }`}
                        >
                          {s.team.name}
                        </span>
                        {isDQ && (
                          <span className="px-1.5 py-0.5 bg-red-500/15 border border-red-500/30 rounded text-[9px] font-mono text-red-300 uppercase tracking-[0.22em]">
                            DQ
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] truncate">
                        {s.team.shortName}
                        {isDQ && s.team.disqualificationReason && (
                          <span className="ml-2 text-red-400 normal-case">· {s.team.disqualificationReason}</span>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeam(s.team);
                        }}
                        title={isDQ ? "Réintégrer l'équipe" : "Disqualifier l'équipe"}
                        className={`shrink-0 p-1.5 rounded-md transition ${
                          isDQ
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="col-span-1 text-center text-sm font-bold tabular-nums text-white/85">{s.played}</div>
                  <div className="col-span-1 text-center text-sm font-bold tabular-nums text-emerald-400">{s.won}</div>
                  <div className="col-span-1 text-center text-sm font-bold tabular-nums text-yellow-400">{s.drawn}</div>
                  <div className="col-span-1 text-center text-sm font-bold tabular-nums text-red-400">{s.lost}</div>
                  <div className="col-span-1 text-center text-sm font-bold tabular-nums">
                    <span className={diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-white/60'}>
                      {diff > 0 ? '+' : ''}
                      {diff}
                    </span>
                  </div>

                  <div className="col-span-1 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-black tabular-nums min-w-[2rem] ${
                        isQualified
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border border-white/10 text-white/85'
                      }`}
                    >
                      {s.points}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-yellow-400 to-amber-600" />
          1er — Qualifié
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-emerald-500 to-emerald-700" />
          2e — Qualifié
        </div>
        <span className="text-white/20">·</span>
        <span>J · Joués</span>
        <span>V · Victoires</span>
        <span>N · Nuls</span>
        <span>D · Défaites</span>
        <span>Diff · Différence</span>
        <span>Pts · Points</span>
      </div>

      {selectedTeam && (
        <DisqualifyTeamModal
          isOpen={!!selectedTeam}
          onClose={() => setSelectedTeam(null)}
          team={selectedTeam}
          onSuccess={() => {
            setSelectedTeam(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
