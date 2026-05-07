'use client';

import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  Shield,
  Award,
  TrendingUp,
  TrendingDown,
  Users,
  User,
  AlertCircle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import type { TournamentStatistics } from '@/lib/utils/tournament-stats';
import { Card } from '@/components/ui/card';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';

type Color = 'emerald' | 'red' | 'yellow' | 'orange' | 'purple' | 'gold' | 'blue';
const COLORS: Record<Color, { text: string; border: string; ring: string }> = {
  emerald: { text: 'text-emerald-400', border: 'border-emerald-500/25', ring: 'from-emerald-950/40' },
  red: { text: 'text-red-400', border: 'border-red-500/25', ring: 'from-red-950/40' },
  yellow: { text: 'text-yellow-400', border: 'border-yellow-500/25', ring: 'from-yellow-950/30' },
  orange: { text: 'text-orange-400', border: 'border-orange-500/25', ring: 'from-orange-950/30' },
  purple: { text: 'text-purple-400', border: 'border-purple-500/25', ring: 'from-purple-950/30' },
  gold: { text: 'text-yellow-300', border: 'border-yellow-500/35', ring: 'from-yellow-950/40' },
  blue: { text: 'text-blue-400', border: 'border-blue-500/25', ring: 'from-blue-950/30' },
};

interface Props {
  stats: TournamentStatistics;
}

export function TournamentStatisticsView({ stats }: Props) {
  return (
    <div className="space-y-12">
      {/* GLOBAL */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <SectionHeader code="GLB" label="Global" title="Le tournoi en chiffres." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BigStatCard icon={Trophy} title="Matchs joués" value={stats.totalMatches} code="MTC-PLY" color="emerald" beam />
          <BigStatCard icon={Target} title="Buts marqués" value={stats.totalGoals} code="GLS-TOT" color="red" />
        </div>
      </motion.div>

      {/* TEAMS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
        <SectionHeader code="TMS" label="Statistiques par équipe" title="Les nations qui marquent." />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {stats.topScoringTeam && (
            <TeamStatCard icon={TrendingUp} title="Meilleure attaque" team={stats.topScoringTeam} stat={`${stats.topScoringTeam.goalsScored} buts`} color="emerald" />
          )}
          {stats.lowestScoringTeam && (
            <TeamStatCard icon={TrendingDown} title="Pire attaque" team={stats.lowestScoringTeam} stat={`${stats.lowestScoringTeam.goalsScored} buts`} color="red" />
          )}
          {stats.mostConceededTeam && (
            <TeamStatCard icon={Shield} title="Défense la plus perméable" team={stats.mostConceededTeam} stat={`${stats.mostConceededTeam.goalsConceded} buts encaissés`} color="orange" />
          )}
          {stats.mostAssistsTeam && stats.mostAssistsTeam.assists > 0 && (
            <TeamStatCard icon={Zap} title="Plus de passes décisives" team={stats.mostAssistsTeam} stat={`${stats.mostAssistsTeam.assists} passes`} color="purple" />
          )}
          {stats.mostYellowCardsTeam && stats.mostYellowCardsTeam.yellowCards > 0 && (
            <TeamStatCard icon={AlertCircle} title="Plus de cartons jaunes" team={stats.mostYellowCardsTeam} stat={`${stats.mostYellowCardsTeam.yellowCards} jaunes`} color="yellow" />
          )}
          {stats.mostRedCardsTeam && stats.mostRedCardsTeam.redCards > 0 && (
            <TeamStatCard icon={AlertCircle} title="Plus de cartons rouges" team={stats.mostRedCardsTeam} stat={`${stats.mostRedCardsTeam.redCards} rouges`} color="red" />
          )}
        </div>
      </motion.div>

      {/* PLAYERS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-5">
        <SectionHeader code="PLY" label="Statistiques par joueur" title="Les hommes du tournoi." />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {stats.topScorer && stats.topScorer.goals > 0 && (
            <PlayerStatCard icon={Trophy} title="Soulier d'or" player={stats.topScorer} stat={`${stats.topScorer.goals} buts`} color="gold" beam />
          )}
          {stats.topAssister && stats.topAssister.assists > 0 && (
            <PlayerStatCard icon={Zap} title="Meilleur passeur" player={stats.topAssister} stat={`${stats.topAssister.assists} passes`} color="purple" />
          )}
          {stats.bestGoalkeeper && (
            <PlayerStatCard
              icon={CheckCircle}
              title="Gant d'or"
              player={stats.bestGoalkeeper}
              stat={`${stats.bestGoalkeeper.goalsConceded} buts encaissés`}
              color="emerald"
              subtitle={`en ${stats.bestGoalkeeper.matchesPlayed} match(s)`}
              beam
            />
          )}
          {stats.worstGoalkeeper && (
            <PlayerStatCard
              icon={Shield}
              title="Gardien le plus battu"
              player={stats.worstGoalkeeper}
              stat={`${stats.worstGoalkeeper.goalsConceded} buts encaissés`}
              color="red"
              subtitle={`en ${stats.worstGoalkeeper.matchesPlayed} match(s)`}
            />
          )}
          {stats.mostYellowCards && stats.mostYellowCards.yellowCards > 0 && (
            <PlayerStatCard icon={AlertCircle} title="Plus averti (jaunes)" player={stats.mostYellowCards} stat={`${stats.mostYellowCards.yellowCards} cartons`} color="yellow" />
          )}
          {stats.mostRedCards && stats.mostRedCards.redCards > 0 && (
            <PlayerStatCard icon={AlertCircle} title="Plus sanctionné (rouges)" player={stats.mostRedCards} stat={`${stats.mostRedCards.redCards} cartons`} color="red" />
          )}
        </div>
      </motion.div>

      {/* SCORERS RANKING */}
      {stats.playerStats.filter((p) => p.goals > 0).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-5">
          <SectionHeader code="SCR" label="Classement des buteurs" title="Le top 10 des artilleurs." icon={Award} />
          <Card className="relative overflow-hidden bg-white/2 border-white/10 p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/3 border-b border-white/10">
                  <tr className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                    <th className="text-left px-4 md:px-6 py-3">#</th>
                    <th className="text-left px-4 md:px-6 py-3">Joueur</th>
                    <th className="text-left px-4 md:px-6 py-3 hidden sm:table-cell">Équipe</th>
                    <th className="text-center px-4 md:px-6 py-3">Buts</th>
                    <th className="text-center px-4 md:px-6 py-3">Passes</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.playerStats
                    .filter((p) => p.goals > 0)
                    .slice(0, 10)
                    .map((p, idx) => (
                      <tr key={p.playerId} className="border-t border-white/5 hover:bg-white/3 transition">
                        <td className="px-4 md:px-6 py-3">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-black tabular-nums ${
                              idx === 0
                                ? 'bg-linear-to-br from-yellow-400 to-amber-600 text-black'
                                : idx === 1
                                ? 'bg-linear-to-br from-emerald-500 to-emerald-700 text-white'
                                : idx === 2
                                ? 'bg-linear-to-br from-orange-400 to-red-500 text-white'
                                : 'bg-white/5 border border-white/10 text-white/55'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3">
                          <div className="font-black text-white tracking-tight leading-tight">{p.playerName}</div>
                          <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.22em] mt-0.5">
                            #{p.playerNumber} · {p.position}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 text-white/65 hidden sm:table-cell">{p.teamName}</td>
                        <td className="px-4 md:px-6 py-3 text-center">
                          <span className="font-black text-emerald-400 tabular-nums text-base">{p.goals}</span>
                        </td>
                        <td className="px-4 md:px-6 py-3 text-center">
                          <span className="font-black text-purple-400 tabular-nums text-base">{p.assists}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* TEAM STATS TABLE */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-5">
        <SectionHeader code="ALL" label="Classement complet" title="Toutes les équipes." icon={Trophy} />
        <Card className="relative overflow-hidden bg-white/2 border-white/10 p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/3 border-b border-white/10">
                <tr className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                  <th className="text-left px-4 md:px-6 py-3">Équipe</th>
                  <th className="text-center px-3 md:px-4 py-3">MJ</th>
                  <th className="text-center px-3 md:px-4 py-3">BP</th>
                  <th className="text-center px-3 md:px-4 py-3">BC</th>
                  <th className="text-center px-3 md:px-4 py-3">+/−</th>
                  <th className="text-center px-3 md:px-4 py-3">A</th>
                  <th className="text-center px-3 md:px-4 py-3">CJ</th>
                  <th className="text-center px-3 md:px-4 py-3">CR</th>
                </tr>
              </thead>
              <tbody>
                {stats.teamStats.map((team) => {
                  const diff = team.goalsScored - team.goalsConceded;
                  return (
                    <tr key={team.teamId} className="border-t border-white/5 hover:bg-white/3 transition">
                      <td className="px-4 md:px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-xs ring-1 ring-white/10">
                            {team.teamShortName.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-black text-white tracking-tight leading-tight">{team.teamName}</div>
                            <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.22em] mt-0.5">
                              {team.teamShortName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-3 text-center text-white/70 font-bold tabular-nums">{team.matchesPlayed}</td>
                      <td className="px-3 md:px-4 py-3 text-center font-black text-emerald-400 tabular-nums">{team.goalsScored}</td>
                      <td className="px-3 md:px-4 py-3 text-center font-black text-red-400 tabular-nums">{team.goalsConceded}</td>
                      <td className="px-3 md:px-4 py-3 text-center font-bold tabular-nums">
                        <span className={diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-white/55'}>
                          {diff > 0 ? '+' : ''}
                          {diff}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-3 text-center text-purple-400 font-bold tabular-nums">{team.assists}</td>
                      <td className="px-3 md:px-4 py-3 text-center text-yellow-400 font-bold tabular-nums">{team.yellowCards}</td>
                      <td className="px-3 md:px-4 py-3 text-center text-red-500 font-bold tabular-nums">{team.redCards}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
          <span>MJ · Matchs joués</span>
          <span>BP · Buts pour</span>
          <span>BC · Buts contre</span>
          <span>+/− · Différence</span>
          <span>A · Passes</span>
          <span>CJ · Cartons jaunes</span>
          <span>CR · Cartons rouges</span>
        </div>
      </motion.div>
    </div>
  );
}

function SectionHeader({
  code,
  label,
  title,
  icon: Icon = Users,
}: {
  code: string;
  label: string;
  title: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold text-emerald-400">
          <span className="block w-12 h-px bg-emerald-400" />
          <span className="font-mono">/ {code}</span>
          <span className="text-white/30">—</span>
          <span>{label}</span>
        </div>
        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-3 leading-tight">
          <span className="italic font-light text-white/35">{title.split(' ')[0]}</span>{' '}
          <span className="text-gradient-worldcup">{title.split(' ').slice(1).join(' ')}</span>
        </h3>
      </div>
      <Icon className="w-5 h-5 text-white/30 hidden md:block" />
    </div>
  );
}

function BigStatCard({
  icon: Icon,
  title,
  value,
  code,
  color,
  beam,
}: {
  icon: React.ElementType;
  title: string;
  value: number;
  code: string;
  color: Color;
  beam?: boolean;
}) {
  const c = COLORS[color];
  return (
    <Card className={`relative overflow-hidden bg-linear-to-br ${c.ring} via-black to-black border ${c.border} p-7 md:p-8`}>
      <div className="flex items-start justify-between mb-6">
        <div className={`w-12 h-12 rounded-xl bg-white/5 border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${c.text}`}>{code}</span>
      </div>
      <div className={`text-6xl md:text-7xl font-black tabular-nums tracking-tighter mb-2 ${c.text}`}>
        <NumberTicker value={value} />
      </div>
      <div className="text-sm md:text-base font-bold uppercase tracking-wider text-white/85">{title}</div>
      {beam && <BorderBeam size={180} duration={11} colorFrom="#10b981" colorTo="#facc15" borderWidth={1} />}
    </Card>
  );
}

function TeamStatCard({
  icon: Icon,
  title,
  team,
  stat,
  color,
}: {
  icon: React.ElementType;
  title: string;
  team: { teamName: string; teamShortName: string };
  stat: string;
  color: Color;
}) {
  const c = COLORS[color];
  return (
    <Card className={`relative overflow-hidden bg-linear-to-br ${c.ring} via-black to-black border ${c.border} p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-white/5 border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
        <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${c.text}`}>{title.toUpperCase().slice(0, 12)}</span>
      </div>
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1.5">{title}</div>
      <h4 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight mb-3">{team.teamName}</h4>
      <p className={`text-base font-black ${c.text} tabular-nums`}>{stat}</p>
    </Card>
  );
}

function PlayerStatCard({
  icon: Icon,
  title,
  player,
  stat,
  color,
  subtitle,
  beam,
}: {
  icon: React.ElementType;
  title: string;
  player: { playerName: string; playerNumber: number; teamName: string };
  stat: string;
  color: Color;
  subtitle?: string;
  beam?: boolean;
}) {
  const c = COLORS[color];
  return (
    <Card className={`relative overflow-hidden bg-linear-to-br ${c.ring} via-black to-black border ${c.border} p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-white/5 border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
        <User className={`w-4 h-4 ${c.text}`} />
      </div>
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1.5">{title}</div>
      <h4 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight mb-1">{player.playerName}</h4>
      <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.22em] mb-3">
        #{player.playerNumber} · {player.teamName}
      </div>
      <p className={`text-base font-black ${c.text} tabular-nums`}>{stat}</p>
      {subtitle && <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 mt-1">{subtitle}</p>}
      {beam && <BorderBeam size={150} duration={10} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1} />}
    </Card>
  );
}
