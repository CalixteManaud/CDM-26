'use client';

import { motion } from 'framer-motion';
import { Radio, Eye, Tv } from 'lucide-react';
import Marquee from '@/components/ui/marquee';

const STREAMERS = [
  { name: 'BlaizeTV', flag: '🇫🇷', viewers: '2.4k', match: 'FRA vs BRA — Quart de finale' },
  { name: 'GoalKing_77', flag: '🇧🇷', viewers: '1.8k', match: 'BRA vs ARG — Demi-finale' },
  { name: 'CleanShot_FC', flag: '🇲🇦', viewers: '912', match: 'MAR vs ESP — Huitièmes' },
  { name: 'NextGenFC', flag: '🇩🇪', viewers: '3.1k', match: 'ALL vs ITA — Finale Groupe B' },
  { name: 'DribbleMaster', flag: '🇦🇷', viewers: '1.2k', match: 'ARG vs URU — Phase de poules' },
  { name: 'ProEsportFR', flag: '🇫🇷', viewers: '4.6k', match: 'Cérémonie d\'ouverture' },
];

function StreamerCard({ s }: { s: (typeof STREAMERS)[number] }) {
  return (
    <div className="group flex items-center gap-4 mx-3 px-5 py-4 rounded-2xl bg-card/80 backdrop-blur-md border border-border hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 transition-all min-w-[340px]">
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-2xl">
          {s.flag}
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#9146ff] border-2 border-background flex items-center justify-center">
          <Tv className="w-2.5 h-2.5 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground truncate">{s.name}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">{s.match}</div>
        <div className="flex items-center gap-1 mt-1 text-xs text-purple-400 font-semibold">
          <Eye className="w-3 h-3" />
          {s.viewers} viewers
        </div>
      </div>
    </div>
  );
}

export function LiveTwitchStrip() {
  return (
    <section className="relative py-16 overflow-hidden border-y border-border/50">
      <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 via-fuchsia-500/10 to-purple-500/5" aria-hidden />

      <div className="container mx-auto px-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl bg-[#9146ff] flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Radio className="w-6 h-6 text-white" />
              <div className="absolute inset-0 rounded-2xl bg-[#9146ff] opacity-40 animate-ping" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-purple-400 font-bold">En direct sur Twitch</div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground">
                Tous les matchs <span className="text-gradient-twitch">streamés</span>
              </h2>
            </div>
          </div>
          <a
            href="https://www.twitch.tv/blaize"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#9146ff] hover:bg-[#7c3aed] text-white font-semibold transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
          >
            <Tv className="w-4 h-4" />
            Voir tous les streams
          </a>
        </motion.div>
      </div>

      <Marquee pauseOnHover className="[--duration:40s] [--gap:0px]">
        {STREAMERS.map((s) => (
          <StreamerCard key={s.name} s={s} />
        ))}
      </Marquee>
    </section>
  );
}
