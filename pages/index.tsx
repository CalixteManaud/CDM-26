import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  CircleDot,
  Crown,
  Eye,
  Flame,
  Goal,
  MessageCircle,
  Play,
  Radio,
  Sparkles,
  Swords,
  Trophy,
  Tv,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Ripple } from '@/components/ui/ripple';
import Marquee from '@/components/ui/marquee';
import { ThreeDMarquee } from '@/components/ui/three-d-marquee';
import { AnimatedTestimonials, type Testimonial } from '@/components/ui/animated-testimonials';

import { HeroCdm26 } from '@/components/landing/hero-cdm26';
import { TournamentFormatTimeline } from '@/components/landing/tournament-format-timeline';
import { TeamsOrbit } from '@/components/landing/teams-orbit';

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  '🇫🇷 FRANCE 3 — 1 BRAZIL 🇧🇷  ·  90+2′',
  'GROUPE D  ·  JOURNÉE 04',
  'CE SOIR 21h00  ·  🇩🇪 ALLEMAGNE — ARGENTINE 🇦🇷',
  'PEAK VIEWERS  ·  12,847',
  'TWITCH.TV/BLAIZE  ·  ON AIR',
  'POOL DE PARIS OUVERT  ·  142,000 PTS',
  'COMING UP  ·  HUITIÈMES DE FINALE',
  'STREAM QUALITY  ·  1080p60',
];

const STATS = [
  { code: 'NTN-32', icon: Trophy, value: 32, suffix: '', label: 'Nations engagées', color: 'text-emerald-400' },
  { code: 'PLY-500', icon: Users, value: 500, suffix: '+', label: 'Joueurs inscrits', color: 'text-yellow-400' },
  { code: 'MTC-150', icon: Swords, value: 150, suffix: '+', label: 'Matchs joués', color: 'text-red-400' },
  { code: 'VWR-12K', icon: Eye, value: 12000, suffix: '+', label: 'Viewers cumulés', color: 'text-purple-400' },
] as const;

type FixtureStatus = 'LIVE' | 'SOON' | 'FT';
const FIXTURES: Array<{
  home: string;
  flagH: string;
  away: string;
  flagA: string;
  scoreH: number | null;
  scoreA: number | null;
  status: FixtureStatus;
  meta: string;
  viewers: number | null;
  group: string;
}> = [
  { home: 'France', flagH: '🇫🇷', away: 'Brésil', flagA: '🇧🇷', scoreH: 3, scoreA: 1, status: 'LIVE', meta: "78′ · 2nd MT", viewers: 8412, group: 'GROUPE D · J04' },
  { home: 'Allemagne', flagH: '🇩🇪', away: 'Argentine', flagA: '🇦🇷', scoreH: null, scoreA: null, status: 'SOON', meta: 'Ce soir · 21h00', viewers: null, group: 'GROUPE C · J05' },
  { home: 'Maroc', flagH: '🇲🇦', away: 'Espagne', flagA: '🇪🇸', scoreH: 2, scoreA: 2, status: 'FT', meta: 'Terminé · 90+4', viewers: 4128, group: 'GROUPE B · J04' },
];

const STREAMERS = [
  { name: 'BLAIZE', country: '🇫🇷', viewers: 8412, label: 'CDM 26 · GROUPE D · LIVE', live: true, accent: 'from-purple-700/40 via-purple-900/30 to-black' },
  { name: 'KOOPS', country: '🇧🇷', viewers: 4128, label: 'Highlights · Brésil vs France', live: true, accent: 'from-emerald-700/40 via-emerald-900/30 to-black' },
  { name: 'ZAHRA', country: '🇲🇦', viewers: 2317, label: 'Co-stream · 8e de finale', live: true, accent: 'from-red-700/40 via-red-900/30 to-black' },
  { name: 'KAINE', country: '🇦🇷', viewers: 0, label: 'Off — replays disponibles', live: false, accent: 'from-yellow-700/30 via-yellow-900/20 to-black' },
  { name: 'NOVA', country: '🇩🇪', viewers: 1284, label: 'Tactical breakdown · Live', live: true, accent: 'from-purple-700/40 via-purple-900/30 to-black' },
  { name: 'SOLEIL', country: '🇪🇸', viewers: 0, label: 'Off — Demain à 19h00', live: false, accent: 'from-emerald-700/30 via-emerald-900/20 to-black' },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Représenter la France sur la scène CDM 26, c'était un kiff total. Ambiance hallucinante sur Twitch, niveau de jeu énorme, organisation au top. FIFA 26 + Coupe du Monde, c'est le combo parfait.",
    name: 'Alex ProPlayer',
    role: 'Champion 🇫🇷 — Saison 2024',
    image: '/logo.png',
  },
  {
    quote:
      "J'ai monté l'équipe du Brésil de zéro et on a fini en demi-finale. Voir nos matchs streamés en direct devant 3000 viewers, c'est une émotion incroyable. Le mondial esport, c'est ici.",
    name: 'Sarah Gaming',
    role: 'Coach 🇧🇷 — Demi-finaliste 2024',
    image: '/logo.png',
  },
  {
    quote:
      "Les streams Twitch sont d'une qualité folle, le bracket auto qui s'actualise en temps réel, les stats détaillées… CDM 26 c'est un vrai produit pro. J'adore commenter ces matchs.",
    name: 'Mike Streamer',
    role: 'Caster officiel CDM 26',
    image: '/logo.png',
  },
];

const CHAT_LINES = [
  { user: 'KylianFan10', msg: "OOOH QUEL BUT 🔥🔥", color: 'text-emerald-400' },
  { user: 'BrazilianGod', msg: 'on va revenir, restez calmes', color: 'text-yellow-400' },
  { user: 'Mod_Akira', msg: 'rappel : !parier <équipe> <points>', color: 'text-red-400' },
  { user: 'cdm26_bot', msg: 'Pool actuel : 142,000 pts · cote France 1.42', color: 'text-purple-400' },
  { user: 'StreamQueen', msg: 'meilleur match du tournoi sans débat', color: 'text-emerald-400' },
  { user: 'Bratislav', msg: 'NEYMAR EN DESSOUS DE LA BARRE 😭', color: 'text-yellow-400' },
  { user: 'cdm26_bot', msg: '🇫🇷 France qualifiée pour les 8es', color: 'text-purple-400' },
];

const SPONSORS = [
  'EA SPORTS FC 26',
  '★',
  'OFFICIAL TWITCH BROADCAST',
  '★',
  'POWERED BY WIZEBOT',
  '★',
  'BLAIZE PRODUCTIONS',
  '★',
  'CDM 26 OFFICIAL',
  '★',
  'WORLD CUP ESPORT SERIES',
  '★',
];

const MARQUEE_IMAGES = Array.from({ length: 16 }, () => '/logo.png');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type Accent = 'emerald' | 'yellow' | 'red' | 'purple';
const ACCENT_STYLES: Record<Accent, { text: string; bg: string; border: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/30' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/30' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/30' },
};

function SectionEyebrow({ num, label, accent }: { num: string; label: string; accent: Accent }) {
  const s = ACCENT_STYLES[accent];
  return (
    <div className={`inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold ${s.text}`}>
      <span className={`block w-12 h-px ${s.bg}`} />
      <span className="font-mono">/ {num}</span>
      <span className="text-white/30">—</span>
      <span>{label}</span>
    </div>
  );
}

function CornerBracket({ position, color = 'border-white/30' }: { position: 'tl' | 'tr' | 'bl' | 'br'; color?: string }) {
  const map = {
    tl: 'top-0 left-0 border-t border-l',
    tr: 'top-0 right-0 border-t border-r',
    bl: 'bottom-0 left-0 border-b border-l',
    br: 'bottom-0 right-0 border-b border-r',
  };
  return <span aria-hidden className={`absolute w-4 h-4 ${map[position]} ${color}`} />;
}

function FixtureCard({ f, index }: { f: (typeof FIXTURES)[number]; index: number }) {
  const isLive = f.status === 'LIVE';
  const isFT = f.status === 'FT';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="relative group"
    >
      <Card
        className={`relative overflow-hidden bg-linear-to-b ${
          isLive ? 'from-red-950/30' : 'from-white/3'
        } to-transparent border-white/10 group-hover:border-white/30 transition-all duration-300 p-0`}
      >
        {/* Top status strip */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono">{f.group}</span>
          {isLive ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400">
              <span className="live-dot" />
              LIVE · {f.meta}
            </span>
          ) : isFT ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono">{f.meta}</span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 font-mono">{f.meta}</span>
          )}
        </div>

        {/* Score */}
        <div className="px-5 py-9 relative">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="text-5xl drop-shadow-lg">{f.flagH}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/80 font-bold text-center">{f.home}</div>
            </div>
            <div className="flex items-center gap-2 text-5xl md:text-6xl font-black tabular-nums leading-none">
              <span className={isLive ? 'text-red-400' : isFT ? 'text-white' : 'text-white/30'}>
                {f.scoreH ?? '—'}
              </span>
              <span className="text-white/15 text-3xl italic">:</span>
              <span className={isLive ? 'text-red-400' : isFT ? 'text-white' : 'text-white/30'}>
                {f.scoreA ?? '—'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-5xl drop-shadow-lg">{f.flagA}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/80 font-bold text-center">{f.away}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between bg-white/2">
          {f.viewers != null ? (
            <span className="flex items-center gap-1.5 text-xs text-white/60 font-mono">
              <Eye className="w-3 h-3" />
              <NumberTicker value={f.viewers} className="tabular-nums text-white/60" />
              <span className="text-white/40">viewers</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-white/60 font-mono uppercase tracking-widest">
              <Calendar className="w-3 h-3" />
              À venir
            </span>
          )}
          <Link
            href="/matches"
            className="text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 font-mono"
          >
            Voir <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {isLive && (
          <BorderBeam size={130} duration={6} colorFrom="#ef4444" colorTo="#f59e0b" borderWidth={1.5} />
        )}
      </Card>
    </motion.div>
  );
}

function StreamerCard({ s }: { s: (typeof STREAMERS)[number] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -6 }}
      className="relative group"
    >
      <Card className="relative overflow-hidden bg-linear-to-b from-white/5 to-transparent border-white/10 group-hover:border-purple-500/30 transition-all p-0">
        {/* Stream preview */}
        <div className={`relative aspect-video bg-linear-to-br ${s.accent} overflow-hidden`}>
          <div className="absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(145,70,255,0.35),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(16,185,129,0.18),transparent_55%)]" />
          </div>
          {/* Scan-line overlay */}
          <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)',
            }}
          />
          <div className="absolute right-4 top-4 text-5xl drop-shadow-lg">{s.country}</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-white text-xl tracking-tighter shadow-2xl">
              {s.name.slice(0, 2)}
            </div>
          </div>
          {s.live ? (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded">
              <span className="live-dot bg-white" /> LIVE
            </div>
          ) : (
            <div className="absolute top-4 left-4 bg-white/10 backdrop-blur text-white/70 text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded border border-white/10">
              OFFLINE
            </div>
          )}
        </div>
        {/* Body */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-white text-xl tracking-tight">{s.name}</h3>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">{s.country}</span>
          </div>
          <div className="text-sm text-white/60 mb-5 font-mono">{s.label}</div>
          <div className="flex items-center justify-between">
            {s.live ? (
              <span className="flex items-center gap-1.5 text-xs text-white/70 font-mono">
                <Eye className="w-3 h-3" />
                <NumberTicker value={s.viewers} />
                <span className="text-white/40">viewers</span>
              </span>
            ) : (
              <span className="text-xs text-white/40 font-mono uppercase tracking-widest">— · —</span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] uppercase tracking-[0.2em] border-white/20 hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-300 font-bold"
            >
              Twitch <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
        {s.live && <BorderBeam size={120} duration={8} colorFrom="#9146ff" colorTo="#f59e0b" borderWidth={1} />}
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CDM26Home() {
  const { isSignedIn } = useUser();

  return (
    <>
      <Head>
        <title>CDM 26 — Le Mondial FIFA 26 sur Twitch</title>
        <meta
          name="description"
          content="La Coupe du Monde FIFA 26 en version esport. 32 nations, 8 groupes, des matchs diffusés en direct sur Twitch. Forme ta nation, joue les éliminatoires, hisse ton drapeau."
        />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate">
        {/* ───── 01. HERO ───── */}
        <HeroCdm26 />

        {/* ───── BROADCAST TICKER BAR ───── */}
        <section className="relative border-y border-white/10 bg-black overflow-hidden">
          <div className="flex items-stretch">
            <div className="shrink-0 bg-red-600 text-white px-5 py-3.5 flex items-center gap-2.5 font-black uppercase tracking-[0.22em] text-[11px] z-10 relative">
              <span className="live-dot bg-white" />
              <span>ON&nbsp;AIR</span>
              <Separator orientation="vertical" className="bg-white/30 mx-2 h-3" />
              <span className="font-mono">FEED</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Marquee className="py-3.5 [--duration:55s] [--gap:3rem]" pauseOnHover repeat={2}>
                {TICKER_ITEMS.map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-3 text-sm font-mono text-white/80 uppercase tracking-wide whitespace-nowrap"
                  >
                    <CircleDot className="w-3 h-3 text-emerald-400" />
                    {item}
                  </span>
                ))}
              </Marquee>
            </div>
            <div className="shrink-0 hidden md:flex items-center px-5 bg-white/5 border-l border-white/10">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-[0.25em]">SE26 / W04</span>
            </div>
          </div>
        </section>

        {/* ───── 02. STADIUM STATS ───── */}
        <section className="relative bg-black overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />

          <div className="container mx-auto px-4 py-20 md:py-24 relative">
            <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
              <div className="max-w-2xl">
                <SectionEyebrow num="02" label="Le mondial en chiffres" accent="yellow" />
                <h2 className="text-5xl md:text-7xl font-black mt-4 leading-[0.92] tracking-tight">
                  <span className="italic font-light text-white/35">Plus qu'un</span>
                  <br />
                  <span className="text-gradient-worldcup">tournoi virtuel.</span>
                </h2>
              </div>
              <p className="max-w-md text-sm text-white/60 leading-relaxed border-l-2 border-white/10 pl-4">
                32 nations, 8 groupes, 1 trophée. Le format Coupe du Monde complet, joué pendant 6 semaines, diffusé live sur Twitch chaque soir. Pas de mocks, pas d'à-peu-près — un vrai championnat.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-y border-white/10">
              {STATS.map((s) => (
                <div key={s.code} className="px-6 py-10 first:pl-0 md:first:pl-6 relative group">
                  <div className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-3 flex items-center gap-1.5 font-mono">
                    <s.icon className="w-3 h-3" />
                    {s.code}
                  </div>
                  <div className={`text-5xl md:text-7xl font-black mb-2 tracking-tighter tabular-nums ${s.color}`}>
                    <NumberTicker value={s.value} />
                    <span>{s.suffix}</span>
                  </div>
                  <div className="text-sm text-white/70 font-bold uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── 03. FIXTURES PREVIEW ───── */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-linear-to-r from-transparent via-red-500/30 to-transparent" />
          <div className="container mx-auto px-4 py-24 relative">
            <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
              <div>
                <SectionEyebrow num="03" label="Live & à venir" accent="red" />
                <h2 className="text-5xl md:text-7xl font-black mt-4 leading-[0.92] tracking-tight">
                  Les matchs <span className="italic font-light text-white/35">qui</span>
                  <br />
                  <span className="text-gradient-worldcup">comptent.</span>
                </h2>
              </div>
              <Link
                href="/matches"
                className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-white/80 hover:text-white transition border border-white/20 hover:border-white/40 px-6 py-3.5 rounded-full font-mono"
              >
                Tous les matchs
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {FIXTURES.map((f, i) => (
                <FixtureCard key={i} f={f} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ───── 04. POURQUOI CDM 26 — BENTO ───── */}
        <section className="relative bg-black border-b border-white/10 py-24 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mb-14">
              <SectionEyebrow num="04" label="Pourquoi CDM 26" accent="emerald" />
              <h2 className="text-5xl md:text-7xl font-black mt-4 leading-[0.92] tracking-tight">
                Une plateforme
                <br />
                <span className="italic font-light text-white/35">conçue pour le</span>{' '}
                <span className="text-gradient-worldcup">spectacle.</span>
              </h2>
            </div>

            <div className="grid grid-cols-12 gap-5 auto-rows-[180px]">
              {/* BIG: Brackets temps réel */}
              <div className="col-span-12 md:col-span-8 row-span-2 relative">
                <Card className="relative h-full overflow-hidden bg-linear-to-br from-emerald-950/40 via-black to-black border-emerald-500/20 p-8 md:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-emerald-400" />
                      </div>
                      <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.2em] text-[10px] font-mono">
                        AUTO-CALC
                      </Badge>
                    </div>
                    <h3 className="text-3xl md:text-5xl font-black mb-4 text-white leading-[0.95] tracking-tight">
                      Brackets en
                      <br />
                      <span className="text-gradient-worldcup">temps réel.</span>
                    </h3>
                    <p className="text-white/60 max-w-md leading-relaxed">
                      Le tableau d'élimination s'actualise dès qu'un match se termine. Tie-breakers automatiques, qualifications calculées au point près, classements live.
                    </p>
                  </div>

                  {/* Mini bracket SVG */}
                  <div className="relative mt-6 hidden md:block">
                    <svg viewBox="0 0 400 100" className="w-full max-w-md text-emerald-500/40">
                      <g stroke="currentColor" strokeWidth="1.5" fill="none">
                        <line x1="0" y1="20" x2="80" y2="20" />
                        <line x1="0" y1="80" x2="80" y2="80" />
                        <line x1="80" y1="20" x2="80" y2="80" />
                        <line x1="80" y1="50" x2="180" y2="50" />
                        <line x1="180" y1="20" x2="260" y2="20" />
                        <line x1="180" y1="80" x2="260" y2="80" />
                        <line x1="180" y1="50" x2="180" y2="20" strokeDasharray="2 2" opacity="0.5" />
                        <line x1="180" y1="50" x2="180" y2="80" strokeDasharray="2 2" opacity="0.5" />
                        <line x1="260" y1="20" x2="260" y2="80" />
                        <line x1="260" y1="50" x2="360" y2="50" />
                      </g>
                      <g fill="currentColor" className="text-emerald-400">
                        <circle cx="0" cy="20" r="3" />
                        <circle cx="0" cy="80" r="3" />
                        <circle cx="180" cy="50" r="4" className="animate-pulse" />
                        <circle cx="360" cy="50" r="5" fill="#facc15" />
                      </g>
                    </svg>
                  </div>

                  <BorderBeam size={250} duration={12} colorFrom="#10b981" colorTo="#facc15" borderWidth={1} />
                </Card>
              </div>

              {/* Twitch */}
              <div className="col-span-12 md:col-span-4 row-span-1 relative">
                <Card className="relative h-full overflow-hidden bg-linear-to-br from-purple-950/50 via-black to-black border-purple-500/20 p-6 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <Tv className="w-8 h-8 text-purple-400" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">
                      1080p60
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-1.5 leading-tight">
                      Streams Twitch <span className="text-gradient-twitch">officiels</span>
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Tous les matchs en direct sur la chaîne CDM 26. Co-streams autorisés, timelines synchros.
                    </p>
                  </div>
                </Card>
              </div>

              {/* Buts */}
              <div className="col-span-6 md:col-span-2 row-span-1 relative">
                <Card className="relative h-full overflow-hidden bg-black border-white/10 p-5 flex flex-col justify-between">
                  <Goal className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="text-3xl md:text-4xl font-black text-yellow-400 tabular-nums leading-none">
                      <NumberTicker value={847} />
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 mt-2 font-mono">
                      Buts inscrits
                    </div>
                  </div>
                </Card>
              </div>

              {/* Chat */}
              <div className="col-span-6 md:col-span-2 row-span-1 relative">
                <Card className="relative h-full overflow-hidden bg-black border-white/10 p-5 flex flex-col justify-between">
                  <MessageCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="text-3xl md:text-4xl font-black text-red-400 tabular-nums leading-none">
                      <NumberTicker value={23} />K
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.25em] text-white/40 mt-2 font-mono">
                      Messages chat
                    </div>
                  </div>
                </Card>
              </div>

              {/* Pari mutuel */}
              <div className="col-span-12 md:col-span-6 row-span-1 relative">
                <Card className="relative h-full overflow-hidden bg-linear-to-br from-yellow-950/40 via-black to-black border-yellow-500/20 p-6 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Crown className="w-7 h-7 text-yellow-400" />
                      <Badge className="bg-yellow-500/15 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.2em] text-[10px] font-mono">
                        WIZEBOT
                      </Badge>
                    </div>
                    <code className="text-yellow-300 font-mono text-xs bg-black/40 border border-yellow-500/20 px-2 py-1 rounded">
                      !parier
                    </code>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-1 leading-tight">
                      Pari mutuel <span className="text-yellow-400">Twitch</span>
                    </h3>
                    <p className="text-white/60 text-sm">
                      Mise tes points de chaîne. Cotes calculées en live, gains crédités en automatique.
                    </p>
                  </div>
                  <BorderBeam size={150} duration={10} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1} />
                </Card>
              </div>

              {/* Stats détaillées */}
              <div className="col-span-12 md:col-span-6 row-span-1 relative">
                <Card className="relative h-full overflow-hidden bg-linear-to-br from-red-950/30 via-black to-black border-red-500/20 p-6 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <Activity className="w-7 h-7 text-red-400" />
                    <Badge className="bg-red-500/15 border-red-500/30 text-red-300 uppercase tracking-[0.2em] text-[10px] font-mono">
                      STATS PRO
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-1 leading-tight">
                      Stats détaillées <span className="italic font-light text-white/40">par joueur</span>
                    </h3>
                    <p className="text-white/60 text-sm">
                      Buts, passes, cartons, possession. Top scoreurs, top assists, MVP par match.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ───── WORDMARK BREAKER ───── */}
        <section className="relative py-10 md:py-14 bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
          <Marquee className="[--gap:3rem] [--duration:35s]" repeat={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="text-[7rem] md:text-[12rem] lg:text-[14rem] font-black italic leading-none whitespace-nowrap select-none"
                style={{
                  WebkitTextStroke: '1.5px rgba(255,255,255,0.18)',
                  color: 'transparent',
                  letterSpacing: '-0.04em',
                }}
              >
                CDM·26 ★
              </span>
            ))}
          </Marquee>
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
        </section>

        {/* ───── 05. TOURNAMENT FORMAT TIMELINE ───── */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="container mx-auto px-4 pt-20">
            <SectionEyebrow num="05" label="Format du tournoi" accent="emerald" />
            <h2 className="text-5xl md:text-7xl font-black mt-4 mb-6 leading-[0.92] tracking-tight">
              <span className="italic font-light text-white/35">De la phase de poules</span>
              <br />
              <span className="text-gradient-worldcup">au sacre.</span>
            </h2>
          </div>
          <TournamentFormatTimeline />
        </section>

        {/* ───── 06. LIVE ON TWITCH ───── */}
        <section className="relative bg-black border-b border-white/10 py-24 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-40 top-0 w-150 h-150 rounded-full bg-purple-700/15 blur-[120px]" />
            <div className="absolute -right-40 bottom-0 w-125 h-125 rounded-full bg-purple-900/20 blur-[120px]" />
          </div>

          <div className="container mx-auto px-4 relative">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              {/* LEFT — Mock stream player */}
              <div className="lg:col-span-7 relative">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-purple-500/30 group shadow-2xl shadow-purple-500/20">
                  {/* Ripple background */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Ripple mainCircleSize={180} numCircles={6} />
                  </div>
                  {/* Pitch gradient atmosphere */}
                  <div className="absolute inset-0 bg-linear-to-tr from-emerald-950/30 via-transparent to-purple-900/30 pointer-events-none" />
                  {/* Live badge */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.22em] px-3 py-1.5 rounded">
                    <span className="live-dot bg-white" /> LIVE
                  </div>
                  <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-md text-white text-xs font-mono px-3 py-1.5 rounded flex items-center gap-1.5 border border-white/10">
                    <Eye className="w-3 h-3 text-purple-400" /> 8,412 viewers
                  </div>
                  {/* Center play */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <a
                      href="https://www.twitch.tv/blaize"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-20 h-20 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white shadow-2xl shadow-purple-500/50 group-hover:scale-110 transition cursor-pointer"
                    >
                      <Play className="w-8 h-8 fill-white translate-x-0.5" />
                    </a>
                  </div>
                  {/* Bottom bar */}
                  <div className="absolute bottom-0 inset-x-0 p-5 bg-linear-to-t from-black via-black/70 to-transparent z-10">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div className="text-white text-base md:text-lg font-black tracking-tight">
                          🇫🇷 France — Brésil 🇧🇷
                        </div>
                        <div className="text-white/60 text-xs font-mono mt-0.5 uppercase tracking-widest">
                          twitch.tv/blaize · CDM 26 · Phase de poules
                        </div>
                      </div>
                      <div className="text-3xl font-black tabular-nums text-white hidden sm:block">
                        <span className="text-red-400">3</span>
                        <span className="text-white/30 mx-1.5 italic">:</span>
                        <span>1</span>
                      </div>
                    </div>
                  </div>
                  {/* Decorative corner brackets */}
                  <CornerBracket position="tl" color="border-purple-500/60" />
                  <CornerBracket position="tr" color="border-purple-500/60" />
                  <CornerBracket position="bl" color="border-purple-500/60" />
                  <CornerBracket position="br" color="border-purple-500/60" />
                </div>
                {/* Below player — channel info pill */}
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                    <div className="w-7 h-7 rounded-full bg-[#9146ff] flex items-center justify-center text-white text-xs font-black">
                      B
                    </div>
                    <span className="text-sm font-bold text-white">blaize</span>
                    <span className="text-xs text-white/40 font-mono">· chaîne officielle</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/60 font-mono uppercase tracking-widest">
                    <Radio className="w-3 h-3 text-red-500 animate-pulse" /> En direct depuis 2h14
                  </div>
                </div>
              </div>

              {/* RIGHT — Chat + info */}
              <div className="lg:col-span-5">
                <SectionEyebrow num="06" label="Diffusion live" accent="purple" />
                <h2 className="text-4xl md:text-6xl font-black mt-4 leading-[0.92] tracking-tight mb-5">
                  Chaque match,
                  <br />
                  <span className="text-gradient-twitch">en direct.</span>
                </h2>
                <p className="text-white/60 mb-6 leading-relaxed">
                  Le chat Twitch fait partie du jeu. Mise tes points avec{' '}
                  <code className="text-purple-300 font-mono bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded text-sm">
                    !parier
                  </code>{' '}
                  , soutiens ta nation, monte au classement des parieurs.
                </p>

                {/* Mini chat */}
                <div className="bg-white/2.5 border border-white/10 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-white/50">
                      <MessageCircle className="w-3 h-3 text-purple-400" /> Chat #blaize
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40">
                      <span className="live-dot" /> Streaming
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {CHAT_LINES.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.07 }}
                        className="text-sm leading-relaxed"
                      >
                        <span className={`font-black ${m.color}`}>{m.user}</span>
                        <span className="text-white/30 mx-1">:</span>
                        <span className="text-white/85">{m.msg}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="https://www.twitch.tv/blaize" target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="bg-[#9146ff] hover:bg-[#7c3aed] text-white font-black uppercase tracking-[0.18em] text-xs px-6"
                    >
                      <Tv className="w-4 h-4 mr-2" /> Suivre blaize
                    </Button>
                  </a>
                  <Link href="/matches">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs px-6"
                    >
                      Programme TV <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── 07. NATIONS ORBIT ───── */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="container mx-auto px-4 pt-20">
            <SectionEyebrow num="07" label="32 nations en compétition" accent="yellow" />
            <h2 className="text-5xl md:text-7xl font-black mt-4 mb-6 leading-[0.92] tracking-tight">
              <span className="italic font-light text-white/35">Le globe</span>{' '}
              <span className="text-gradient-worldcup">en orbite.</span>
            </h2>
          </div>
          <TeamsOrbit />
        </section>

        {/* ───── 08. 3D MARQUEE GALLERY ───── */}
        <section className="relative bg-black py-24 overflow-hidden border-b border-white/10">
          <div className="container mx-auto px-4 mb-12">
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <SectionEyebrow num="08" label="Les moments forts" accent="red" />
                <h2 className="text-5xl md:text-7xl font-black mt-4 leading-[0.92] tracking-tight">
                  La <span className="text-gradient-worldcup">galerie</span>
                  <br />
                  <span className="italic font-light text-white/35">du Mondial.</span>
                </h2>
              </div>
              <div className="flex items-center gap-3 self-end pb-2">
                <Badge className="bg-red-500/10 border-red-500/30 text-red-300 uppercase tracking-[0.2em] text-[10px] font-mono">
                  <Flame className="w-3 h-3 mr-1" /> Top 16
                </Badge>
                <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.2em] text-[10px] font-mono">
                  Saison 2024
                </Badge>
              </div>
            </div>
          </div>
          <div className="h-105 md:h-130 relative">
            <ThreeDMarquee images={MARQUEE_IMAGES} pauseOnHover />
            <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-black to-transparent pointer-events-none" />
          </div>
        </section>

        {/* ───── 09. STREAMERS GRID ───── */}
        <section className="relative bg-black border-b border-white/10 py-24 overflow-hidden">
          <div className="container mx-auto px-4 relative">
            <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
              <div>
                <SectionEyebrow num="09" label="Casters & Streamers" accent="purple" />
                <h2 className="text-5xl md:text-7xl font-black mt-4 leading-[0.92] tracking-tight">
                  Le <span className="text-gradient-twitch">casting</span>
                  <br />
                  <span className="italic font-light text-white/35">officiel.</span>
                </h2>
              </div>
              <p className="max-w-md text-sm text-white/60 leading-relaxed border-l-2 border-purple-500/30 pl-4">
                Six créateurs francophones streament les matchs du tournoi en parallèle. Tactiques, highlights, plays décisifs — choisis ton angle de vue.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {STREAMERS.map((s) => (
                <StreamerCard key={s.name} s={s} />
              ))}
            </div>
          </div>
        </section>

        {/* ───── 10. TESTIMONIALS ───── */}
        <section className="relative bg-black border-b border-white/10 py-24 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-15 pointer-events-none" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex">
                <SectionEyebrow num="10" label="Ils ont vécu le mondial" accent="emerald" />
              </div>
              <h2 className="text-5xl md:text-7xl font-black mt-4 leading-[0.92] tracking-tight">
                <span className="italic font-light text-white/35">Ce qu'en disent</span>
                <br />
                <span className="text-gradient-worldcup">les joueurs.</span>
              </h2>
            </div>
            <AnimatedTestimonials testimonials={TESTIMONIALS} autoplay />
          </div>
        </section>

        {/* ───── SPONSORS BAND ───── */}
        <section className="relative bg-black border-b border-white/10 py-12 overflow-hidden">
          <div className="text-center mb-6 text-[10px] uppercase tracking-[0.4em] text-white/40 font-bold font-mono">
            <span className="inline-flex items-center gap-3">
              <span className="w-12 h-px bg-white/20" /> Partenaires officiels CDM 26 <span className="w-12 h-px bg-white/20" />
            </span>
          </div>
          <Marquee className="[--gap:5rem] [--duration:45s]" pauseOnHover repeat={3}>
            {SPONSORS.map((s, i) => (
              <span
                key={i}
                className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white/35 whitespace-nowrap hover:text-white transition cursor-default"
              >
                {s}
              </span>
            ))}
          </Marquee>
        </section>

        {/* ───── 11. FINAL CTA ───── */}
        <section className="relative bg-black py-32 md:py-40 overflow-hidden">
          {/* Ripple bg */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Ripple mainCircleSize={350} numCircles={9} />
          </div>
          {/* Aurora bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-aurora opacity-40 pointer-events-none" />
          {/* Vignette */}
          <div className="absolute inset-0 bg-linear-to-b from-black via-transparent to-black pointer-events-none" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-4xl mx-auto text-center relative">
              <CornerBracket position="tl" color="border-emerald-500/60" />
              <CornerBracket position="tr" color="border-yellow-500/60" />
              <CornerBracket position="bl" color="border-red-500/60" />
              <CornerBracket position="br" color="border-purple-500/60" />

              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 mb-8 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] font-bold font-mono">
                <Sparkles className="w-3 h-3 mr-1.5" />
                Inscriptions ouvertes
              </Badge>

              <h2 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.9] mb-8 tracking-tighter">
                Tu joues
                <br />
                <span className="italic font-light text-white/30">pour quelle</span>
                <br />
                <span className="text-gradient-worldcup">nation ?</span>
              </h2>

              <p className="text-lg md:text-xl text-white/65 mb-12 max-w-xl mx-auto leading-relaxed">
                Crée ton compte, choisis ton drapeau, joue les éliminatoires.
                <br className="hidden sm:block" />
                Le mondial commence ce soir sur Twitch.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {isSignedIn ? (
                  <Link href="/tournaments">
                    <ShimmerButton
                      background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                      shimmerColor="#ffffff"
                      className="px-10 py-5 text-base font-black uppercase tracking-wider"
                    >
                      <Trophy className="w-5 h-5 mr-2" />
                      Voir les tournois
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </ShimmerButton>
                  </Link>
                ) : (
                  <Link href="/sign-up">
                    <ShimmerButton
                      background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                      shimmerColor="#ffffff"
                      className="px-10 py-5 text-base font-black uppercase tracking-wider"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Rejoindre la compétition
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </ShimmerButton>
                  </Link>
                )}
                <a href="https://www.twitch.tv/blaize" target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 py-5 text-base font-black uppercase tracking-wider border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10 hover:text-purple-200 transition-all"
                  >
                    <Radio className="w-5 h-5 mr-2 text-purple-400" />
                    Regarder le stream
                  </Button>
                </a>
              </div>

              {/* Footer broadcast meta */}
              <div className="mt-16 flex items-center justify-center gap-4 flex-wrap text-[10px] font-mono uppercase tracking-[0.35em] text-white/35">
                <span className="flex items-center gap-1.5">
                  <span className="live-dot" />
                  ON AIR
                </span>
                <span>·</span>
                <span>SAISON 2026</span>
                <span>·</span>
                <span>FIFA 26</span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Tv className="w-3 h-3 text-purple-400" />
                  TWITCH
                </span>
                <span>·</span>
                <span>32 NATIONS</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
