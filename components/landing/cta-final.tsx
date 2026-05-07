'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Trophy } from 'lucide-react';
import { Ripple } from '@/components/ui/ripple';
import { ShimmerButton } from '@/components/ui/shimmer-button';

export function CtaFinal() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-linear-to-br from-emerald-600 via-emerald-700 to-emerald-900 shadow-2xl">
          {/* Mesh overlay */}
          <div className="absolute inset-0 opacity-40 bg-mesh-cdm" aria-hidden />
          {/* Grid */}
          <div className="absolute inset-0 bg-grid-white/[0.05]" aria-hidden />
          {/* Ripple in background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-50">
            <Ripple mainCircleSize={300} numCircles={6} />
          </div>

          <div className="relative px-6 py-20 md:px-16 md:py-28 text-center text-white">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, type: 'spring', stiffness: 80 }}
              className="inline-flex w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-linear-to-br from-yellow-400 via-yellow-500 to-amber-600 items-center justify-center shadow-2xl shadow-yellow-500/50 mb-8"
            >
              <Trophy className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-lg" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 leading-tight"
            >
              Prêt à représenter<br />
              <span className="text-gradient-gold">ta nation ?</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Inscris-toi maintenant, rejoins une équipe nationale, joue les éliminatoires et tente de soulever la coupe sur Twitch en direct.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/sign-up">
                <ShimmerButton
                  background="linear-gradient(110deg, #facc15 0%, #f97316 50%, #dc2626 100%)"
                  shimmerColor="#ffffff"
                  className="px-10 py-5 text-lg font-black"
                >
                  <Sparkles className="w-6 h-6 mr-2" />
                  S'inscrire maintenant
                  <ArrowRight className="w-6 h-6 ml-2" />
                </ShimmerButton>
              </Link>
              <Link
                href="/tournaments"
                className="inline-flex items-center gap-2 px-8 py-5 rounded-full border-2 border-white/30 hover:border-white/60 hover:bg-white/10 text-white font-bold backdrop-blur transition-all"
              >
                Découvrir les tournois
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-emerald-100"
            >
              {['Inscription gratuite', 'Streams Twitch officiels', 'Trophées exclusifs', 'Communauté active'].map((perk) => (
                <div key={perk} className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  {perk}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
