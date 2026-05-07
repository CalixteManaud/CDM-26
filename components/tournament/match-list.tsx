'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Trophy, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { BorderBeam } from '@/components/ui/border-beam';

type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED';
type MatchStage = 'GROUP' | 'PLAYOFF' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';

interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface Match {
  id: string;
  matchDate: string;
  stage: MatchStage;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam: Team;
  awayTeam: Team;
  group?: Group | null;
}

interface MatchListProps {
  matches: Match[];
  title?: string;
}

const stageMeta: Record<MatchStage, { label: string; code: string; accent: string }> = {
  GROUP: { label: 'Phase de poules', code: 'GS', accent: 'text-emerald-400 border-emerald-500/30' },
  PLAYOFF: { label: 'Barrages', code: 'PO', accent: 'text-blue-400 border-blue-500/30' },
  ROUND_OF_16: { label: '8es de finale', code: 'R16', accent: 'text-emerald-400 border-emerald-500/30' },
  QUARTER_FINAL: { label: 'Quarts de finale', code: 'QF', accent: 'text-yellow-400 border-yellow-500/30' },
  SEMI_FINAL: { label: 'Demi-finales', code: 'SF', accent: 'text-orange-400 border-orange-500/30' },
  FINAL: { label: 'Finale', code: 'F', accent: 'text-red-400 border-red-500/30' },
};

function StatusInline({ status }: { status: MatchStatus }) {
  if (status === 'LIVE') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-red-400 font-mono">
        <span className="live-dot" />
        LIVE
      </span>
    );
  }
  if (status === 'FINISHED') {
    return <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">FT</span>;
  }
  if (status === 'CANCELED') {
    return (
      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-red-300 line-through">Annulé</span>
    );
  }
  return (
    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-yellow-400">À venir</span>
  );
}

function TeamRow({
  team,
  score,
  status,
}: {
  team: Team;
  score: number | null | undefined;
  status: MatchStatus;
}) {
  const isFinished = status === 'FINISHED';
  const isLive = status === 'LIVE';
  return (
    <div className="flex items-center justify-between py-2">
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
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-xs shrink-0 ring-1 ring-white/10">
            {team.shortName.substring(0, 2)}
          </div>
        )}
        <span className="font-bold text-sm text-white/90 truncate">{team.name}</span>
      </div>
      <span
        className={`text-2xl font-black tabular-nums shrink-0 ml-3 ${
          isLive ? 'text-red-400' : isFinished ? 'text-white' : 'text-white/30'
        }`}
      >
        {score != null ? score : '—'}
      </span>
    </div>
  );
}

export function MatchList({ matches, title = 'Matchs' }: MatchListProps) {
  const grouped = matches.reduce((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = [];
    acc[m.stage].push(m);
    return acc;
  }, {} as Record<MatchStage, Match[]>);

  const stageOrder: MatchStage[] = [
    'GROUP',
    'PLAYOFF',
    'ROUND_OF_16',
    'QUARTER_FINAL',
    'SEMI_FINAL',
    'FINAL',
  ];

  if (matches.length === 0) {
    return (
      <Card className="relative overflow-hidden bg-white/[0.02] border-white/10 py-16 px-6 text-center">
        <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-5">
          <Calendar className="w-12 h-12 text-white/40" />
        </div>
        <h3 className="text-2xl md:text-3xl font-black mb-2 text-white tracking-tight">Aucun match</h3>
        <p className="text-white/55">Les matchs seront affichés ici une fois créés.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-2">
          <span className="block w-8 h-px bg-emerald-400" />
          / MTC
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{title}</h2>
      </div>

      {stageOrder.map((stage) => {
        const list = grouped[stage];
        if (!list || list.length === 0) return null;
        const meta = stageMeta[stage];
        return (
          <div key={stage} className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border text-[10px] font-mono uppercase tracking-[0.25em] ${meta.accent}`}
              >
                <Trophy className="w-3 h-3" />
                <span>/ {meta.code}</span>
                <span className="text-white/30">—</span>
                <span>{meta.label}</span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
                {list.length} match{list.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((m, idx) => {
                const isLive = m.status === 'LIVE';
                return (
                  <Link key={m.id} href={`/matches/${m.id}`} className="block group">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.4 }}
                      whileHover={{ y: -2 }}
                    >
                      <Card
                        className={`relative overflow-hidden bg-gradient-to-b ${
                          isLive ? 'from-red-950/30' : 'from-white/[0.03]'
                        } to-transparent border-white/10 group-hover:border-white/30 transition-all p-0`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10">
                          <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-[0.22em]">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(m.matchDate), 'd MMM yyyy', { locale: fr })}
                          </span>
                          <StatusInline status={m.status} />
                        </div>

                        {/* Teams */}
                        <div className="px-5 py-4 divide-y divide-white/5">
                          <TeamRow team={m.homeTeam} score={m.homeScore} status={m.status} />
                          <TeamRow team={m.awayTeam} score={m.awayScore} status={m.status} />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/10 bg-white/[0.02]">
                          <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-[0.22em]">
                            <Clock className="w-3 h-3" />
                            {format(new Date(m.matchDate), 'HH:mm')}
                          </span>
                          {m.group && (
                            <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/45 uppercase tracking-[0.22em]">
                              <MapPin className="w-3 h-3" />
                              {m.group.name}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                        </div>

                        {isLive && (
                          <BorderBeam size={130} duration={6} colorFrom="#ef4444" colorTo="#f59e0b" borderWidth={1.2} />
                        )}
                      </Card>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
