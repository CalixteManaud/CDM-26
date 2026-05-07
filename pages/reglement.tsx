import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
  Ban,
  Scale,
  Crown,
  AlertTriangle,
  Clock,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BorderBeam } from '@/components/ui/border-beam';

const ARTICLES = [
  {
    code: '01',
    icon: Trophy,
    title: 'Format du tournoi',
    accent: 'emerald',
    rules: [
      "32 nations réparties en 8 groupes de 4 équipes (A à H).",
      "Phase de poules : matchs aller simple, 3 journées par groupe.",
      "Les 2 meilleures équipes de chaque groupe se qualifient pour les huitièmes de finale.",
      "Phase à élimination directe : huitièmes, quarts, demi-finales, finale.",
      "En cas d'égalité dans un match à élimination directe, prolongations puis tirs au but.",
    ],
  },
  {
    code: '02',
    icon: Users,
    title: 'Composition des équipes',
    accent: 'yellow',
    rules: [
      "Chaque équipe est représentée par un coach (1 utilisateur) et 1 à 11 joueurs.",
      "Un joueur ne peut représenter qu'une seule nation par saison.",
      "Le coach est responsable de la composition, des résultats et de la conduite de son équipe.",
      "Toute modification de l'effectif après le début de la phase à élimination directe est interdite.",
      "Un compte Twitch lié au profil joueur est obligatoire pour participer aux paris mutuels.",
    ],
  },
  {
    code: '03',
    icon: Swords,
    title: 'Déroulement des matchs',
    accent: 'red',
    rules: [
      "Tous les matchs sont joués sur EA SPORTS FC 26, paramètres officiels CDM 26 (mi-temps 6 min, niveau Légende).",
      "Les matchs sont diffusés en direct sur la chaîne Twitch officielle.",
      "Les deux équipes doivent être prêtes 10 minutes avant le coup d'envoi.",
      "Tout retard supérieur à 15 minutes entraîne la défaite par forfait (3-0).",
      "Le score final est validé par soumission via la plateforme par l'un des deux coachs, contresigné par l'admin.",
    ],
  },
  {
    code: '04',
    icon: Scale,
    title: 'Tie-breakers (phase de poules)',
    accent: 'emerald',
    rules: [
      "Critère 1 — Points (V = 3, N = 1, D = 0).",
      "Critère 2 — Différence de buts générale.",
      "Critère 3 — Buts marqués.",
      "Critère 4 — Confrontation directe entre les équipes ex æquo.",
      "Critère 5 — Tirage au sort par l'organisation.",
    ],
  },
  {
    code: '05',
    icon: Ban,
    title: 'Disqualification & sanctions',
    accent: 'red',
    rules: [
      "Triche, exploits, déconnexions volontaires : disqualification immédiate.",
      "Manque de respect, propos haineux dans le chat Twitch ou en jeu : avertissement puis exclusion.",
      "Multi-comptes ou usurpation d'identité : ban définitif de la plateforme.",
      "Une équipe disqualifiée perd tous ses points acquis. Ses matchs passés sont remplacés par 3-0 forfait.",
      "Aucun appel de la décision admin n'est possible une fois la sanction appliquée.",
    ],
  },
  {
    code: '06',
    icon: Crown,
    title: 'Trophée & récompenses',
    accent: 'yellow',
    rules: [
      "Le vainqueur reçoit le titre officiel de Champion CDM 26 — Saison 2026.",
      "Le top 4 obtient un badge permanent sur le profil joueur.",
      "Les 3 meilleurs buteurs reçoivent le Soulier d'Or, Argent et Bronze.",
      "Le meilleur gardien reçoit le Gant d'Or.",
      "Un MVP par tournoi est élu par les casters et l'organisation.",
    ],
  },
];

type Accent = 'emerald' | 'yellow' | 'red';
const ACCENT: Record<Accent, { text: string; bg: string; border: string; ring: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/25', ring: 'from-emerald-950/40' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/25', ring: 'from-yellow-950/40' },
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

export default function ReglementPage() {
  return (
    <>
      <Head>
        <title>Règlement officiel — CDM 26</title>
        <meta name="description" content="Règlement officiel de la Coupe du Monde FIFA 26 sur Twitch. Format, composition, déroulement, sanctions, trophées." />
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-30 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-20 md:py-28 relative">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition">
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l'accueil
            </Link>

            <SectionEyebrow num="REG" label="Règlement officiel" accent="emerald" />
            <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
              Le <span className="text-gradient-worldcup">règlement</span>
              <br />
              <span className="italic font-light text-white/35">CDM 26.</span>
            </h1>
            <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
              Les règles applicables à toutes les équipes, joueurs et coachs participant à la Coupe du Monde FIFA 26.
              Lisez attentivement avant de soumettre votre inscription — chaque article fait foi en cas de litige.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <ShieldCheck className="w-3 h-3 mr-1" /> Version 2026.1
              </Badge>
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                <Clock className="w-3 h-3 mr-1" /> MAJ 07 Mai 2026
              </Badge>
              <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <CircleDot className="w-3 h-3 mr-1" /> Saison 2026
              </Badge>
            </div>
          </div>
        </section>

        {/* TOC + ARTICLES */}
        <section className="relative bg-black border-b border-white/10 py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-12 gap-10">
              {/* TOC sticky */}
              <aside className="lg:col-span-3">
                <div className="lg:sticky lg:top-24">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-4">
                    / Sommaire
                  </div>
                  <nav className="space-y-1">
                    {ARTICLES.map((a) => (
                      <a
                        key={a.code}
                        href={`#article-${a.code}`}
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
                {ARTICLES.map((a, i) => {
                  const s = ACCENT[a.accent as Accent];
                  return (
                    <motion.div
                      key={a.code}
                      id={`article-${a.code}`}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="relative scroll-mt-24"
                    >
                      <Card className={`relative overflow-hidden bg-gradient-to-br ${s.ring} via-black to-black ${s.border} p-7 md:p-9`}>
                        <div className="flex items-start justify-between gap-4 mb-6">
                          <div className="flex items-start gap-4">
                            <div className={`w-11 h-11 rounded-xl bg-white/5 border ${s.border} flex items-center justify-center shrink-0`}>
                              <a.icon className={`w-5 h-5 ${s.text}`} />
                            </div>
                            <div>
                              <div className={`text-[10px] font-mono uppercase tracking-[0.3em] ${s.text} mb-1.5`}>
                                § Article {a.code}
                              </div>
                              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                                {a.title}
                              </h2>
                            </div>
                          </div>
                        </div>

                        <ol className="space-y-3 ml-0">
                          {a.rules.map((r, j) => (
                            <li key={j} className="flex gap-4 text-sm md:text-base text-white/75 leading-relaxed group">
                              <span className={`shrink-0 mt-1 font-mono text-xs ${s.text} tabular-nums`}>
                                {a.code}.{String(j + 1).padStart(2, '0')}
                              </span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ol>

                        {a.code === '05' && (
                          <BorderBeam size={180} duration={10} colorFrom="#ef4444" colorTo="#facc15" borderWidth={1} />
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* WARNING + CTA */}
        <section className="relative bg-black py-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <Card className="relative overflow-hidden bg-gradient-to-br from-red-950/30 via-black to-black border-red-500/20 p-8 md:p-10">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-red-400 mb-1.5">
                    § Note finale
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">
                    L'inscription vaut acceptation pleine et entière du règlement.
                  </h3>
                  <p className="text-white/70 leading-relaxed text-sm md:text-base">
                    L'organisation se réserve le droit de modifier le règlement à tout moment pour le bon déroulement
                    de la compétition. Toute modification est notifiée par e-mail et publiée sur cette page.
                  </p>
                </div>
              </div>
              <BorderBeam size={200} duration={12} colorFrom="#ef4444" colorTo="#dc2626" borderWidth={1} />
            </Card>

            <Separator className="bg-white/10 my-12" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono mb-2">
                  Une question sur le règlement ?
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  L'équipe support t'aiguille.
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/support">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-6">
                    Contacter le support
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/faq">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-black uppercase tracking-[0.18em] text-xs px-6"
                  >
                    Voir la FAQ
                    <ChevronRight className="w-4 h-4 ml-1" />
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
