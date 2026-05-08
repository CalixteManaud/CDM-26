import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Trophy,
  Star,
  Goal,
  Plus,
  TrendingUp,
  Users,
  Loader2,
  Settings,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Tournament = { id: string; name: string; startDate: string };
type MatchRow = {
  id: string;
  matchDate: string;
  status: string;
  homeTeam: { shortName: string };
  awayTeam: { shortName: string };
  tournament: { name: string };
};

type ExistingMarket = {
  id: string;
  type: string;
  status: string;
  param: string | null;
  closesAt: string;
  matchId: string | null;
  tournamentId: string | null;
};

type PageProps = {
  tournaments: Tournament[];
  upcomingMatches: MatchRow[];
  existingMarkets: ExistingMarket[];
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getCurrentDbUserFromReq } = await import('@/lib/auth/page-auth');
  const dbUser = await getCurrentDbUserFromReq(ctx.req);
  if (!dbUser) return { redirect: { destination: '/sign-in', permanent: false } };

  const { isSiteAdmin } = await import('@/lib/utils/permissions');
  const admin = await isSiteAdmin(dbUser.id);
  if (!admin) return { notFound: true };

  const prisma = (await import('@/lib/prisma')).default;
  const [tournaments, matches, markets] = await Promise.all([
    prisma.tournament.findMany({
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, startDate: true },
    }),
    prisma.match.findMany({
      where: { status: 'SCHEDULED', matchDate: { gt: new Date() } },
      orderBy: { matchDate: 'asc' },
      take: 30,
      select: {
        id: true,
        matchDate: true,
        status: true,
        homeTeam: { select: { shortName: true } },
        awayTeam: { select: { shortName: true } },
        tournament: { select: { name: true } },
      },
    }),
    prisma.bettingMarket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        status: true,
        param: true,
        closesAt: true,
        matchId: true,
        tournamentId: true,
      },
    }),
  ]);

  return {
    props: {
      tournaments: JSON.parse(JSON.stringify(tournaments)),
      upcomingMatches: JSON.parse(JSON.stringify(matches)),
      existingMarkets: JSON.parse(JSON.stringify(markets)),
    },
  };
};

const MARKET_TYPES = [
  { value: 'MATCH_EXACT_SCORE', label: 'Score exact (match)', target: 'match' },
  { value: 'MATCH_TOTAL_GOALS', label: 'Plus / Moins de buts (match)', target: 'match' },
  { value: 'MATCH_BTTS', label: 'Both Teams To Score (match)', target: 'match' },
  { value: 'TOURNAMENT_TOP_SCORER', label: 'Meilleur buteur (tournoi)', target: 'tournament' },
  { value: 'TOURNAMENT_MVP', label: 'MVP (tournoi)', target: 'tournament' },
  { value: 'TOURNAMENT_WINNER', label: 'Vainqueur du tournoi', target: 'tournament' },
] as const;

export default function AdminMarketsPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [type, setType] = useState<typeof MARKET_TYPES[number]['value']>('MATCH_EXACT_SCORE');
  const [matchId, setMatchId] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [closesAt, setClosesAt] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [housePercentage, setHousePercentage] = useState('5');
  const [line, setLine] = useState('2.5');
  const [maxGoals, setMaxGoals] = useState('4');
  const [submitting, setSubmitting] = useState(false);

  const target = MARKET_TYPES.find((t) => t.value === type)?.target;

  const onCreate = async () => {
    if (target === 'match' && !matchId) {
      toast.error('Sélectionne un match');
      return;
    }
    if (target === 'tournament' && !tournamentId) {
      toast.error('Sélectionne un tournoi');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        type,
        closesAt: new Date(closesAt).toISOString(),
        housePercentage: Number.parseFloat(housePercentage) || 0,
      };
      if (target === 'match') body.matchId = matchId;
      if (target === 'tournament') body.tournamentId = tournamentId;
      if (type === 'MATCH_TOTAL_GOALS') body.line = line;
      if (type === 'MATCH_EXACT_SCORE') body.maxGoals = Number.parseInt(maxGoals, 10) || 4;

      const res = await fetch('/api/admin/markets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur');
        return;
      }
      toast.success('Marché créé');
      router.replace(router.asPath, undefined, { scroll: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin · Marchés — CDM 26</title>
      </Head>
      <div className="relative bg-black text-white min-h-screen">
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.32em] text-yellow-400 font-bold mb-4">
            <Settings className="w-4 h-4" />
            <span>/ Admin · marchés de paris</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Gestion des <span className="text-gradient-worldcup">marchés</span>
          </h1>
          <p className="text-white/55 mt-3 text-sm md:text-base max-w-2xl">
            Crée des marchés (score exact, total buts, BTTS, top buteur, MVP, vainqueur) pour
            les matchs et tournois. Chaque marché ouvre des paris jusqu'à sa date de fermeture.
          </p>

          {/* CREATE FORM */}
          <Card className="mt-10 bg-white/[0.02] border-white/10 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-mono uppercase tracking-[0.32em] text-emerald-300 font-bold">
                / Nouveau marché
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/55">
                  Type de marché
                </Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger className="mt-2 bg-white/5 border-white/15">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/55">
                  Ferme à
                </Label>
                <Input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="mt-2 bg-white/5 border-white/15"
                />
              </div>

              {target === 'match' && (
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/55">
                    Match concerné
                  </Label>
                  <Select value={matchId} onValueChange={setMatchId}>
                    <SelectTrigger className="mt-2 bg-white/5 border-white/15">
                      <SelectValue placeholder="Sélectionne un match…" />
                    </SelectTrigger>
                    <SelectContent>
                      {props.upcomingMatches.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.tournament.name} · {m.homeTeam.shortName} vs {m.awayTeam.shortName} ·{' '}
                          {format(new Date(m.matchDate), 'dd MMM HH:mm', { locale: fr })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {target === 'tournament' && (
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/55">
                    Tournoi concerné
                  </Label>
                  <Select value={tournamentId} onValueChange={setTournamentId}>
                    <SelectTrigger className="mt-2 bg-white/5 border-white/15">
                      <SelectValue placeholder="Sélectionne un tournoi…" />
                    </SelectTrigger>
                    <SelectContent>
                      {props.tournaments.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} · {format(new Date(t.startDate), 'MMM yyyy', { locale: fr })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/55">
                  Commission maison (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  value={housePercentage}
                  onChange={(e) => setHousePercentage(e.target.value)}
                  className="mt-2 bg-white/5 border-white/15"
                />
              </div>

              {type === 'MATCH_TOTAL_GOALS' && (
                <div>
                  <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/55">
                    Ligne (ex 2.5)
                  </Label>
                  <Input
                    type="text"
                    value={line}
                    onChange={(e) => setLine(e.target.value)}
                    className="mt-2 bg-white/5 border-white/15 font-mono"
                  />
                </div>
              )}

              {type === 'MATCH_EXACT_SCORE' && (
                <div>
                  <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/55">
                    Buts max par équipe
                  </Label>
                  <Input
                    type="number"
                    min={2}
                    max={6}
                    value={maxGoals}
                    onChange={(e) => setMaxGoals(e.target.value)}
                    className="mt-2 bg-white/5 border-white/15"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                onClick={onCreate}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-black font-black uppercase tracking-[0.18em] text-xs"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Créer le marché
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* EXISTING MARKETS */}
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-mono uppercase tracking-[0.32em] text-purple-300 font-bold">
                / {props.existingMarkets.length} marchés (50 derniers)
              </span>
            </div>

            {props.existingMarkets.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
                <span className="text-sm font-mono uppercase tracking-[0.22em] text-white/40">
                  Aucun marché créé pour le moment
                </span>
              </div>
            ) : (
              <ul className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
                {props.existingMarkets.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.025]">
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 w-44 truncate">
                      {m.type}
                    </span>
                    <Badge
                      className={
                        m.status === 'OPEN'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-[9px] font-mono uppercase tracking-[0.22em]'
                          : m.status === 'SETTLED'
                          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300 text-[9px] font-mono uppercase tracking-[0.22em]'
                          : 'bg-white/5 border-white/15 text-white/45 text-[9px] font-mono uppercase tracking-[0.22em]'
                      }
                    >
                      {m.status}
                    </Badge>
                    {m.param && (
                      <span className="text-[10px] font-mono text-white/40">/ {m.param}</span>
                    )}
                    <span className="text-[10px] font-mono text-white/40 flex-1 truncate">
                      ferme {format(new Date(m.closesAt), 'dd MMM HH:mm', { locale: fr })}
                    </span>
                    {m.tournamentId && (
                      <Link
                        href={`/paris/tournoi/${m.tournamentId}`}
                        className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300 hover:text-emerald-200"
                      >
                        Voir <ArrowRight className="inline w-3 h-3 ml-0.5" />
                      </Link>
                    )}
                    {m.matchId && (
                      <Link
                        href={`/matches/${m.matchId}`}
                        className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300 hover:text-emerald-200"
                      >
                        Voir <ArrowRight className="inline w-3 h-3 ml-0.5" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
