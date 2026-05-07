'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Eye, ExternalLink, Tv } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';

type Streamer = {
  name: string;
  flag: string;
  country: string;
  viewers: string;
  game: string;
  isLive: boolean;
  thumbColor: string;
};

const STREAMERS: Streamer[] = [
  { name: 'BlaizeTV', flag: '🇫🇷', country: 'France', viewers: '2 471', game: 'FRA vs BRA — Quart', isLive: true, thumbColor: 'from-blue-600 via-purple-600 to-pink-500' },
  { name: 'GoalKing_77', flag: '🇧🇷', country: 'Brésil', viewers: '1 832', game: 'BRA vs ARG — Demi', isLive: true, thumbColor: 'from-yellow-500 via-green-600 to-blue-600' },
  { name: 'CleanShot_FC', flag: '🇲🇦', country: 'Maroc', viewers: '912', game: 'MAR vs ESP — Huitièmes', isLive: true, thumbColor: 'from-red-600 via-rose-500 to-orange-500' },
  { name: 'NextGenFC', flag: '🇩🇪', country: 'Allemagne', viewers: '3 104', game: 'ALL vs ITA — Groupe B', isLive: true, thumbColor: 'from-zinc-700 via-red-600 to-yellow-500' },
  { name: 'DribbleMaster', flag: '🇦🇷', country: 'Argentine', viewers: '1 256', game: 'ARG vs URU — Poules', isLive: false, thumbColor: 'from-cyan-500 via-blue-500 to-cyan-300' },
  { name: 'ProEsportFR', flag: '🇪🇸', country: 'Espagne', viewers: '4 612', game: 'Cérémonie d\'ouverture', isLive: true, thumbColor: 'from-red-600 via-yellow-500 to-red-600' },
];

function StreamerCard({ s, index }: { s: Streamer; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [9, -9]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-9, 9]), { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1200 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group relative rounded-3xl bg-card/80 backdrop-blur-xl border border-border hover:border-purple-500/40 overflow-hidden shadow-xl transition-colors"
    >
      {hovered && <BorderBeam size={100} duration={4} colorFrom="#9146ff" colorTo="#c084fc" />}

      {/* Thumbnail */}
      <div className={`relative h-44 bg-linear-to-br ${s.thumbColor} overflow-hidden`} style={{ transform: 'translateZ(20px)' }}>
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-7xl filter drop-shadow-xl"
          animate={hovered ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.4 }}
        >
          {s.flag}
        </motion.div>
        {s.isLive && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-black shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
        <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-bold">
          <Eye className="w-3 h-3" />
          {s.viewers}
        </div>
        <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-black/60 backdrop-blur text-white text-xs font-semibold truncate">
          {s.game}
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 flex items-center justify-between" style={{ transform: 'translateZ(15px)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-xl shadow-lg">
              {s.flag}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#9146ff] border-2 border-card flex items-center justify-center">
              <Tv className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-foreground truncate">{s.name}</div>
            <div className="text-xs text-muted-foreground truncate">{s.country}</div>
          </div>
        </div>
        <motion.a
          href="https://www.twitch.tv/blaize"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-[#9146ff] hover:bg-[#7c3aed] text-white text-xs font-semibold shadow-lg shadow-purple-500/30 transition-colors"
        >
          Voir
          <ExternalLink className="w-3 h-3" />
        </motion.a>
      </div>
    </motion.div>
  );
}

export function StreamersGrid() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12"
        >
          <div>
            <div className="text-sm uppercase tracking-widest text-purple-500 font-bold mb-3">Sur Twitch</div>
            <h2 className="text-4xl md:text-5xl font-black text-foreground max-w-2xl">
              Les <span className="text-gradient-twitch">streamers</span> qui font vibrer le mondial
            </h2>
          </div>
          <a
            href="https://www.twitch.tv/blaize"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10 text-foreground font-semibold transition-all"
          >
            <Tv className="w-4 h-4 text-purple-500" />
            Voir tous les streams
          </a>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {STREAMERS.map((s, i) => (
            <StreamerCard key={s.name} s={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
