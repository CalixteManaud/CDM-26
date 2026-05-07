'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { ArrowRight, Sparkles, Trophy, Radio } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FloatingBalls } from './floating-balls';

const Globe = dynamic(() => import('@/components/ui/globe').then((m) => m.Globe), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-72 h-72 rounded-full bg-linear-to-br from-emerald-500/20 via-yellow-500/10 to-red-500/20 animate-pulse" />
    </div>
  ),
});

const titleVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const TITLE_LINES = ['Le Mondial', 'FIFA 26', 'sur Twitch'];

export function HeroCdm26() {
  const { isSignedIn } = useUser();

  return (
    <section className="relative isolate overflow-hidden">
      {/* Animated mesh background */}
      <div className="absolute inset-0 -z-20 bg-mesh-cdm" aria-hidden />
      {/* Grid overlay */}
      <div className="absolute inset-0 -z-10 bg-grid-white/[0.02]" aria-hidden />
      {/* Aurora bottom */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] -z-10 bg-aurora" aria-hidden />
      {/* Floating balls */}
      <FloatingBalls />

      <div className="container relative mx-auto px-4 pt-16 pb-32 md:pt-24 md:pb-40">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* LEFT — Text */}
          <div className="lg:col-span-7 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap items-center gap-2 mb-7"
            >
              <Badge className="bg-linear-to-r from-emerald-500 to-emerald-700 text-white border-0 px-3 py-1 text-xs font-semibold shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Saison 2026
              </Badge>
              <Badge className="bg-[#9146ff] hover:bg-[#7c3aed] text-white border-0 px-3 py-1 text-xs font-semibold shadow-lg shadow-purple-500/30 inline-flex items-center gap-2">
                <span className="live-dot" />
                <Radio className="w-3 h-3" />
                EN DIRECT sur Twitch
              </Badge>
              <Badge className="bg-yellow-500/90 text-black border-0 px-3 py-1 text-xs font-semibold shadow-lg">
                <Trophy className="w-3 h-3 mr-1" />
                32 Nations
              </Badge>
            </motion.div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black leading-[0.95] tracking-tight mb-6">
              {TITLE_LINES.map((line, i) => (
                <motion.span
                  key={line}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={titleVariants}
                  className="block"
                >
                  {i === 1 ? (
                    <span className="text-gradient-worldcup">{line}</span>
                  ) : i === 2 ? (
                    <>
                      sur <span className="text-gradient-twitch">Twitch</span>
                    </>
                  ) : (
                    <span className="text-foreground">{line}</span>
                  )}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed"
            >
              La <strong className="text-foreground">Coupe du Monde 2026</strong> en version esport.
              32 équipes nationales, des matchs diffusés <strong className="text-foreground">en direct sur Twitch</strong>,
              des brackets palpitants. Forme ta nation, joue les éliminatoires, hisse ton drapeau.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {isSignedIn ? (
                <Link href="/tournaments">
                  <ShimmerButton
                    background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                    shimmerColor="#ffffff"
                    className="px-8 py-4 text-base font-bold"
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
                    className="px-8 py-4 text-base font-bold"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Rejoindre la compétition
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </ShimmerButton>
                </Link>
              )}
              <a href="https://www.twitch.tv/blaize" target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 text-base font-semibold border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10 hover:text-purple-300 transition-all"
                >
                  <Radio className="w-5 h-5 mr-2 text-purple-500" />
                  Regarder le stream
                </Button>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.85 }}
              className="mt-10 flex items-center gap-4"
            >
              <div className="flex -space-x-3">
                {['🇫🇷', '🇧🇷', '🇦🇷', '🇩🇪', '🇲🇦'].map((flag, i) => (
                  <motion.div
                    key={flag}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 1 + i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
                    className="w-11 h-11 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-2xl shadow-lg ring-1 ring-border"
                  >
                    {flag}
                  </motion.div>
                ))}
                <div className="w-11 h-11 rounded-full border-2 border-background bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                  +27
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">+500 joueurs déjà inscrits</div>
                <div className="text-xs text-muted-foreground">Représentant 32 nations</div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT — Globe 3D */}
          <div className="lg:col-span-5 relative h-[420px] sm:h-[520px] lg:h-[600px] hidden md:block">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.4 }}
              className="absolute inset-0"
            >
              <Globe className="opacity-90" />
            </motion.div>
            {/* Soft glow behind globe */}
            <div className="absolute inset-0 -z-10 blur-3xl">
              <div className="absolute inset-10 rounded-full bg-linear-to-br from-emerald-500/20 via-yellow-500/10 to-red-500/20" />
            </div>
            {/* Floating "FIFA 26" badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="absolute top-6 right-2 sm:right-8 glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-xs">
                FC<br />26
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Jeu officiel</div>
                <div className="text-sm font-bold text-foreground">EA SPORTS FC 26</div>
              </div>
            </motion.div>
            {/* Live now indicator */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              className="absolute bottom-12 left-2 sm:left-8 glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl"
            >
              <span className="live-dot" />
              <div>
                <div className="text-xs text-muted-foreground">En direct</div>
                <div className="text-sm font-bold text-foreground">2 471 viewers</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
