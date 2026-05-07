'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Users, GitBranch, Swords, Crown, type LucideIcon } from 'lucide-react';

type Step = {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  color: string;
  glow: string;
};

const STEPS: Step[] = [
  {
    icon: Users,
    label: 'Phase 1',
    title: 'Phase de poules',
    description: '32 nations réparties en 8 groupes de 4. Round-robin, les 2 premiers se qualifient. Format mondial classique.',
    color: 'from-emerald-500 to-emerald-700',
    glow: 'shadow-emerald-500/40',
  },
  {
    icon: GitBranch,
    label: 'Phase 2',
    title: 'Huitièmes & Quarts',
    description: '16 nations s\'affrontent en élimination directe. Une défaite et tout est terminé. Le bracket avance automatiquement.',
    color: 'from-yellow-500 to-orange-600',
    glow: 'shadow-yellow-500/40',
  },
  {
    icon: Swords,
    label: 'Phase 3',
    title: 'Demi-finales',
    description: 'Les 4 meilleures nations s\'affrontent pour une place en finale. Tension maximale, public Twitch en feu.',
    color: 'from-red-500 to-red-700',
    glow: 'shadow-red-500/40',
  },
  {
    icon: Crown,
    label: 'Phase 4',
    title: 'La Grande Finale',
    description: 'Une nation sera couronnée championne du monde FIFA 26. Trophée, gloire éternelle, et le Soulier d\'or pour le top buteur.',
    color: 'from-yellow-400 via-yellow-500 to-amber-600',
    glow: 'shadow-yellow-500/60',
  },
];

export function TournamentFormatTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="text-sm uppercase tracking-widest text-red-500 font-bold mb-3">Format du tournoi</div>
          <h2 className="text-4xl md:text-5xl font-black text-foreground max-w-3xl mx-auto">
            Le chemin vers la <span className="text-gradient-worldcup">couronne mondiale</span>
          </h2>
          <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            4 phases, des dizaines de matchs, une seule nation championne.
          </p>
        </motion.div>

        <div ref={ref} className="relative max-w-4xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-1/2 bg-border" />
          <motion.div
            className="absolute left-8 md:left-1/2 top-0 w-1 md:-translate-x-1/2 bg-linear-to-b from-emerald-500 via-yellow-500 to-red-500 rounded-full"
            style={{ height: lineHeight }}
          />

          <div className="space-y-16 md:space-y-24">
            {STEPS.map((step, i) => {
              const isRight = i % 2 === 0;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.7, delay: i * 0.05 }}
                  className={`relative flex items-center ${
                    isRight ? 'md:justify-end' : 'md:justify-start'
                  }`}
                >
                  {/* Node */}
                  <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 12 }}
                      className={`w-16 h-16 rounded-2xl bg-linear-to-br ${step.color} flex items-center justify-center shadow-2xl ${step.glow}`}
                    >
                      <step.icon className="w-7 h-7 text-white" />
                    </motion.div>
                  </div>

                  {/* Card */}
                  <div
                    className={`ml-24 md:ml-0 md:w-[44%] ${
                      isRight ? 'md:mr-auto md:pr-16' : 'md:ml-auto md:pl-16'
                    }`}
                  >
                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border hover:border-foreground/20 p-6 md:p-7 shadow-xl transition-colors"
                    >
                      <div className={`inline-block px-3 py-1 rounded-full bg-linear-to-r ${step.color} text-white text-xs font-bold mb-3 shadow-md`}>
                        {step.label}
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-foreground mb-2">{step.title}</h3>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{step.description}</p>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
