'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { OrbitingCircles } from '@/components/ui/orbiting-circles';

const FLAGS_INNER = ['🇫🇷', '🇧🇷', '🇦🇷', '🇩🇪', '🇪🇸', '🇮🇹', '🇲🇦', '🇵🇹'];
const FLAGS_OUTER = [
  '🇸🇳', '🇨🇮', '🇪🇬', '🇯🇵', '🇰🇷', '🇲🇽', '🇺🇸', '🇨🇦',
  '🇨🇲', '🇳🇬', '🇧🇪', '🇳🇱', '🇭🇷', '🇨🇭', '🇸🇦', '🇦🇺',
];

function FlagBadge({ flag, size = 44 }: { flag: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-card/95 backdrop-blur border border-border shadow-lg flex items-center justify-center hover:scale-125 hover:shadow-xl hover:z-10 transition-all"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {flag}
    </div>
  );
}

export function TeamsOrbit() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* TEXT */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="text-sm uppercase tracking-widest text-emerald-500 font-bold mb-3">Les nations</div>
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 leading-tight">
              <span className="text-gradient-worldcup">32 nations</span><br />
              en compétition pour<br />
              une seule couronne
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8">
              Tous les continents sont représentés. Européens, Sud-Américains, Africains, Asiatiques, Nord-Américains, Océaniens — chacun se bat pour porter haut son drapeau virtuel.
            </p>

            <div className="grid grid-cols-3 gap-4 max-w-md">
              {[
                { label: 'Europe', count: '13' },
                { label: 'Amérique', count: '8' },
                { label: 'Afrique', count: '5' },
                { label: 'Asie', count: '4' },
                { label: 'Océanie', count: '1' },
                { label: 'CONCACAF', count: '1' },
              ].map((c) => (
                <motion.div
                  key={c.label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="rounded-xl bg-card/60 backdrop-blur border border-border p-3 text-center"
                >
                  <div className="text-2xl font-black text-foreground">{c.count}</div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ORBIT */}
          <div className="relative h-[480px] md:h-[560px] flex items-center justify-center">
            {/* Glow */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute inset-12 rounded-full bg-linear-to-br from-emerald-500/20 via-yellow-500/15 to-red-500/20 blur-3xl" />
            </div>

            {/* Center Trophy */}
            <motion.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10 w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-linear-to-br from-yellow-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/50"
            >
              <Trophy className="w-14 h-14 md:w-16 md:h-16 text-white drop-shadow-lg" />
              <div className="absolute inset-0 rounded-3xl bg-yellow-400/30 blur-xl -z-10" />
            </motion.div>

            {/* Inner orbit */}
            <OrbitingCircles iconSize={44} radius={130} duration={28}>
              {FLAGS_INNER.map((f) => (
                <FlagBadge key={f} flag={f} size={44} />
              ))}
            </OrbitingCircles>

            {/* Outer orbit (reverse) */}
            <OrbitingCircles iconSize={36} radius={220} duration={42} reverse>
              {FLAGS_OUTER.map((f) => (
                <FlagBadge key={f} flag={f} size={36} />
              ))}
            </OrbitingCircles>
          </div>
        </div>
      </div>
    </section>
  );
}
