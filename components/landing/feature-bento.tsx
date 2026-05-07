'use client';

import { motion } from 'framer-motion';
import { Trophy, Tv, GitBranch, BarChart3, ArrowUpRight } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';

function FeatureCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7 }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative overflow-hidden rounded-3xl bg-card/60 backdrop-blur-xl border border-border hover:border-foreground/20 transition-all shadow-xl',
        className
      )}
    >
      <BorderBeam
        size={80}
        duration={9}
        colorFrom="#10b981"
        colorTo="#facc15"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      />
      {children}
    </motion.div>
  );
}

function MiniBracket() {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* L1 */}
      <rect x="4" y="6" width="48" height="14" rx="3" className="fill-muted stroke-border" strokeWidth="1" />
      <rect x="4" y="32" width="48" height="14" rx="3" className="fill-muted stroke-border" strokeWidth="1" />
      <rect x="4" y="64" width="48" height="14" rx="3" className="fill-muted stroke-border" strokeWidth="1" />
      <rect x="4" y="90" width="48" height="14" rx="3" className="fill-muted stroke-border" strokeWidth="1" />
      {/* connectors */}
      <path d="M52 13 H66 V39 H52" className="stroke-border" strokeWidth="1" />
      <path d="M66 13 H66 M66 39 H80" className="stroke-border" strokeWidth="1" />
      <path d="M52 71 H66 V97 H52" className="stroke-border" strokeWidth="1" />
      <path d="M66 71 H66 M66 97 H80" className="stroke-border" strokeWidth="1" />
      {/* L2 */}
      <rect x="80" y="20" width="48" height="14" rx="3" className="fill-muted stroke-border" strokeWidth="1" />
      <rect x="80" y="78" width="48" height="14" rx="3" className="fill-muted stroke-border" strokeWidth="1" />
      <path d="M128 27 H142 V58 H128" className="stroke-border" strokeWidth="1" />
      <path d="M128 85 H142 V58 H128" className="stroke-border" strokeWidth="1" />
      <path d="M142 58 H156" className="stroke-border" strokeWidth="1" />
      {/* Final */}
      <motion.rect
        x="156"
        y="51"
        width="40"
        height="14"
        rx="3"
        className="fill-yellow-500"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.5 }}
        style={{ transformOrigin: '156px 58px' }}
      />
      <text x="176" y="61" textAnchor="middle" className="fill-black text-[8px] font-bold">FINALE</text>
    </svg>
  );
}

function MiniChart() {
  const bars = [40, 65, 35, 80, 55, 70, 90];
  return (
    <div className="flex items-end gap-1.5 h-24 px-1">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
          className="flex-1 rounded-t-md bg-linear-to-t from-emerald-600 to-emerald-300"
        />
      ))}
    </div>
  );
}

export function FeatureBento() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="text-sm uppercase tracking-widest text-yellow-500 font-bold mb-3">Pourquoi CDM 26 ?</div>
          <h2 className="text-4xl md:text-5xl font-black text-foreground max-w-3xl mx-auto">
            La plus grande compétition <span className="text-gradient-worldcup">FIFA 26</span> jamais organisée
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 auto-rows-[minmax(220px,_auto)]">
          {/* LARGE — Tournois Officiels */}
          <FeatureCard className="md:col-span-2 md:row-span-2">
            <div className="relative h-full p-8 md:p-10 flex flex-col justify-between min-h-[400px]">
              {/* Ambient gradient */}
              <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-linear-to-br from-emerald-500/20 to-yellow-500/10 blur-3xl rounded-full" aria-hidden />
              <div className="relative">
                <div className="inline-flex w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-yellow-500 items-center justify-center shadow-xl shadow-emerald-500/30 mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-foreground mb-3">Tournois officiels</h3>
                <p className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
                  Format <strong className="text-foreground">Coupe du Monde</strong> : 8 groupes de 4, phase à élimination directe, jusqu'à la finale planétaire.
                </p>
              </div>
              <div className="relative flex items-end justify-between gap-6">
                <div className="grid grid-cols-3 gap-3 flex-1 max-w-md">
                  {[
                    { stage: 'Groupes', count: '32→16' },
                    { stage: 'Quarts', count: '8 équipes' },
                    { stage: 'Finale', count: '2 nations' },
                  ].map((s) => (
                    <div key={s.stage} className="rounded-xl bg-secondary/60 border border-border p-3">
                      <div className="text-xs text-muted-foreground">{s.stage}</div>
                      <div className="text-sm font-bold text-foreground">{s.count}</div>
                    </div>
                  ))}
                </div>
                <ArrowUpRight className="w-8 h-8 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </div>
            </div>
          </FeatureCard>

          {/* Twitch */}
          <FeatureCard>
            <div className="relative h-full p-7 flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full" aria-hidden />
              <div className="relative inline-flex w-12 h-12 rounded-xl bg-[#9146ff] items-center justify-center shadow-lg shadow-purple-500/40 mb-4 self-start">
                <Tv className="w-6 h-6 text-white" />
                <div className="absolute inset-0 rounded-xl bg-[#9146ff] opacity-30 animate-ping" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">Diffusion Twitch</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                Tous les matchs streamés en direct avec commentaires, replays et clips officiels.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                <span className="live-dot" />
                EN DIRECT — 2 471 viewers
              </div>
            </div>
          </FeatureCard>

          {/* Bracket */}
          <FeatureCard>
            <div className="relative h-full p-7 flex flex-col">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-500/20 blur-3xl rounded-full" aria-hidden />
              <div className="relative inline-flex w-12 h-12 rounded-xl bg-linear-to-br from-yellow-500 to-orange-600 items-center justify-center shadow-lg mb-4 self-start">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">Brackets en temps réel</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1">
                Suis la progression des nations match par match.
              </p>
              <div className="bg-secondary/40 rounded-xl p-3">
                <MiniBracket />
              </div>
            </div>
          </FeatureCard>

          {/* Stats */}
          <FeatureCard className="md:col-span-2">
            <div className="relative h-full p-7 md:p-8 flex flex-col md:flex-row gap-6 items-center">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 blur-3xl rounded-full" aria-hidden />
              <div className="relative flex-1">
                <div className="inline-flex w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 items-center justify-center shadow-lg mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Statistiques détaillées</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Buteurs, passeurs, gardiens, cartons : chaque action est suivie. Le <strong className="text-foreground">Soulier d'or FIFA 26</strong> sera décerné au meilleur buteur du tournoi.
                </p>
              </div>
              <div className="relative w-full md:w-56 shrink-0">
                <MiniChart />
                <div className="text-xs text-center text-muted-foreground mt-2">Buts marqués / journée</div>
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}
