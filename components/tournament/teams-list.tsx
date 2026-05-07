'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Users, Trophy, ChevronRight, Crown, Shield } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { BorderBeam } from '@/components/ui/border-beam';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Player {
  id: string;
  jerseyNumber: number;
  position: string;
  user: User;
}

interface Group {
  id: string;
  name: string;
}

interface Standing {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string | null;
  group?: Group | null;
  players?: Player[];
  standings?: Standing[];
}

interface TeamsListProps {
  teams: Team[];
  title?: string;
}

function PositionPill({ position }: { position: number }) {
  if (position === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-linear-to-r from-yellow-500/15 to-amber-500/15 border border-yellow-500/40 text-yellow-300 text-[10px] font-mono uppercase tracking-[0.2em]">
        <Crown className="w-3 h-3" />
        1er
      </span>
    );
  }
  if (position === 2) {
    return (
      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono uppercase tracking-[0.2em]">
        2e
      </span>
    );
  }
  if (position === 3) {
    return (
      <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-300 text-[10px] font-mono uppercase tracking-[0.2em]">
        3e
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/55 text-[10px] font-mono uppercase tracking-[0.2em]">
      {position}e
    </span>
  );
}

export function TeamsList({ teams, title = 'Équipes' }: TeamsListProps) {
  const grouped = teams.reduce((acc, t) => {
    const g = t.group?.name || 'Sans groupe';
    if (!acc[g]) acc[g] = [];
    acc[g].push(t);
    return acc;
  }, {} as Record<string, Team[]>);

  if (teams.length === 0) {
    return (
      <Card className="relative overflow-hidden bg-white/2 border-white/10 py-16 px-6 text-center">
        <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-5">
          <Users className="w-12 h-12 text-white/40" />
        </div>
        <h3 className="text-2xl md:text-3xl font-black mb-2 text-white tracking-tight">Aucune équipe</h3>
        <p className="text-white/55">Les équipes apparaîtront ici une fois créées.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-2">
          <span className="block w-8 h-px bg-emerald-400" />
          / TMS
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{title}</h2>
      </div>

      {Object.entries(grouped).map(([groupName, list]) => (
        <div key={groupName} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/3 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono uppercase tracking-[0.25em]">
              <Shield className="w-3 h-3" />
              <span>{groupName}</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
              {list.length} équipe{list.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((team, index) => {
              const standing = team.standings?.[0];
              const playersCount = team.players?.length ?? 0;
              const diff = standing ? standing.goalsFor - standing.goalsAgainst : 0;
              const isFirst = standing?.position === 1;

              return (
                <Link key={team.id} href={`/teams/${team.id}`} className="block group">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    whileHover={{ y: -3 }}
                  >
                    <Card
                      className={`relative overflow-hidden h-full bg-linear-to-b ${
                        isFirst ? 'from-yellow-950/30' : 'from-white/3'
                      } to-transparent border-white/10 group-hover:border-white/30 transition-all p-0`}
                    >
                      {/* Top strip */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono">
                          # {team.id.slice(0, 6).toUpperCase()}
                        </span>
                        {standing ? <PositionPill position={standing.position} /> : (
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35">— pos —</span>
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-5">
                          {team.logo ? (
                            <Image
                              src={team.logo}
                              alt={team.name}
                              width={48}
                              height={48}
                              className="rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-base shrink-0 ring-1 ring-white/10">
                              {team.shortName.substring(0, 2)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-lg text-white tracking-tight leading-tight truncate">
                              {team.name}
                            </h4>
                            <p className="text-[10px] font-mono text-white/45 uppercase tracking-[0.22em] truncate">
                              {team.shortName}
                            </p>
                          </div>
                        </div>

                        {standing ? (
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            <MiniStat value={standing.won} label="V" color="text-emerald-400" />
                            <MiniStat value={standing.drawn} label="N" color="text-yellow-400" />
                            <MiniStat value={standing.lost} label="D" color="text-red-400" />
                          </div>
                        ) : (
                          <div className="text-center text-[10px] font-mono text-white/40 uppercase tracking-[0.25em] py-2 mb-4">
                            Pas encore de stats
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <span className="flex items-center gap-1.5 text-xs text-white/65 font-mono">
                            <Users className="w-3 h-3" />
                            <span className="tabular-nums font-bold text-white/85">{playersCount}</span>
                            <span className="text-white/45 uppercase tracking-[0.2em] text-[10px]">
                              joueur{playersCount > 1 ? 's' : ''}
                            </span>
                          </span>
                          {standing ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <Trophy className="w-3 h-3 text-yellow-400" />
                              <span className="font-black text-white tabular-nums">{standing.points}</span>
                              <span className="text-white/40 uppercase tracking-[0.2em] text-[10px] font-mono">pts</span>
                            </span>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                          )}
                        </div>

                        {standing && (
                          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                            <span>{standing.goalsFor}</span>
                            <span className="text-white/25">·</span>
                            <span>{standing.goalsAgainst}</span>
                            <span className="text-white/25">→</span>
                            <span
                              className={
                                diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-white/45'
                              }
                            >
                              {diff > 0 ? '+' : ''}
                              {diff}
                            </span>
                          </div>
                        )}
                      </div>

                      {isFirst && (
                        <BorderBeam size={140} duration={9} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1} />
                      )}
                    </Card>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center rounded-md bg-white/3 border border-white/10 py-2">
      <div className={`text-xl font-black tabular-nums ${color} leading-none`}>{value}</div>
      <div className="text-[9px] font-mono text-white/40 uppercase tracking-[0.25em] mt-1">{label}</div>
    </div>
  );
}
