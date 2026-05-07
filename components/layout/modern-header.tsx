'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useSyncExternalStore } from 'react';
import {
  Trophy,
  Home,
  Users,
  Calendar,
  User,
  Menu,
  AlertCircle,
  Sparkles,
  Tv,
  Radio,
  GitBranch,
  Flag,
  Award,
  Shield,
  Coins,
  type LucideIcon,
} from 'lucide-react';

import { BecomeParticipant } from '@/components/user/become-participant';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  PARTICIPANT: 'Participant',
  GUEST: 'Invité',
};

type NavLinkItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const TOURNAMENT_LINKS: NavLinkItem[] = [
  {
    href: '/tournaments',
    title: 'Tous les tournois',
    description: 'Découvre les compétitions actives et passées',
    icon: Trophy,
  },
  {
    href: '/tournaments?filter=upcoming',
    title: 'À venir',
    description: 'Calendrier des prochaines journées',
    icon: Calendar,
  },
  {
    href: '/tournaments?view=bracket',
    title: 'Bracket en direct',
    description: 'Suis la progression de la phase finale',
    icon: GitBranch,
  },
  {
    href: '/tournaments/new',
    title: 'Créer un tournoi',
    description: 'Réservé aux administrateurs',
    icon: Sparkles,
  },
];

const TEAMS_LINKS: NavLinkItem[] = [
  {
    href: '/teams',
    title: 'Toutes les équipes',
    description: 'Les 32 nations de la CDM 26',
    icon: Flag,
  },
  {
    href: '/teams?filter=top-scorers',
    title: 'Top buteurs',
    description: "Le classement du Soulier d'or",
    icon: Award,
  },
  {
    href: '/teams/new',
    title: 'Inscrire une équipe',
    description: 'Crée ta nation et invite tes joueurs',
    icon: Sparkles,
  },
];

const MATCHES_LINKS: NavLinkItem[] = [
  {
    href: '/matches?status=live',
    title: 'En direct',
    description: 'Les rencontres diffusées maintenant',
    icon: Radio,
  },
  {
    href: '/matches',
    title: 'Tous les matchs',
    description: 'Calendrier, scores et résultats',
    icon: Calendar,
  },
  {
    href: 'https://www.twitch.tv/blaize',
    title: 'Stream Twitch',
    description: 'La diffusion officielle CDM 26',
    icon: Tv,
  },
];

function NavLinkCard({
  item,
  onClick,
  inMenu = false,
}: {
  item: NavLinkItem;
  onClick?: () => void;
  inMenu?: boolean;
}) {
  const Icon = item.icon;
  const isExternal = item.href.startsWith('http');

  const inner = (
    <Link
      href={item.href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl p-3 hover:bg-white/4 border border-transparent hover:border-white/15 transition-all"
    >
      <div className="shrink-0 w-9 h-9 rounded-lg bg-white/4 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-colors">
        <Icon className="w-4 h-4 text-white/85 group-hover:text-emerald-300 transition-colors" />
      </div>
      <div className="min-w-0">
        <div className="font-black text-white text-sm leading-tight tracking-tight">
          {item.title}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45 mt-1 leading-snug">
          {item.description}
        </div>
      </div>
    </Link>
  );

  // Inside <NavigationMenu>, wrap with NavigationMenuLink for focus management.
  // Outside (e.g. mobile Sheet), render the bare Link to avoid the
  // "FocusGroupItem must be used within NavigationMenu" runtime error.
  if (inMenu) {
    return <NavigationMenuLink asChild>{inner}</NavigationMenuLink>;
  }
  return inner;
}

export function ModernHeader() {
  const { isSignedIn, user } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = user?.publicMetadata?.role === 'ADMIN';
  const userRole = (user?.publicMetadata?.role as string) || 'GUEST';
  const roleLabel = roleLabels[userRole] || 'Invité';
  const isGuest = userRole === 'GUEST';
  const mounted = useIsClient();

  const displayName =
    (user?.publicMetadata?.username as string) ||
    user?.firstName ||
    user?.username ||
    'Utilisateur';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isHome = pathname === '/';

  return (
    <>
      {/* GUEST BANNER */}
      <AnimatePresence>
        {isSignedIn && isGuest && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="relative z-50 bg-linear-to-r from-emerald-600 via-yellow-500 to-red-600"
          >
            <div className="container mx-auto px-4 py-2.5">
              <div className="flex items-center justify-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-black">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-black tracking-tight uppercase">
                    Mode invité — Deviens participant pour intégrer une nation
                  </span>
                </div>
                <BecomeParticipant />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-300',
          scrolled
            ? 'bg-black/75 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/40'
            : 'bg-transparent'
        )}
      >
        <div className="container mx-auto px-4">
          <div
            className={cn(
              'flex items-center justify-between transition-[height] duration-300',
              scrolled ? 'h-16' : 'h-20'
            )}
          >
            {/* LEFT — Brand */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/40 via-yellow-500/40 to-red-500/40 rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
                <motion.div
                  whileHover={{ rotate: -6, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative w-11 h-11 rounded-2xl bg-white/4 border border-white/15 flex items-center justify-center shadow-md overflow-hidden"
                >
                  <Image
                    src="/logo.png"
                    alt="CDM 26"
                    width={36}
                    height={36}
                    className="w-9 h-9 object-contain"
                  />
                </motion.div>
              </div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-xl font-black text-gradient-worldcup tracking-tight">
                  CDM 26
                </span>
                <span className="text-[10px] text-white/45 font-mono uppercase tracking-[0.25em] flex items-center gap-1.5">
                  <span className="live-dot scale-50" /> FIFA 26 · Twitch
                </span>
              </div>
            </Link>

            {/* CENTER — Desktop NavigationMenu */}
            <NavigationMenu viewport={false} className="hidden lg:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/"
                      data-active={isHome}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'flex-row gap-2 bg-transparent text-white/75 hover:bg-white/5 hover:text-white font-bold uppercase tracking-widest text-xs',
                        isHome && 'bg-white/6 text-white'
                      )}
                    >
                      <Home className="w-4 h-4" />
                      Accueil
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="gap-2 bg-transparent text-white/75 hover:bg-white/5 hover:text-white data-[state=open]:bg-white/6 data-[state=open]:text-white font-bold uppercase tracking-widest text-xs">
                    <Trophy className="w-4 h-4" />
                    Tournois
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-black/95 backdrop-blur-xl border border-white/10">
                    <ul className="grid w-110 gap-1 p-2 md:grid-cols-2">
                      {TOURNAMENT_LINKS.map((item) => (
                        <li key={item.href}>
                          <NavLinkCard item={item} inMenu />
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="gap-2 bg-transparent text-white/75 hover:bg-white/5 hover:text-white data-[state=open]:bg-white/6 data-[state=open]:text-white font-bold uppercase tracking-widest text-xs">
                    <Users className="w-4 h-4" />
                    Équipes
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-black/95 backdrop-blur-xl border border-white/10">
                    <ul className="grid w-95 gap-1 p-2">
                      {TEAMS_LINKS.map((item) => (
                        <li key={item.href}>
                          <NavLinkCard item={item} inMenu />
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="gap-2 bg-transparent text-white/75 hover:bg-white/5 hover:text-white data-[state=open]:bg-white/6 data-[state=open]:text-white font-bold uppercase tracking-widest text-xs">
                    <Calendar className="w-4 h-4" />
                    Matchs
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-black/95 backdrop-blur-xl border border-white/10">
                    <ul className="grid w-95 gap-1 p-2">
                      {MATCHES_LINKS.map((item) => (
                        <li key={item.href}>
                          <NavLinkCard item={item} inMenu />
                        </li>
                      ))}
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            href="https://www.twitch.tv/blaize"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 flex items-center justify-between gap-3 rounded-xl p-3 bg-linear-to-r from-purple-700 to-fuchsia-700 hover:from-purple-600 hover:to-fuchsia-600 text-white transition-colors border border-purple-500/40"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                                <Tv className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-black tracking-tight">Stream Twitch</div>
                                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/85 mt-0.5">
                                  2 471 viewers · Live
                                </div>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.18em]">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              LIVE
                            </span>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/paris"
                      data-active={pathname?.startsWith('/paris')}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        'flex-row gap-2 bg-transparent text-white/75 hover:bg-white/5 hover:text-white font-bold uppercase tracking-widest text-xs',
                        pathname?.startsWith('/paris') && 'bg-yellow-500/10 text-yellow-300'
                      )}
                    >
                      <Coins className="w-4 h-4" />
                      Paris
                      <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 text-[8px] font-mono tracking-[0.2em]">
                        <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
                        LIVE
                      </span>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {isSignedIn && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/profile"
                        data-active={pathname === '/profile'}
                        className={cn(
                          navigationMenuTriggerStyle(),
                          'flex-row gap-2 bg-transparent text-white/75 hover:bg-white/5 hover:text-white font-bold uppercase tracking-widest text-xs',
                          pathname === '/profile' && 'bg-white/6 text-white'
                        )}
                      >
                        <User className="w-4 h-4" />
                        Profil
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>

            {/* RIGHT — Actions */}
            <div className="flex items-center gap-2">
              {/* Twitch CTA */}
              <a
                href="https://www.twitch.tv/blaize"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#9146ff] hover:bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-[0.18em] shadow-md shadow-purple-500/30 transition-colors"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              </a>

              {/* User section */}
              {isSignedIn ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link href="/admin/dashboard" className="hidden md:block">
                      <Button
                        size="sm"
                        className="rounded-full font-black uppercase tracking-[0.15em] text-[11px] bg-linear-to-r from-red-600 via-orange-600 to-yellow-500 hover:brightness-110 text-white shadow-md shadow-red-500/30 border-0"
                      >
                        <Shield className="w-3.5 h-3.5 mr-1.5" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/3 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all"
                  >
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-xs font-black text-white tracking-tight">
                        {displayName}
                      </span>
                      <span className="text-[9px] font-mono text-white/45 uppercase tracking-[0.25em]">
                        {roleLabel}
                      </span>
                    </div>
                  </Link>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox:
                          'w-9 h-9 ring-2 ring-emerald-500/30 hover:ring-emerald-500/60 transition-all',
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/sign-in">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-black uppercase tracking-[0.15em] text-[11px] text-white/75 hover:text-white hover:bg-white/5"
                    >
                      Connexion
                    </Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button
                      size="sm"
                      className="rounded-full font-black uppercase tracking-[0.15em] text-[11px] bg-linear-to-r from-emerald-600 via-yellow-500 to-red-600 hover:brightness-110 text-white shadow-md shadow-emerald-500/30 border-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      S&apos;inscrire
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile trigger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-white/85 hover:text-white hover:bg-white/5"
                  >
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">Ouvrir le menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-full sm:max-w-sm p-0 flex flex-col bg-black border-white/10"
                >
                  <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10">
                    <SheetTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/15 flex items-center justify-center shadow-sm">
                        <Image
                          src="/logo.png"
                          alt="CDM 26"
                          width={32}
                          height={32}
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-lg font-black text-gradient-worldcup tracking-tight">
                          CDM 26
                        </span>
                        <span className="text-[9px] font-mono text-white/45 uppercase tracking-[0.25em]">
                          FIFA 26 · Twitch
                        </span>
                      </div>
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      Navigation principale de la Coupe du Monde FIFA 26
                    </SheetDescription>
                  </SheetHeader>

                  <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {[{ href: '/', label: 'Accueil', icon: Home }].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black uppercase tracking-[0.12em] transition-colors',
                          pathname === item.href
                            ? 'bg-white/6 text-white border border-white/15'
                            : 'text-white/65 hover:bg-white/4 hover:text-white border border-transparent'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}

                    <SectionLabel>Tournois</SectionLabel>
                    {TOURNAMENT_LINKS.map((item) => (
                      <NavLinkCard
                        key={item.href}
                        item={item}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}

                    <SectionLabel>Équipes</SectionLabel>
                    {TEAMS_LINKS.map((item) => (
                      <NavLinkCard
                        key={item.href}
                        item={item}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}

                    <SectionLabel>Matchs &amp; Streams</SectionLabel>
                    {MATCHES_LINKS.map((item) => (
                      <NavLinkCard
                        key={item.href}
                        item={item}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}

                    <SectionLabel>Paris</SectionLabel>
                    <Link
                      href="/paris"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'group flex items-start gap-3 rounded-xl p-3 border transition-all',
                        pathname?.startsWith('/paris')
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'border-transparent hover:bg-white/4 hover:border-white/15'
                      )}
                    >
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-yellow-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm leading-tight tracking-tight">
                            Cotes en direct
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 text-[8px] font-mono tracking-[0.2em]">
                            <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
                            LIVE
                          </span>
                        </div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45 mt-1 leading-snug">
                          Pari mutuel · Wizebot · Twitch
                        </div>
                      </div>
                    </Link>

                    {isSignedIn && (
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 mt-3 rounded-xl text-sm font-black uppercase tracking-[0.12em] text-white/65 hover:bg-white/4 hover:text-white border border-transparent hover:border-white/15 transition-colors"
                      >
                        <User className="w-4 h-4" /> Mon profil
                      </Link>
                    )}
                    {isSignedIn && isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm font-black uppercase tracking-[0.12em] bg-linear-to-r from-red-600 via-orange-600 to-yellow-500 text-white"
                      >
                        <Shield className="w-4 h-4" /> Dashboard Admin
                      </Link>
                    )}
                  </nav>

                  <div className="border-t border-white/10 p-4 space-y-3 bg-white/2">
                    <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-white/45 uppercase tracking-[0.25em]">
                      <span className="flex items-center gap-1.5">
                        <span className="live-dot scale-75" /> ON AIR
                      </span>
                      <span>SAISON 2026</span>
                      <span className="flex items-center gap-1">
                        <Tv className="w-3 h-3 text-purple-400" /> Twitch
                      </span>
                    </div>
                    {isSignedIn && isGuest && <BecomeParticipant />}
                    {!isSignedIn && (
                      <div className="space-y-2">
                        <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                          <Button
                            variant="outline"
                            className="w-full font-black uppercase tracking-[0.15em] text-xs border-white/15 hover:border-white/30 hover:bg-white/5 text-white"
                          >
                            Connexion
                          </Button>
                        </Link>
                        <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
                          <Button className="w-full rounded-full font-black uppercase tracking-[0.15em] text-xs bg-linear-to-r from-emerald-600 via-yellow-500 to-red-600 hover:brightness-110 text-white border-0">
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            S&apos;inscrire
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </motion.header>
      {/* Mark mounted to avoid SSR mismatch on client-only branches */}
      {!mounted && null}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-5 pb-2 px-3 text-[9px] font-mono uppercase tracking-[0.3em] text-white/35 flex items-center gap-2">
      <span className="block w-6 h-px bg-white/20" />
      {children}
    </div>
  );
}
