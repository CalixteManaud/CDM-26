import { ReactNode } from 'react';
import { ModernHeader } from './modern-header';
import { Trophy } from 'lucide-react';
import Link from 'next/link';

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.13c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.74.4-1.26.73-1.55-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17.91-.25 1.89-.38 2.86-.39.97 0 1.95.13 2.86.39 2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

const TwitchIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
  </svg>
);

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ModernHeader />
      <main>
        {children}
      </main>
      <footer className="relative border-t border-border bg-background/50 backdrop-blur-xl mt-20">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-linear-to-br from-primary/20 to-primary/10">
                  <Trophy className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-black text-gradient-worldcup">
                  CDM 26
                </h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-md">
                La Coupe du Monde FIFA 26 sur Twitch. 32 nations, des centaines de joueurs, une seule couronne mondiale à conquérir.
              </p>
              <div className="flex space-x-3">
                <a
                  href="#"
                  title="Twitter"
                  className="group p-3 rounded-xl bg-secondary border border-border hover:border-foreground/20 hover:bg-secondary/80 transition-all"
                >
                  <TwitterIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
                <a
                  href="#"
                  title="GitHub"
                  className="group p-3 rounded-xl bg-secondary border border-border hover:border-foreground/20 hover:bg-secondary/80 transition-all"
                >
                  <GithubIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
                <a
                  href="https://www.twitch.tv/blaize"
                  title="Twitch"
                  className="group p-3 rounded-xl bg-secondary border border-border hover:border-purple-500/50 hover:bg-purple-500/10 transition-all"
                >
                  <TwitchIcon className="w-5 h-5 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">
                Navigation
              </h4>
              <div className="space-y-3">
                {[
                  { name: 'Accueil', href: '/' },
                  { name: 'Tournois', href: '/tournaments' },
                  { name: 'Équipes', href: '/teams' },
                  { name: 'Matchs', href: '/matches' },
                  { name: 'Profil', href: '/profile' },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block text-muted-foreground hover:text-primary hover:translate-x-1 text-sm transition-all"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">
                Ressources
              </h4>
              <div className="space-y-3">
                {[
                  { name: 'Règlement', href: '/reglement' },
                  { name: 'Support', href: '/support' },
                  { name: 'FAQ', href: '/faq' },
                  { name: 'Contact', href: '/contact' },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block text-muted-foreground hover:text-primary hover:translate-x-1 text-sm transition-all"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground">
                © 2026 CDM 26. Tous droits réservés.
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Politique de confidentialité
                </Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Conditions d&apos;utilisation
                </Link>
              </div>
              <div className="text-sm text-muted-foreground">
                Propulsé par{' '}
                <span className="text-foreground font-semibold hover:text-primary transition-colors">Next.js</span>
                {' & '}
                <span className="text-foreground font-semibold hover:text-primary transition-colors">Clerk</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
