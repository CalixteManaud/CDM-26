import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useMemo, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  Users,
  Trophy,
  Shield,
  Plus,
  ArrowRight,
  Flame,
  Crown,
  ChevronRight,
  CircleDot,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';

interface Tournament {
  id: string;
  name: string;
  startDate: string;
}

interface Group {
  id: string;
  name: string;
}

interface Player {
  id: string;
  jerseyNumber: number;
  position: string;
}

interface Standing {
  id: string;
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
  tournament: Tournament;
  group?: Group | null;
  players?: Player[];
  standings?: Standing[];
}

type ActionResult<T> = { success: boolean; data?: T; error?: string };
type PageProps = { teams: Team[] };

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  const { getAllTeams } = await import('@/actions/teams');
  const result = (await getAllTeams()) as ActionResult<Team[]>;
  return {
    props: {
      teams: result.success && result.data ? JSON.parse(JSON.stringify(result.data)) : [],
    },
  };
};

type Accent = 'emerald' | 'yellow' | 'red' | 'purple';
const ACCENT: Record<Accent, { text: string; bg: string; border: string; ring: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/25', ring: 'from-emerald-950/40' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/25', ring: 'from-yellow-950/40' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/25', ring: 'from-red-950/40' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/25', ring: 'from-purple-950/40' },
};

const containerStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function SectionEyebrow({ num, label, accent }: { num: string; label: string; accent: Accent }) {
  const s = ACCENT[accent];
  return (
    <div className={`inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold ${s.text}`}>
      <span className={`block w-12 h-px ${s.bg}`} />
      <span className="font-mono">/ {num}</span>
      <span className="text-white/30">—</span>
      <span>{label}</span>
    </div>
  );
}

export default function TeamsPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { isSignedIn } = useUser();
  const [tournamentFilter, setTournamentFilter] = useState<string>('all');
  const reduce = useReducedMotion();

  const tournaments = useMemo(() => {
    const map = new Map<string, Tournament>();
    props.teams.forEach((t) => {
      if (!map.has(t.tournament.id)) map.set(t.tournament.id, t.tournament);
    });
    return Array.from(map.values());
  }, [props.teams]);

  const filteredTeams = useMemo(() => {
    if (tournamentFilter === 'all') return props.teams;
    return props.teams.filter((t) => t.tournament.id === tournamentFilter);
  }, [props.teams, tournamentFilter]);

  const counts = useMemo(() => {
    const totalTeams = props.teams.length;
    const totalPlayers = props.teams.reduce((acc, t) => acc + (t.players?.length ?? 0), 0);
    const totalGroups = new Set(props.teams.map((t) => t.group?.id).filter(Boolean)).size;
    return { totalTeams, totalPlayers, totalGroups, totalTournaments: tournaments.length };
  }, [props.teams, tournaments]);

  const groupedByTournament = useMemo(() => {
    const grouped = new Map<string, Team[]>();
    filteredTeams.forEach((t) => {
      const key = t.tournament.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    });
    return grouped;
  }, [filteredTeams]);

  return (
    <>
      <Head>
        <title>Équipes — CDM 26</title>
        <meta name="description" content="Toutes les nations engagées dans la Coupe du Monde FIFA 26 — effectifs, classements, coachs." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* ───────────────────────── HERO ───────────────────────── */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent"
            animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute -top-1/3 right-0 w-2/3 h-[140%] pointer-events-none blur-3xl bg-[radial-gradient(50%_50%_at_70%_30%,rgba(16,185,129,0.14),transparent_70%)]"
            animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="container mx-auto px-4 py-20 md:py-24 relative">
            <div className="flex items-end justify-between flex-wrap gap-8">
              <motion.div
                variants={reduce ? undefined : containerStagger}
                initial={reduce ? false : 'hidden'}
                animate={reduce ? undefined : 'show'}
              >
                <motion.div variants={reduce ? undefined : fadeUp}>
                  <SectionEyebrow num="TMS" label="Nations engagées" accent="emerald" />
                </motion.div>
                <motion.h1
                  variants={reduce ? undefined : fadeUp}
                  className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight"
                >
                  Les <span className="text-gradient-worldcup">équipes</span>
                  <br />
                  <span className="italic font-light text-white/35">du mondial.</span>
                </motion.h1>
                <motion.p
                  variants={reduce ? undefined : fadeUp}
                  className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed"
                >
                  Toutes les nations en compétition. Effectif, classement, coach,
                  groupe d'appartenance — tout sur une page.
                </motion.p>
                <motion.div variants={reduce ? undefined : fadeUp} className="mt-7 flex flex-wrap items-center gap-3">
                  <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <CircleDot className="w-3 h-3 mr-1" /> Saison 2026
                  </Badge>
                  <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                    <Tv className="w-3 h-3 mr-1" /> Twitch
                  </Badge>
                </motion.div>
              </motion.div>

              {isSignedIn && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                  animate={reduce ? undefined : { opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, type: 'spring', stiffness: 160, damping: 14 }}
                >
                  <Link href="/teams/new">
                    <ShimmerButton
                      background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                      shimmerColor="#ffffff"
                      className="px-7 py-4 font-black uppercase tracking-[0.18em] text-xs"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Inscrire une équipe
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </ShimmerButton>
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* ───────────────────────── STATS ───────────────────────── */}
        <section className="relative bg-black overflow-hidden border-b border-white/10">
          <div className="container mx-auto px-4 py-12">
            <motion.div
              variants={reduce ? undefined : containerStagger}
              initial={reduce ? false : 'hidden'}
              whileInView={reduce ? undefined : 'show'}
              viewport={{ once: true, margin: '-40px' }}
              className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-y border-white/10"
            >
              <StatCell code="TMS-TOT" label="Équipes" value={counts.totalTeams} icon={Shield} accent="emerald" reduce={!!reduce} />
              <StatCell code="PLY-ENG" label="Joueurs" value={counts.totalPlayers} icon={Users} accent="yellow" reduce={!!reduce} />
              <StatCell code="GRP-NB" label="Groupes" value={counts.totalGroups} icon={Flame} accent="red" reduce={!!reduce} />
              <StatCell code="TRN-AFF" label="Tournois" value={counts.totalTournaments} icon={Trophy} accent="purple" reduce={!!reduce} />
            </motion.div>
          </div>
        </section>

        {/* ───────────────────────── FILTRE + LISTE ───────────────────────── */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
              <div>
                <SectionEyebrow num="01" label="Sélection" accent="yellow" />
                <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                  {tournamentFilter === 'all' ? (
                    <>
                      Toutes les <span className="text-gradient-worldcup">nations</span>
                    </>
                  ) : (
                    <>
                      <span className="italic font-light text-white/35">Pour</span>{' '}
                      <span className="text-gradient-worldcup">
                        {tournaments.find((t) => t.id === tournamentFilter)?.name ?? '—'}
                      </span>
                    </>
                  )}
                </h2>
                <p className="text-white/50 mt-3 font-mono text-sm uppercase tracking-[0.22em]">
                  {filteredTeams.length} {filteredTeams.length > 1 ? 'résultats' : 'résultat'}
                </p>
              </div>

              {tournaments.length > 1 && (
                <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                  <SelectTrigger className="w-full sm:w-72 h-11 bg-white/3 border-white/15 hover:border-white/30 text-white">
                    <Trophy className="w-4 h-4 text-emerald-400 mr-1" />
                    <SelectValue placeholder="Filtrer par tournoi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les tournois</SelectItem>
                    {tournaments.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {filteredTeams.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-12">
                {Array.from(groupedByTournament.entries()).map(([tournamentId, teams]) => {
                  const tournament = teams[0].tournament;
                  const groupedByGroup = teams.reduce(
                    (acc, t) => {
                      const g = t.group?.name || 'Sans groupe';
                      if (!acc[g]) acc[g] = [];
                      acc[g].push(t);
                      return acc;
                    },
                    {} as Record<string, Team[]>
                  );

                  return (
                    <div key={tournamentId} className="space-y-6">
                      <Link href={`/tournaments/${tournamentId}`}>
                        <motion.div
                          initial={reduce ? false : { opacity: 0, y: 12 }}
                          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer bg-white/3 border border-white/10 hover:border-white/30 transition-all group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
                              / TOURNOI
                            </div>
                            <h2 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight group-hover:text-emerald-300 transition-colors">
                              {tournament.name}
                            </h2>
                          </div>
                          <Badge className="ml-2 bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                            {teams.length} {teams.length > 1 ? 'équipes' : 'équipe'}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                        </motion.div>
                      </Link>

                      {Object.entries(groupedByGroup).map(([groupName, groupTeams]) => (
                        <div key={groupName} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/3 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono uppercase tracking-[0.25em]">
                              <Shield className="w-3 h-3" />
                              {groupName}
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
                              {groupTeams.length} équipe{groupTeams.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {groupTeams.map((team, idx) => (
                              <TeamCard key={team.id} team={team} idx={idx} reduce={!!reduce} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function StatCell({
  code,
  label,
  value,
  icon: Icon,
  accent,
  reduce,
}: {
  code: string;
  label: string;
  value: number;
  icon: typeof Trophy;
  accent: Accent;
  reduce: boolean;
}) {
  const s = ACCENT[accent];
  return (
    <motion.div variants={reduce ? undefined : fadeUp} className="px-4 md:px-6 py-8 first:pl-0 md:first:pl-6">
      <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-3 flex items-center gap-1.5 font-mono">
        <Icon className="w-3 h-3" />
        {code}
      </div>
      <div className={`text-4xl md:text-6xl font-black mb-2 tracking-tighter tabular-nums ${s.text}`}>
        {reduce ? value : <NumberTicker value={value} />}
      </div>
      <div className="text-xs md:text-sm text-white/70 font-bold uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

function TeamCard({ team, idx, reduce }: { team: Team; idx: number; reduce: boolean }) {
  const standing = team.standings?.[0];
  const playersCount = team.players?.length ?? 0;
  const isFirst = standing?.position === 1;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: Math.min(idx * 0.05, 0.35), duration: 0.4 }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="relative group"
    >
      <Link href={`/teams/${team.id}`} className="block h-full">
        <Card
          className={`relative overflow-hidden h-full p-0 bg-linear-to-b ${
            isFirst ? 'from-yellow-950/30' : 'from-white/3'
          } to-transparent border-white/10 group-hover:border-white/30 transition-all duration-300`}
        >
          {/* Sheen diagonal au hover */}
          {!reduce && (
            <div className="pointer-events-none absolute inset-0 z-20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-linear-to-r from-transparent via-white/[0.07] to-transparent" />
          )}

          {/* Top strip */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono">
              # {team.id.slice(0, 6).toUpperCase()}
            </span>
            {standing ? <PositionPill position={standing.position} /> : (
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">— pos —</span>
            )}
          </div>

          {/* Body */}
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <TeamLogo team={team} />
              <div className="min-w-0">
                <h4 className={cn('font-black text-lg tracking-tight leading-tight truncate', isFirst ? 'text-yellow-200' : 'text-white')}>
                  {team.name}
                </h4>
                <p className="text-[10px] font-mono text-white/45 uppercase tracking-[0.22em] truncate">
                  {team.shortName}
                </p>
              </div>
            </div>

            {standing ? (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <MiniStat label="V" value={standing.won} color="text-emerald-400" />
                <MiniStat label="N" value={standing.drawn} color="text-yellow-400" />
                <MiniStat label="D" value={standing.lost} color="text-red-400" />
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
          </div>

          {/* BorderBeam : or permanent pour le 1er, vert→or révélé au hover sinon */}
          {isFirst ? (
            <BorderBeam size={140} duration={9} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1} />
          ) : (
            !reduce && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <BorderBeam size={130} duration={7} colorFrom="#10b981" colorTo="#facc15" borderWidth={1.2} />
              </div>
            )
          )}
        </Card>
      </Link>
    </motion.div>
  );
}

function TeamLogo({ team }: { team: Team }) {
  return (
    <div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5 shrink-0 transition-transform duration-300 group-hover:scale-105">
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt={team.name} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-linear-to-br from-emerald-500 via-yellow-500 to-red-500 flex items-center justify-center text-black font-black text-base">
          {team.shortName.substring(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
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

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center rounded-md bg-white/3 border border-white/10 py-2">
      <div className={`text-xl font-black tabular-nums ${color} leading-none`}>{value}</div>
      <div className="text-[9px] font-mono text-white/40 uppercase tracking-[0.25em] mt-1">{label}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="relative overflow-hidden bg-white/2 border-white/10 py-20 text-center">
      <div className="relative inline-flex p-5 rounded-2xl bg-white/5 border border-white/10 mb-6 mx-auto">
        <Users className="w-12 h-12 text-white/40" />
      </div>
      <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">Aucune équipe</h3>
      <p className="text-white/55 max-w-md mx-auto mb-8 px-4">
        Sélectionne un autre tournoi ou inscris la première nation.
      </p>
      <Link href="/teams/new" className="inline-flex">
        <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
          <Plus className="w-4 h-4 mr-1.5" />
          Inscrire une équipe
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </Link>
    </Card>
  );
}
