'use client';

import Link from 'next/link';
import Image from 'next/image';
import logo from '@/public/logo.png';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Radio, Trophy, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { FloatingBalls } from '@/components/landing/floating-balls';

type Mode = 'sign-in' | 'sign-up';

const COPY: Record<Mode, {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  switchLabel: string;
  switchHref: string;
  switchCta: string;
}> = {
  'sign-in': {
    eyebrow: 'CDM 26 — Saison 2026',
    title: (
      <>
        Reprends ta <span className="text-gradient-worldcup">place</span>.
      </>
    ),
    subtitle: (
      <>
        Connecte-toi pour suivre tes paris, gérer tes équipes et regarder les matchs en
        direct sur <span className="text-gradient-twitch font-bold">Twitch</span>.
      </>
    ),
    switchLabel: 'Pas encore inscrit ?',
    switchHref: '/sign-up',
    switchCta: 'Créer un compte',
  },
  'sign-up': {
    eyebrow: 'CDM 26 — Inscription joueur',
    title: (
      <>
        Rejoins la <span className="text-gradient-worldcup">compétition</span>.
      </>
    ),
    subtitle: (
      <>
        Crée ton compte pour intégrer une nation, parier tes points de chaîne via
        <span className="text-gradient-twitch font-bold"> Twitch</span> et viser le sacre
        mondial FIFA 26.
      </>
    ),
    switchLabel: 'Déjà un compte ?',
    switchHref: '/sign-in',
    switchCta: 'Se connecter',
  },
};

const FLAGS = ['🇫🇷', '🇧🇷', '🇦🇷', '🇩🇪', '🇲🇦', '🇪🇸'];

export function AuthShell({
  mode,
  children,
}: {
  mode: Mode;
  children: React.ReactNode;
}) {
  const copy = COPY[mode];

  return (
    <section className="relative isolate overflow-hidden min-h-[calc(100vh-5rem)] bg-black text-white">
      {/* Backgrounds */}
      <div className="absolute inset-0 -z-20 bg-mesh-cdm opacity-70" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-[60%] -z-10 bg-aurora opacity-60" aria-hidden />
      <div className="absolute inset-0 -z-10 bg-grid-white/[0.02]" aria-hidden />
      <FloatingBalls />

      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* LEFT — Brand / Hero */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 relative z-10"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-3 group mb-10"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/40 via-yellow-500/40 to-red-500/40 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-12 h-12 rounded-2xl bg-white/4 border border-white/15 flex items-center justify-center shadow-md overflow-hidden">
                  <Image
                    src={logo}
                    alt="CDM 26"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain"
                  />
                </div>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-2xl font-black text-gradient-worldcup tracking-tight">
                  CDM 26
                </span>
                <span className="text-[10px] text-white/45 font-mono uppercase tracking-[0.28em] flex items-center gap-1.5">
                  <span className="live-dot scale-50" /> FIFA 26 · Twitch
                </span>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-2 mb-7">
              <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <Sparkles className="w-3 h-3 mr-1.5" />
                {copy.eyebrow}
              </Badge>
              <Badge className="bg-[#9146ff]/15 border border-[#9146ff]/40 text-purple-200 uppercase tracking-[0.22em] text-[10px] font-mono">
                <Radio className="w-3 h-3 mr-1.5" />
                En direct sur Twitch
              </Badge>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight mb-6">
              {copy.title}
            </h1>

            <p className="text-base md:text-lg text-white/65 max-w-xl mb-10 leading-relaxed">
              {copy.subtitle}
            </p>

            {/* Bullets */}
            <ul className="space-y-3 mb-10 max-w-md">
              <Perk text="32 nations, phase de poules + bracket d'élimination" />
              <Perk text="Paris en pari mutuel sur tes points de chaîne Twitch" />
              <Perk text="Statistiques live, classements et MVPs" />
            </ul>

            {/* Flags row */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {FLAGS.map((flag, i) => (
                  <motion.div
                    key={flag}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.4 + i * 0.06,
                      type: 'spring',
                      stiffness: 260,
                      damping: 18,
                    }}
                    className="w-10 h-10 rounded-full border-2 border-black bg-white/5 flex items-center justify-center text-xl shadow-lg ring-1 ring-white/15"
                  >
                    {flag}
                  </motion.div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-black bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                  +26
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-white">+500 joueurs déjà inscrits</div>
                <div className="text-[10px] text-white/45 font-mono uppercase tracking-[0.22em]">
                  Représentant 32 nations
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Clerk widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative rounded-2xl overflow-hidden bg-black/70 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/60">
              <BorderBeam
                size={180}
                duration={11}
                colorFrom="#10b981"
                colorTo="#facc15"
                borderWidth={1.2}
              />

              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/70 to-transparent" />

              <div className="relative px-6 sm:px-8 pt-7 pb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-yellow-400 font-bold">
                    / {mode === 'sign-in' ? 'Connexion' : 'Inscription'}
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight text-white">
                  {mode === 'sign-in'
                    ? 'Bon retour parmi nous.'
                    : 'Crée ton accès joueur.'}
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  {mode === 'sign-in'
                    ? 'Connecte-toi avec ton compte Twitch.'
                    : 'Quelques secondes — connexion via Twitch.'}
                </p>
              </div>

              <div className="px-2 sm:px-4 pb-6">{children}</div>

              {/* Switch link */}
              <div className="relative border-t border-white/10 bg-black/40 px-6 sm:px-8 py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/45">
                    {copy.switchLabel}
                  </span>
                  <Link
                    href={copy.switchHref}
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.22em] font-bold text-emerald-300 hover:text-emerald-200 transition-colors group"
                  >
                    {copy.switchCta}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="hidden md:flex absolute -bottom-5 -left-4 items-center gap-2.5 rounded-xl bg-black/85 border border-white/10 backdrop-blur-xl px-3.5 py-2.5 shadow-xl"
            >
              <span className="live-dot" />
              <div className="leading-tight">
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/45">
                  Stream live
                </div>
                <div className="text-xs font-black text-white">2 471 viewers</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="hidden md:flex absolute -top-5 -right-4 items-center gap-2.5 rounded-xl bg-black/85 border border-white/10 backdrop-blur-xl px-3.5 py-2.5 shadow-xl"
            >
              <div className="w-7 h-7 rounded-lg bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/45">
                  Tournoi en cours
                </div>
                <div className="text-xs font-black text-white">CDM 26 · Phase de poules</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-linear-to-br from-emerald-400 to-yellow-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
      <span className="text-sm text-white/75 leading-relaxed">{text}</span>
    </li>
  );
}
