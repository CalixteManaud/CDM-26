import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  ArrowRight,
  Scale,
  UserCheck,
  Ban,
  Coins,
  Copyright,
  AlertTriangle,
  Gavel,
  RefreshCw,
  Mail,
  Clock,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BorderBeam } from '@/components/ui/border-beam';

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

const ARTICLES = [
  {
    code: '01',
    icon: Scale,
    title: "Objet & acceptation",
    accent: 'emerald' as Accent,
    body: [
      "Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme CDM 26.",
      "L'inscription sur la plateforme vaut acceptation pleine et entière des présentes CGU.",
      "Si tu n'acceptes pas ces conditions, tu dois cesser immédiatement d'utiliser le service.",
      "Les CGU peuvent être modifiées à tout moment. Toute modification est notifiée par e-mail et entre en vigueur 15 jours après publication.",
    ],
  },
  {
    code: '02',
    icon: UserCheck,
    title: "Inscription & compte",
    accent: 'yellow' as Accent,
    body: [
      "L'inscription est ouverte aux personnes de 13 ans et plus, conformément aux conditions de Twitch et Clerk.",
      "Tu t'engages à fournir des informations exactes (e-mail, pseudo) et à les tenir à jour.",
      "Un seul compte par personne. Les comptes multiples ou usurpés seront supprimés sans préavis.",
      "Tu es responsable de la confidentialité de tes identifiants et de toutes les actions effectuées depuis ton compte.",
      "L'organisation se réserve le droit de refuser, suspendre ou résilier tout compte qui contreviendrait aux CGU ou au règlement sportif.",
    ],
  },
  {
    code: '03',
    icon: Ban,
    title: "Conduite & obligations",
    accent: 'red' as Accent,
    body: [
      "Aucun propos haineux, raciste, sexiste, homophobe, ou diffamatoire ne sera toléré (chat Twitch, chat plateforme, profils).",
      "Pas de spam, de publicité non autorisée, ni de scripts automatisés.",
      "Pas d'usurpation d'identité, ni de manipulation des résultats par triche, exploits, ou collusion.",
      "Pas de tentatives d'intrusion sur les serveurs, ni d'utilisation détournée des API.",
      "Tout manquement entraîne avertissement, suspension temporaire, ou ban définitif selon la gravité.",
    ],
  },
  {
    code: '04',
    icon: Coins,
    title: "Paris — pari mutuel",
    accent: 'yellow' as Accent,
    body: [
      "Les paris se placent uniquement depuis le site cdm26.com, sur la page d'un match ouvert.",
      "Les mises sont débitées sur tes points de chaîne Twitch (gérés par Wizebot) — aucune valeur monétaire réelle.",
      "Le système est en pari mutuel : les cotes sont calculées dynamiquement selon le pool, avec une marge maison de 5%.",
      "Une fois validé, le pari est définitif. Aucun remboursement n'est possible (sauf match annulé → mise remboursée intégralement).",
      "Les gains sont crédités automatiquement après validation officielle du score. En cas d'échec côté Wizebot, l'admin peut relancer le crédit.",
      "L'organisation n'est pas responsable d'un éventuel dysfonctionnement de Wizebot ou de Twitch entraînant un retard de crédit.",
    ],
  },
  {
    code: '05',
    icon: Copyright,
    title: "Propriété intellectuelle",
    accent: 'purple' as Accent,
    body: [
      "Les marques, logos, design, code source de CDM 26 sont la propriété exclusive de l'organisation.",
      "Les marques tierces (FIFA, EA SPORTS FC 26, Twitch, Wizebot, drapeaux nationaux) restent la propriété de leurs ayants droit.",
      "Tu conserves les droits sur les contenus que tu publies (logos d'équipes, avatars, messages chat) mais tu accordes à CDM 26 une licence non exclusive d'utilisation pour la diffusion et l'archivage du tournoi.",
      "Toute reproduction, copie ou réutilisation du site sans autorisation écrite est interdite.",
    ],
  },
  {
    code: '06',
    icon: AlertTriangle,
    title: "Responsabilité & garanties",
    accent: 'red' as Accent,
    body: [
      "La plateforme est fournie en l'état, sans garantie expresse ou implicite de disponibilité 24/7.",
      "L'organisation s'efforce d'assurer la continuité du service mais ne peut être tenue responsable d'une interruption ponctuelle (maintenance, panne du fournisseur cloud, etc.).",
      "Les contenus tiers (streams, vidéos, chat) restent sous la responsabilité de leurs auteurs respectifs.",
      "L'organisation décline toute responsabilité en cas d'utilisation frauduleuse de ton compte par un tiers (hors faute prouvée de notre part).",
      "Les données affichées sur la plateforme (statistiques, classements, paris) sont fournies à titre informatif.",
    ],
  },
  {
    code: '07',
    icon: Gavel,
    title: "Sanctions & résiliation",
    accent: 'red' as Accent,
    body: [
      "L'organisation peut résilier sans préavis tout compte qui contreviendrait aux CGU ou au règlement.",
      "Tu peux résilier ton compte à tout moment depuis l'espace profil ou par e-mail à privacy@cdm26.gg.",
      "La résiliation entraîne la suppression des données personnelles dans un délai de 30 jours, conformément à la politique de confidentialité.",
      "Les statistiques de match sont anonymisées et conservées à des fins historiques.",
    ],
  },
  {
    code: '08',
    icon: RefreshCw,
    title: "Évolution des CGU",
    accent: 'emerald' as Accent,
    body: [
      "L'organisation se réserve le droit de modifier les CGU à tout moment.",
      "Toute modification substantielle est notifiée par e-mail au moins 15 jours avant son entrée en vigueur.",
      "L'utilisation continue de la plateforme après notification vaut acceptation des nouvelles CGU.",
      "En cas de désaccord, tu peux résilier ton compte sans frais avant l'entrée en vigueur.",
    ],
  },
  {
    code: '09',
    icon: Scale,
    title: "Loi applicable & litiges",
    accent: 'yellow' as Accent,
    body: [
      "Les présentes CGU sont régies par le droit français.",
      "En cas de litige, une solution amiable sera recherchée en priorité par e-mail à legal@cdm26.gg.",
      "À défaut d'accord amiable, les tribunaux français seront seuls compétents.",
      "Conformément au Code de la consommation, tu peux recourir gratuitement à un médiateur de la consommation.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Conditions d'utilisation — CDM 26</title>
        <meta name="description" content="Conditions générales d'utilisation CDM 26 — accès, conduite, paris, responsabilité, sanctions." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-yellow-500/50 to-transparent" />
          <div className="container mx-auto px-4 py-20 md:py-28 relative">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition">
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l'accueil
            </Link>

            <SectionEyebrow num="CGU" label="Conditions générales d'utilisation" accent="yellow" />
            <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
              Les <span className="text-gradient-worldcup">conditions</span>
              <br />
              <span className="italic font-light text-white/35">d'utilisation.</span>
            </h1>
            <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
              Le contrat entre toi et CDM 26 — clair, sans piège, et en français.
              L'inscription vaut acceptation pleine et entière du présent document.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <Gavel className="w-3 h-3 mr-1" /> Loi française
              </Badge>
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                <Clock className="w-3 h-3 mr-1" /> Version 2026.1 · 07 Mai 2026
              </Badge>
              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <CircleDot className="w-3 h-3 mr-1" /> 9 articles
              </Badge>
            </div>
          </div>
        </section>

        {/* SECTIONS */}
        <section className="relative bg-black border-b border-white/10 py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-12 gap-10">
              {/* TOC */}
              <aside className="lg:col-span-3">
                <div className="lg:sticky lg:top-24">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-4">
                    / Sommaire
                  </div>
                  <nav className="space-y-1">
                    {ARTICLES.map((a) => (
                      <a
                        key={a.code}
                        href={`#cgu-${a.code}`}
                        className="group flex items-center gap-3 py-2 text-sm text-white/60 hover:text-white transition border-l border-white/10 hover:border-white/30 pl-3"
                      >
                        <span className="font-mono text-xs text-white/40 group-hover:text-white/70">§ {a.code}</span>
                        <span className="font-medium">{a.title}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Articles */}
              <div className="lg:col-span-9 space-y-6">
                {ARTICLES.map((art, i) => {
                  const s = ACCENT[art.accent];
                  return (
                    <motion.div
                      key={art.code}
                      id={`cgu-${art.code}`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      className="relative scroll-mt-24"
                    >
                      <Card className={`relative overflow-hidden bg-white/2 border ${s.border} hover:border-white/30 transition-colors p-7 md:p-8`}>
                        <div className="flex items-start gap-4 mb-5">
                          <div className={`w-11 h-11 rounded-xl bg-white/5 border ${s.border} flex items-center justify-center shrink-0`}>
                            <art.icon className={`w-5 h-5 ${s.text}`} />
                          </div>
                          <div>
                            <div className={`text-[10px] font-mono uppercase tracking-[0.3em] ${s.text} mb-1.5`}>
                              § Article {art.code}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                              {art.title}
                            </h2>
                          </div>
                        </div>
                        <ul className="space-y-2.5">
                          {art.body.map((b, j) => (
                            <li key={j} className="flex gap-4 text-sm md:text-[0.95rem] text-white/75 leading-relaxed">
                              <span className={`shrink-0 mt-1 font-mono text-[11px] ${s.text} tabular-nums`}>
                                {art.code}.{String(j + 1).padStart(2, '0')}
                              </span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                        {art.code === '04' && (
                          <BorderBeam size={160} duration={11} colorFrom="#facc15" colorTo="#dc2626" borderWidth={1} />
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Legal contact + CTA chain */}
        <section className="relative bg-black py-20">
          <div className="container mx-auto px-4">
            <Card className="relative overflow-hidden bg-linear-to-br from-yellow-950/30 via-black to-black border-yellow-500/20 p-8 md:p-10">
              <div className="grid md:grid-cols-[auto_1fr_auto] items-center gap-6">
                <div className="w-14 h-14 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
                  <Gavel className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-mono mb-1.5">
                    Service juridique
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
                    Pour toute question légale ou contentieux
                  </h3>
                  <code className="block text-sm font-mono text-yellow-300 bg-black/40 border border-yellow-500/20 px-3 py-1.5 rounded mt-2 w-fit">
                    legal@cdm26.gg
                  </code>
                </div>
                <a href="mailto:legal@cdm26.gg" className="shrink-0">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact juridique
                  </Button>
                </a>
              </div>
            </Card>

            <Separator className="bg-white/10 my-12" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-2">
                  Documents associés
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Lis aussi notre politique RGPD.
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/privacy">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
                    Politique de confidentialité
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/reglement">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs px-6"
                  >
                    Règlement sportif
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
