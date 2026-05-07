'use client';

import { motion } from 'framer-motion';
import { Users, Trophy, Swords, Flag, type LucideIcon } from 'lucide-react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BorderBeam } from '@/components/ui/border-beam';

type Stat = {
  icon: LucideIcon;
  value: number;
  suffix?: string;
  label: string;
  gradient: string;
};

const STATS: Stat[] = [
  { icon: Flag, value: 32, label: 'Nations en compétition', gradient: 'from-emerald-500 to-emerald-700' },
  { icon: Users, value: 528, suffix: '+', label: 'Joueurs inscrits', gradient: 'from-yellow-500 to-orange-600' },
  { icon: Swords, value: 152, label: 'Matchs programmés', gradient: 'from-red-500 to-red-700' },
  { icon: Trophy, value: 8, label: 'Groupes éliminatoires', gradient: 'from-purple-500 to-fuchsia-600' },
];

export function StatsCounterSection() {
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
          <div className="text-sm uppercase tracking-widest text-emerald-500 font-bold mb-3">Le Mondial en chiffres</div>
          <h2 className="text-4xl md:text-5xl font-black text-foreground">
            La <span className="text-gradient-worldcup">compétition</span> en chiffres
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="relative overflow-hidden rounded-3xl p-6 md:p-8 glass shadow-xl group"
            >
              <BorderBeam
                size={120}
                duration={8 + i * 1.5}
                colorFrom={
                  stat.gradient.includes('emerald') ? '#10b981' :
                  stat.gradient.includes('yellow') ? '#facc15' :
                  stat.gradient.includes('red') ? '#ef4444' : '#a855f7'
                }
                colorTo={
                  stat.gradient.includes('emerald') ? '#a7f3d0' :
                  stat.gradient.includes('yellow') ? '#fef08a' :
                  stat.gradient.includes('red') ? '#fecaca' : '#f5d0fe'
                }
              />

              <div className={`inline-flex w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-linear-to-br ${stat.gradient} items-center justify-center shadow-lg mb-5 group-hover:rotate-6 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <NumberTicker value={stat.value} className="text-4xl md:text-5xl font-black text-foreground" />
                {stat.suffix && (
                  <span className="text-3xl md:text-4xl font-black text-foreground">{stat.suffix}</span>
                )}
              </div>
              <div className="text-sm md:text-base text-muted-foreground font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
