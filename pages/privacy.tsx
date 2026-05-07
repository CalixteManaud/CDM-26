import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Database,
  Cookie,
  KeyRound,
  Tv,
  Users,
  Trash2,
  Mail,
  Clock,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

const SECTIONS = [
  {
    code: '01',
    icon: Database,
    title: "Données collectées",
    accent: 'emerald' as Accent,
    body: [
      "Compte (via Clerk) : adresse e-mail, pseudo, avatar, mot de passe haché, date d'inscription, identifiant Clerk.",
      "Profil joueur : nation choisie, statistiques de match (buts, passes, cartons), équipe, rôle (joueur, coach, admin).",
      "Lien Twitch (si OAuth) : identifiant Twitch (twitchUserId), pseudo (twitchUsername), avatar Twitch.",
      "Paris Wizebot : montant misé, équipe choisie, identifiant d'événement Wizebot, statut du crédit.",
      "Données techniques : adresse IP partielle (logs serveur), user-agent, horodatage des connexions.",
    ],
  },
  {
    code: '02',
    icon: KeyRound,
    title: "Finalités du traitement",
    accent: 'yellow' as Accent,
    body: [
      "Permettre l'inscription, la connexion et la gestion de ton compte (base légale : exécution du contrat).",
      "Organiser les tournois, calculer les classements, afficher les statistiques (intérêt légitime).",
      "Permettre les paris en pari mutuel via les points de chaîne Twitch (consentement / contrat).",
      "Améliorer la plateforme et corriger les bugs (intérêt légitime).",
      "Communiquer (annonces de matchs, modifications du règlement) — désinscription possible à tout moment.",
    ],
  },
  {
    code: '03',
    icon: Tv,
    title: "Sous-traitants & destinataires",
    accent: 'purple' as Accent,
    body: [
      "Clerk (auth) — hébergement et gestion des comptes utilisateur.",
      "Supabase (base de données) — stockage des profils, équipes, matchs, paris.",
      "Vercel (hébergement) — serveurs Next.js et Vercel Blob (logos, avatars).",
      "Wizebot (paris) — exécution des commandes !parier et crédit des points Twitch.",
      "Twitch (OAuth + diffusion) — authentification optionnelle et chat des streams.",
      "Aucune donnée n'est revendue à des tiers à des fins publicitaires.",
    ],
  },
  {
    code: '04',
    icon: Cookie,
    title: "Cookies & traceurs",
    accent: 'yellow' as Accent,
    body: [
      "Cookies strictement nécessaires : session Clerk (authentification).",
      "Cookies fonctionnels : préférence de thème (clair/sombre), navigation.",
      "Pas de cookies publicitaires, pas de pixels de tracking tiers.",
      "Tu peux refuser ou supprimer les cookies via ton navigateur — la plateforme reste accessible mais la connexion ne sera plus persistante.",
    ],
  },
  {
    code: '05',
    icon: Clock,
    title: "Durée de conservation",
    accent: 'emerald' as Accent,
    body: [
      "Compte actif : tant que tu es inscrit sur CDM 26.",
      "Compte inactif (>24 mois sans connexion) : suppression automatique après notification par e-mail.",
      "Statistiques anonymisées (hors lien avec ton identifiant) : conservées indéfiniment à des fins historiques de la compétition.",
      "Logs techniques : 12 mois maximum.",
      "Données fiscales/comptables (paris) : 6 ans (obligation légale).",
    ],
  },
  {
    code: '06',
    icon: ShieldCheck,
    title: "Tes droits (RGPD)",
    accent: 'emerald' as Accent,
    body: [
      "Droit d'accès : demande une copie de tes données.",
      "Droit de rectification : modifie tes informations directement depuis ton profil ou via le support.",
      "Droit à l'effacement : ferme ton compte et toutes les données personnelles sont supprimées sous 30 jours.",
      "Droit à la portabilité : récupère tes données dans un format lisible (JSON).",
      "Droit d'opposition : refuse certains traitements (notamment communications marketing).",
      "Toute demande à exercer par e-mail à privacy@cdm26.gg — réponse sous 30 jours.",
    ],
  },
  {
    code: '07',
    icon: Trash2,
    title: "Suppression de compte",
    accent: 'red' as Accent,
    body: [
      "Tu peux supprimer ton compte à tout moment depuis l'espace profil ou par e-mail à privacy@cdm26.gg.",
      "La suppression entraîne l'effacement de toutes tes données personnelles dans un délai de 30 jours.",
      "Tes statistiques de match sont anonymisées (le pseudo est remplacé par 'Joueur supprimé') mais conservées pour préserver l'historique du tournoi.",
      "La suppression est irréversible — aucune restauration n'est possible.",
    ],
  },
  {
    code: '08',
    icon: Users,
    title: "Mineurs",
    accent: 'yellow' as Accent,
    body: [
      "L'âge minimum pour utiliser CDM 26 est de 13 ans (limite Twitch et Clerk).",
      "Pour les mineurs entre 13 et 16 ans, l'accord d'un représentant légal est requis.",
      "Si tu détectes qu'un compte appartient à un mineur sans autorisation, contacte privacy@cdm26.gg — le compte sera fermé sous 48h.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Politique de confidentialité — CDM 26</title>
        <meta name="description" content="Politique de confidentialité CDM 26. Données collectées, finalités, sous-traitants, droits RGPD." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          <div className="container mx-auto px-4 py-20 md:py-28 relative">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition">
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l'accueil
            </Link>

            <SectionEyebrow num="PRV" label="Politique de confidentialité" accent="emerald" />
            <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
              Tes <span className="text-gradient-worldcup">données</span>,
              <br />
              <span className="italic font-light text-white/35">tes règles.</span>
            </h1>
            <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
              Comment nous collectons, traitons et protégeons tes données personnelles.
              Conforme au RGPD européen, lisible sans avocat.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <ShieldCheck className="w-3 h-3 mr-1" /> RGPD compliant
              </Badge>
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                <Clock className="w-3 h-3 mr-1" /> Version 2026.1 · 07 Mai 2026
              </Badge>
              <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <CircleDot className="w-3 h-3 mr-1" /> 8 articles
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
                    {SECTIONS.map((s) => (
                      <a
                        key={s.code}
                        href={`#prv-${s.code}`}
                        className="group flex items-center gap-3 py-2 text-sm text-white/60 hover:text-white transition border-l border-white/10 hover:border-white/30 pl-3"
                      >
                        <span className="font-mono text-xs text-white/40 group-hover:text-white/70">§ {s.code}</span>
                        <span className="font-medium">{s.title}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Articles */}
              <div className="lg:col-span-9 space-y-6">
                {SECTIONS.map((sec, i) => {
                  const s = ACCENT[sec.accent];
                  return (
                    <motion.div
                      key={sec.code}
                      id={`prv-${sec.code}`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      className="relative scroll-mt-24"
                    >
                      <Card className={`relative overflow-hidden bg-white/[0.02] border ${s.border} hover:border-white/30 transition-colors p-7 md:p-8`}>
                        <div className="flex items-start gap-4 mb-5">
                          <div className={`w-11 h-11 rounded-xl bg-white/5 border ${s.border} flex items-center justify-center shrink-0`}>
                            <sec.icon className={`w-5 h-5 ${s.text}`} />
                          </div>
                          <div>
                            <div className={`text-[10px] font-mono uppercase tracking-[0.3em] ${s.text} mb-1.5`}>
                              § Article {sec.code}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                              {sec.title}
                            </h2>
                          </div>
                        </div>
                        <ul className="space-y-2.5">
                          {sec.body.map((b, j) => (
                            <li key={j} className="flex gap-4 text-sm md:text-[0.95rem] text-white/75 leading-relaxed">
                              <span className={`shrink-0 mt-1 font-mono text-[11px] ${s.text} tabular-nums`}>
                                {sec.code}.{String(j + 1).padStart(2, '0')}
                              </span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* DPO Contact + CTA */}
        <section className="relative bg-black py-20">
          <div className="container mx-auto px-4">
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/30 via-black to-black border-emerald-500/20 p-8 md:p-10">
              <div className="grid md:grid-cols-[auto_1fr_auto] items-center gap-6">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-mono mb-1.5">
                    Délégué à la protection des données
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">
                    Pour toute demande RGPD
                  </h3>
                  <code className="block text-sm font-mono text-emerald-300 bg-black/40 border border-emerald-500/20 px-3 py-1.5 rounded mt-2 w-fit">
                    privacy@cdm26.gg
                  </code>
                </div>
                <a href="mailto:privacy@cdm26.gg" className="shrink-0">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
                    <Mail className="w-4 h-4 mr-2" />
                    Écrire au DPO
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
                  Lis aussi nos conditions.
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/terms">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
                    Conditions d'utilisation
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
