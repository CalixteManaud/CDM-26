import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  Trophy,
  Tv,
  Coins,
  Users,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

const CATEGORIES = [
  { key: 'general', label: 'Général', icon: HelpCircle, accent: 'emerald' as Accent },
  { key: 'tournois', label: 'Tournois', icon: Trophy, accent: 'yellow' as Accent },
  { key: 'twitch', label: 'Twitch & Streams', icon: Tv, accent: 'purple' as Accent },
  { key: 'paris', label: 'Paris', icon: Coins, accent: 'red' as Accent },
  { key: 'equipes', label: 'Équipes & Joueurs', icon: Users, accent: 'emerald' as Accent },
];

const FAQS: Record<string, Array<{ q: string; a: string }>> = {
  general: [
    {
      q: "C'est quoi CDM 26 exactement ?",
      a: "CDM 26 est une plateforme communautaire qui organise la Coupe du Monde FIFA 26 en version esport, diffusée en direct sur Twitch. 32 nations s'affrontent pendant 6 semaines, en phase de poules puis à élimination directe.",
    },
    {
      q: "C'est gratuit ?",
      a: "Oui. L'inscription, la participation, le visionnage des streams et la consultation des stats sont totalement gratuits. Les paris se font avec les points de chaîne Twitch (gratuits, accumulés en regardant les streams).",
    },
    {
      q: "Sur quel jeu se déroulent les matchs ?",
      a: "EA SPORTS FC 26, sur consoles dernière génération. Paramètres officiels CDM 26 : mi-temps de 6 minutes, niveau Légende, équipes nationales uniquement.",
    },
    {
      q: "Comment je m'inscris ?",
      a: "Crée ton compte sur la page Sign-up via Clerk (e-mail ou OAuth Twitch). Tu peux ensuite rejoindre une équipe nationale ou en créer une si tu es coach.",
    },
  ],
  tournois: [
    {
      q: "Comment fonctionne la phase de poules ?",
      a: "32 équipes réparties en 8 groupes de 4. Match aller simple, 3 journées. Les 2 meilleures équipes de chaque groupe se qualifient pour les huitièmes de finale.",
    },
    {
      q: "Que se passe-t-il en cas d'égalité dans un groupe ?",
      a: "Tie-breakers dans l'ordre : points → différence de buts générale → buts marqués → confrontation directe → tirage au sort par l'organisation.",
    },
    {
      q: "Et en élimination directe ?",
      a: "Match unique. Si égalité au temps réglementaire : 2×3 min de prolongations, puis tirs au but si toujours égalité.",
    },
    {
      q: "Le bracket s'actualise automatiquement ?",
      a: "Oui. Dès qu'un match est validé par les coachs et l'admin, le bracket se met à jour en temps réel. Les qualifiés sont calculés automatiquement.",
    },
    {
      q: "Comment soumettre le score d'un match ?",
      a: "Depuis la page du match (signed-in en tant que coach des deux équipes ou admin), via le formulaire de soumission. L'autre coach reçoit une notification pour valider.",
    },
  ],
  twitch: [
    {
      q: "Où regarder les matchs en direct ?",
      a: "Sur la chaîne Twitch officielle twitch.tv/blaize. Tous les matchs sont diffusés en 1080p60 avec commentaires francophones.",
    },
    {
      q: "Les co-streams sont autorisés ?",
      a: "Oui, à condition de citer la chaîne officielle et de respecter le règlement Twitch. Les casters partenaires apparaissent dans la section 'Streamers' de l'accueil.",
    },
    {
      q: "Pourquoi lier mon compte Twitch ?",
      a: "Pour parier sur les matchs avec tes points de chaîne (la monnaie de Wizebot), et pour que tes pseudo et avatar soient synchronisés avec ton profil joueur.",
    },
    {
      q: "Je peux délier mon compte Twitch ?",
      a: "Oui, depuis le portail Clerk via la page de profil. Tu perdras alors la possibilité de parier mais conserveras tes statistiques de joueur.",
    },
  ],
  paris: [
    {
      q: "Comment parier sur un match ?",
      a: "Tout se passe sur le site. Va sur la page d'un match ouvert (statut SCHEDULED ou LIVE pendant la fenêtre live), choisis HOME / NUL / AWAY, ta mise, et valide. Les points sont débités de ton solde de chaîne Twitch via Wizebot.",
    },
    {
      q: "Avec quelle monnaie je parie ?",
      a: "Avec tes points de chaîne Twitch, gérés par Wizebot. Pas de carte bleue, pas d'argent réel — c'est de la monnaie virtuelle Twitch, identique à celle que tu accumules en regardant les streams.",
    },
    {
      q: "Pourquoi dois-je lier mon Twitch pour parier ?",
      a: "Parce que c'est sur ton compte Twitch (via Wizebot) que les points sont débités à la mise et crédités au gain. Sans lien Twitch, on ne sait pas où prendre / déposer les points.",
    },
    {
      q: "Comment sont calculées les cotes ?",
      a: "En pari mutuel : pas de cote fixe. Le ratio se calcule en live à partir du pool total et de la mise sur chaque issue, avec une marge maison de 5%.",
    },
    {
      q: "Quand puis-je parier ?",
      a: "Tant que le match est SCHEDULED avant le coup d'envoi, ou LIVE pendant la fenêtre de live betting (25 minutes après le coup d'envoi). Une fois la fenêtre dépassée, le marché est verrouillé.",
    },
    {
      q: "Quand mes gains sont-ils crédités ?",
      a: "Automatiquement après la validation du score par l'admin. Si le crédit Wizebot échoue (réseau down par ex.), ton pari passe en CREDIT_FAILED et un admin peut relancer le crédit depuis le dashboard.",
    },
    {
      q: "Je peux annuler un pari ?",
      a: "Non. Une fois validé, l'opération est définitive. Seule exception : si le match est annulé par l'organisation, tous les paris passent en VOID et tes points sont remboursés intégralement.",
    },
  ],
  equipes: [
    {
      q: "Comment devenir coach d'une équipe ?",
      a: "Demande à un administrateur d'être promu coach. Une fois la promotion effectuée, tu peux créer ou prendre la direction d'une équipe nationale.",
    },
    {
      q: "Combien de joueurs par équipe ?",
      a: "Maximum 11 joueurs par équipe nationale. Le coach gère la composition pour chaque match.",
    },
    {
      q: "Je peux jouer pour deux nations ?",
      a: "Non. Un joueur ne peut représenter qu'une seule nation par saison.",
    },
    {
      q: "Comment ajouter un logo d'équipe ?",
      a: "Depuis la page de création/édition de ton équipe. Le logo est uploadé sur Vercel Blob, compressé en WebP, et affiché partout dans la plateforme.",
    },
  ],
};

function FaqItem({ q, a, index, accent }: { q: string; a: string; index: number; accent: Accent }) {
  const [open, setOpen] = useState(false);
  const s = ACCENT[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <Card className={`relative overflow-hidden bg-white/2 ${open ? 'border-white/30' : 'border-white/10'} transition-all p-0`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-start justify-between gap-4 p-5 text-left group"
        >
          <div className="flex items-start gap-4 flex-1">
            <span className={`shrink-0 mt-0.5 font-mono text-[11px] ${s.text} uppercase tracking-[0.2em] tabular-nums`}>
              Q.{String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-base md:text-lg font-bold text-white leading-snug tracking-tight group-hover:text-white/90">
              {q}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-white/50 shrink-0 transition-transform ${open ? 'rotate-180 text-white' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-0 ml-12 text-white/70 leading-relaxed text-sm md:text-base border-l border-white/10 -mt-1">
                <div className="pl-4">{a}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default function FaqPage() {
  return (
    <>
      <Head>
        <title>FAQ — CDM 26</title>
        <meta name="description" content="Foire aux questions CDM 26 : tournoi, équipes, Twitch, paris en points de chaîne, inscription. Toutes les réponses." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-30 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-yellow-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-20 md:py-28 relative">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition">
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l'accueil
            </Link>

            <SectionEyebrow num="FAQ" label="Foire aux questions" accent="yellow" />
            <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
              Les <span className="text-gradient-worldcup">questions</span>
              <br />
              <span className="italic font-light text-white/35">qui reviennent.</span>
            </h1>
            <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
              22 réponses courtes, classées par thème. Cherche ton sujet dans les onglets ci-dessous —
              et si tu ne trouves pas, le support répond en moins de 24h.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <CircleDot className="w-3 h-3 mr-1" /> 24 réponses
              </Badge>
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                Maj 07 Mai 2026
              </Badge>
            </div>
          </div>
        </section>

        {/* TABS + ITEMS */}
        <section className="relative bg-black border-b border-white/10 py-20">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="bg-white/3 border border-white/10 p-1 rounded-full flex flex-wrap gap-1 h-auto justify-start mb-10">
                {CATEGORIES.map((c) => (
                  <TabsTrigger
                    key={c.key}
                    value={c.key}
                    className="rounded-full px-4 md:px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-black text-white/60 data-[state=active]:shadow-md transition-all flex items-center gap-2"
                  >
                    <c.icon className="w-3.5 h-3.5" />
                    {c.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {CATEGORIES.map((c) => (
                <TabsContent key={c.key} value={c.key} className="mt-0">
                  <div className="grid lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-4">
                      <SectionEyebrow num={c.key.slice(0, 3).toUpperCase()} label={c.label} accent={c.accent} />
                      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mt-4 leading-tight">
                        {c.label}
                      </h2>
                      <p className="text-white/60 mt-4 text-sm leading-relaxed">
                        {FAQS[c.key].length} questions répertoriées dans cette catégorie. Clique sur une question pour voir la réponse.
                      </p>
                    </div>
                    <div className="lg:col-span-8 space-y-3">
                      {FAQS[c.key].map((item, i) => (
                        <FaqItem key={item.q} {...item} index={i} accent={c.accent} />
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* CTA */}
        <section className="relative bg-black py-20">
          <div className="container mx-auto px-4">
            <Card className="relative overflow-hidden bg-linear-to-br from-emerald-950/30 via-black to-black border-emerald-500/20 p-10 text-center">
              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-mono mb-3">
                / Pas trouvé ta réponse ?
              </div>
              <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 leading-[0.95]">
                Le <span className="text-gradient-worldcup">support</span>{' '}
                <span className="italic font-light text-white/35">répond.</span>
              </h3>
              <p className="text-white/65 max-w-md mx-auto mb-8">
                L'équipe est joignable par e-mail et dans le chat Twitch pendant les diffusions.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/support">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
                    Centre de support
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs px-6"
                  >
                    Nous contacter
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}
