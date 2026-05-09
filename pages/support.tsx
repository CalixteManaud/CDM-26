import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  KeyRound,
  Coins,
  Tv,
  Bug,
  Mail,
  MessageCircle,
  Clock,
  CircleDot,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BorderBeam } from '@/components/ui/border-beam';

const TOPICS = [
  {
    code: '01',
    icon: KeyRound,
    title: 'Compte & connexion',
    accent: 'emerald',
    desc: 'Je ne peux pas me connecter, mon mot de passe est perdu, mon rôle est incorrect.',
    actions: [
      { label: 'Réinitialiser mon mot de passe', href: '/sign-in' },
      { label: 'Re-synchroniser mon profil Twitch', href: '/profile' },
    ],
  },
  {
    code: '02',
    icon: Coins,
    title: 'Paris & points Wizebot',
    accent: 'yellow',
    desc: 'Mon pari n\'a pas été crédité, mes points de chaîne ne se débitent pas, retry échec de crédit.',
    actions: [
      { label: 'Voir le statut de mes paris', href: '/profile' },
      { label: 'Rejouer les crédits manqués (admin)', href: '/admin/dashboard' },
    ],
  },
  {
    code: '03',
    icon: Tv,
    title: 'Stream & diffusion Twitch',
    accent: 'purple',
    desc: 'Le stream coupe, le chat ne s\'affiche pas, je ne vois pas le bot dans le chat.',
    actions: [
      { label: 'Chaîne officielle CDM 26', href: 'https://www.twitch.tv/blaize', external: true },
      { label: 'Vérifier le lien Twitch', href: '/profile' },
    ],
  },
  {
    code: '04',
    icon: Bug,
    title: 'Bug ou comportement étrange',
    accent: 'red',
    desc: 'Une page plante, un score n\'est pas pris en compte, le bracket s\'affiche mal.',
    actions: [
      { label: 'Reporter un bug par e-mail', href: 'mailto:support@cdm26.gg?subject=%5BBUG%5D', external: true },
    ],
  },
];

type Accent = 'emerald' | 'yellow' | 'purple' | 'red';
const ACCENT: Record<Accent, { text: string; bg: string; border: string; ring: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/25', ring: 'from-emerald-950/40' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/25', ring: 'from-yellow-950/40' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/25', ring: 'from-purple-950/40' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/25', ring: 'from-red-950/40' },
};

function SectionEyebrow({ num, label, accent }: { num: string; label: string; accent: Accent }) {
  const s = ACCENT[accent];
  return (
    <div className={`inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold ${s.text}`}>
      <span className={`block w-12 h-px ${s.bg}`} />
      <span className="font-mono">/ {num}</span>
      <span className="text-white/30">—</span>
      <span>{label}</span>
    </div>
  );
}

export default function SupportPage() {
  return (
    <>
      <Head>
        <title>Support — CDM 26</title>
        <meta name="description" content="Centre de support CDM 26. Aide pour ton compte, les paris (points Wizebot), le stream Twitch, les bugs." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-30 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-20 md:py-28 relative">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition">
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l'accueil
            </Link>

            <SectionEyebrow num="SUP" label="Centre d'assistance" accent="emerald" />
            <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
              On <span className="text-gradient-worldcup">t'aide.</span>
              <br />
              <span className="italic font-light text-white/35">Choisis ta porte.</span>
            </h1>
            <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
              Quatre catégories pour t'orienter rapidement. Chaque carte mène vers les bonnes actions ou le bon contact.
              Si tu ne trouves pas, l'équipe répond directement par e-mail.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <CircleDot className="w-3 h-3 mr-1" /> Support actif
              </Badge>
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                <Clock className="w-3 h-3 mr-1" /> Réponse &lt; 24h
              </Badge>
            </div>
          </div>
        </section>

        {/* TOPIC GRID */}
        <section className="relative bg-black border-b border-white/10 py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10">
              <SectionEyebrow num="01" label="Catégories d'assistance" accent="yellow" />
              <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                Qu'est-ce qui <span className="text-gradient-worldcup">coince</span> ?
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {TOPICS.map((t, i) => {
                const s = ACCENT[t.accent as Accent];
                return (
                  <motion.div
                    key={t.code}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    whileHover={{ y: -3 }}
                    className="relative group"
                  >
                    <Card className={`relative overflow-hidden h-full bg-linear-to-br ${s.ring} via-black to-black ${s.border} group-hover:border-white/30 p-7 transition-all`}>
                      <div className="flex items-start justify-between mb-5">
                        <div className={`w-11 h-11 rounded-xl bg-white/5 border ${s.border} flex items-center justify-center`}>
                          <t.icon className={`w-5 h-5 ${s.text}`} />
                        </div>
                        <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${s.text}`}>
                          # {t.code}
                        </span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight mb-3">
                        {t.title}
                      </h3>
                      <p className="text-sm text-white/65 leading-relaxed mb-6">{t.desc}</p>

                      <div className="space-y-2">
                        {t.actions.map((a) => (
                          a.external ? (
                            <a
                              key={a.label}
                              href={a.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`group/link flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/3 border border-white/10 hover:border-white/30 hover:bg-white/6 transition text-sm`}
                            >
                              <span className="text-white/80 group-hover/link:text-white">{a.label}</span>
                              <ChevronRight className="w-4 h-4 text-white/40 group-hover/link:text-white group-hover/link:translate-x-0.5 transition" />
                            </a>
                          ) : (
                            <Link
                              key={a.label}
                              href={a.href}
                              className="group/link flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/3 border border-white/10 hover:border-white/30 hover:bg-white/6 transition text-sm"
                            >
                              <span className="text-white/80 group-hover/link:text-white">{a.label}</span>
                              <ChevronRight className="w-4 h-4 text-white/40 group-hover/link:text-white group-hover/link:translate-x-0.5 transition" />
                            </Link>
                          )
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* DIRECT CONTACT */}
        <section className="relative bg-black py-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Mail */}
              <Card className="relative overflow-hidden bg-linear-to-br from-emerald-950/30 via-black to-black border-emerald-500/20 p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-emerald-400" />
                    </div>
                    <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                      Contact direct
                    </Badge>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                    Écris-nous par <span className="text-gradient-worldcup">e-mail.</span>
                  </h3>
                  <p className="text-white/60 mb-6 leading-relaxed">
                    Pour toute demande qui sort du cadre des catégories ci-dessus. L'équipe te répond sous 24h en semaine.
                  </p>
                  <code className="block w-full text-base font-mono text-emerald-300 bg-black/50 border border-emerald-500/20 px-4 py-3 rounded-lg">
                    support@cdm26.gg
                  </code>
                </div>
                <a href="mailto:support@cdm26.gg" className="mt-6 inline-flex">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
                    <Send className="w-4 h-4 mr-2" />
                    Ouvrir un ticket
                  </Button>
                </a>
                <BorderBeam size={180} duration={10} colorFrom="#10b981" colorTo="#facc15" borderWidth={1} />
              </Card>

              {/* Twitch chat */}
              <Card className="relative overflow-hidden bg-linear-to-br from-purple-950/30 via-black to-black border-purple-500/20 p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-purple-400" />
                    </div>
                    <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                      Pendant les streams
                    </Badge>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                    Le chat <span className="text-gradient-twitch">Twitch.</span>
                  </h3>
                  <p className="text-white/60 mb-6 leading-relaxed">
                    Pendant les diffusions, les modérateurs et l'équipe sont présents dans le chat. Réponses en quasi-instantané.
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono text-white/50 uppercase tracking-[0.22em]">
                    <span className="live-dot" />
                    <span>twitch.tv/blaize</span>
                  </div>
                </div>
                <a href="https://www.twitch.tv/blaize" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex">
                  <Button size="lg" className="bg-[#9146ff] hover:bg-[#7c3aed] text-white font-black uppercase tracking-[0.18em] text-xs px-6">
                    <Tv className="w-4 h-4 mr-2" />
                    Rejoindre la chaîne
                  </Button>
                </a>
              </Card>
            </div>

            <Separator className="bg-white/10 my-12" />

            {/* Status / SLA strip */}
            <Card className="relative overflow-hidden bg-black border-white/10 p-6">
              <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
                <div className="px-2 md:px-6 py-4 md:py-2 first:pt-2">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-1.5">Heures d'ouverture</div>
                  <div className="font-bold text-white">Lun–Ven · 10h–19h CET</div>
                </div>
                <div className="px-2 md:px-6 py-4 md:py-2">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-1.5">Délai moyen</div>
                  <div className="font-bold text-white">~ 8 heures ouvrées</div>
                </div>
                <div className="px-2 md:px-6 py-4 md:py-2">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-1.5">Statut</div>
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <CircleDot className="w-3.5 h-3.5" />
                    Tous les services opérationnels
                  </div>
                </div>
              </div>
            </Card>

            <Separator className="bg-white/10 my-12" />

            {/* CTA chain */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-2">
                  Avant de nous contacter
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Jette un œil à la FAQ.
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/faq">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
                    Voir la FAQ
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/reglement">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs px-6"
                  >
                    Lire le règlement
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
