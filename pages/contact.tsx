import Head from 'next/head';
import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Mail,
  Tv,
  Send,
  MessageCircle,
  CircleDot,
  Clock,
  MapPin,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { BorderBeam } from '@/components/ui/border-beam';

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

type Accent = 'emerald' | 'yellow' | 'red' | 'purple';
const ACCENT: Record<Accent, { text: string; bg: string; border: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/30' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/30' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/30' },
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

const CHANNELS = [
  {
    icon: Mail,
    label: 'E-mail',
    code: 'CH-01',
    handle: 'support@cdm26.gg',
    href: 'mailto:support@cdm26.gg',
    desc: 'Réponse sous 24h en jours ouvrés.',
    accent: 'emerald' as Accent,
    cta: 'Envoyer un mail',
  },
  {
    icon: Tv,
    label: 'Twitch',
    code: 'CH-02',
    handle: 'twitch.tv/blaize',
    href: 'https://www.twitch.tv/blaize',
    desc: 'Chat actif pendant les streams. Mods en ligne.',
    accent: 'purple' as Accent,
    cta: 'Voir la chaîne',
  },
  {
    icon: TwitterIcon,
    label: 'Twitter',
    code: 'CH-03',
    handle: '@cdm26',
    href: '#',
    desc: 'Annonces, highlights, résultats live.',
    accent: 'yellow' as Accent,
    cta: 'Suivre le compte',
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const subject = encodeURIComponent(`[Contact CDM 26] ${String(data.get('subject') ?? '')}`);
    const body = encodeURIComponent(
      `Nom: ${data.get('name')}\nE-mail: ${data.get('email')}\n\n${data.get('message')}`
    );
    window.location.href = `mailto:support@cdm26.gg?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Contact — CDM 26</title>
        <meta name="description" content="Contacter l'équipe CDM 26 — e-mail, Twitch, réseaux sociaux, formulaire direct." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-30 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-purple-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-20 md:py-28 relative">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition">
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l'accueil
            </Link>

            <SectionEyebrow num="CTC" label="Nous contacter" accent="purple" />
            <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
              Une <span className="text-gradient-worldcup">question</span>,
              <br />
              <span className="italic font-light text-white/35">une idée, un partenariat ?</span>
            </h1>
            <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
              Trois canaux pour nous joindre, plus un formulaire direct. L'équipe répond rapidement —
              même la nuit pendant les streams pour les casters.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <CircleDot className="w-3 h-3 mr-1" /> Inbox active
              </Badge>
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                <Clock className="w-3 h-3 mr-1" /> &lt; 24h
              </Badge>
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                <MapPin className="w-3 h-3 mr-1" /> France · CET
              </Badge>
            </div>
          </div>
        </section>

        {/* CHANNELS */}
        <section className="relative bg-black border-b border-white/10 py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10">
              <SectionEyebrow num="01" label="Nos canaux" accent="emerald" />
              <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight">
                Trois portes <span className="text-gradient-worldcup">d'entrée.</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {CHANNELS.map((c, i) => {
                const s = ACCENT[c.accent];
                const isExternal = c.href.startsWith('http') || c.href.startsWith('mailto:');
                return (
                  <motion.div
                    key={c.label}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    whileHover={{ y: -4 }}
                    className="relative group"
                  >
                    <Card className={`relative h-full overflow-hidden bg-white/2 ${s.border} group-hover:border-white/30 transition-all p-7`}>
                      <div className="flex items-start justify-between mb-6">
                        <div className={`w-11 h-11 rounded-xl bg-white/5 border ${s.border} flex items-center justify-center`}>
                          <c.icon className={`w-5 h-5 ${s.text}`} />
                        </div>
                        <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${s.text}`}>
                          # {c.code}
                        </span>
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-1">{c.label}</div>
                      <div className="text-xl md:text-2xl font-black text-white tracking-tight mb-3">{c.handle}</div>
                      <p className="text-sm text-white/60 leading-relaxed mb-6">{c.desc}</p>
                      {isExternal ? (
                        <a href={c.href} target={c.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-[10px]"
                          >
                            {c.cta}
                            <ArrowRight className="w-3 h-3 ml-1.5" />
                          </Button>
                        </a>
                      ) : (
                        <Link href={c.href}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-[10px]"
                          >
                            {c.cta}
                            <ArrowRight className="w-3 h-3 ml-1.5" />
                          </Button>
                        </Link>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FORM + INFO */}
        <section className="relative bg-black border-b border-white/10 py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-12 gap-10">
              {/* FORM */}
              <div className="lg:col-span-7">
                <SectionEyebrow num="02" label="Formulaire direct" accent="emerald" />
                <h2 className="text-3xl md:text-5xl font-black mt-4 leading-[0.95] tracking-tight mb-3">
                  Envoie un <span className="text-gradient-worldcup">message.</span>
                </h2>
                <p className="text-white/60 mb-8 max-w-xl">
                  Le formulaire ouvre ton client mail avec les bonnes informations préformatées.
                </p>

                <Card className="relative overflow-hidden bg-white/2 border-white/10 p-7">
                  {submitted ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Ton message est parti !</h3>
                      <p className="text-white/60">Si rien ne s'est ouvert, écris-nous directement à{' '}
                        <code className="text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">support@cdm26.gg</code>.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                            Nom
                          </Label>
                          <Input
                            id="name"
                            name="name"
                            required
                            placeholder="Jean Dupont"
                            className="bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                            E-mail
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="jean@exemple.com"
                            className="bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                          Sujet
                        </Label>
                        <Input
                          id="subject"
                          name="subject"
                          required
                          placeholder="Partenariat caster, bug, question…"
                          className="bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">
                          Message
                        </Label>
                        <Textarea
                          id="message"
                          name="message"
                          required
                          rows={6}
                          placeholder="Détaille ta demande ici…"
                          className="bg-black/40 border-white/10 focus:border-emerald-500/50 text-white resize-none"
                        />
                      </div>
                      <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6 w-full sm:w-auto"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {loading ? 'Ouverture…' : 'Envoyer le message'}
                      </Button>
                    </form>
                  )}
                </Card>
              </div>

              {/* INFO */}
              <aside className="lg:col-span-5 space-y-5">
                <Card className="relative overflow-hidden bg-linear-to-br from-emerald-950/30 via-black to-black border-emerald-500/20 p-7">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <Inbox className="w-4 h-4 text-emerald-400" />
                    </div>
                    <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                      Infos pratiques
                    </Badge>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-1">Heures d'ouverture</div>
                      <div className="font-bold text-white">Lundi → Vendredi · 10h–19h CET</div>
                    </div>
                    <Separator className="bg-white/10" />
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-1">Délai moyen de réponse</div>
                      <div className="font-bold text-white">8 heures ouvrées</div>
                    </div>
                    <Separator className="bg-white/10" />
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-1">Pendant un stream</div>
                      <div className="font-bold text-white">Réponse en quasi-instantané sur Twitch</div>
                    </div>
                  </div>
                  <BorderBeam size={180} duration={11} colorFrom="#10b981" colorTo="#facc15" borderWidth={1} />
                </Card>

                <Card className="relative overflow-hidden bg-linear-to-br from-purple-950/30 via-black to-black border-purple-500/20 p-7">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight mb-2">
                    Tu es <span className="text-gradient-twitch">caster</span> ou créateur ?
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed mb-5">
                    On a un programme partenaires : co-streams, accès anticipé aux brackets, kit graphique CDM 26.
                  </p>
                  <a href="mailto:partners@cdm26.gg" className="inline-flex">
                    <Button size="sm" className="bg-[#9146ff] hover:bg-[#7c3aed] text-white font-black uppercase tracking-[0.18em] text-[10px] px-4">
                      <Mail className="w-3 h-3 mr-1.5" />
                      partners@cdm26.gg
                    </Button>
                  </a>
                </Card>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
