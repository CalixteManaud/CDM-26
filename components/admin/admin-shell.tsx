'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Shirt,
  ClipboardCheck,
  Coins,
  Wallet,
  UserCheck,
  MailPlus,
  Shield,
  Menu,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { SystemHealthBadge } from '@/components/admin/system-health-badge';

/**
 * Clé de navigation admin. Chaque page admin passe la sienne à <AdminShell active="…">
 * pour surligner l'entrée courante. Centralise tous les liens admin (fini les liens
 * éparpillés dans chaque hero).
 */
export type AdminNavKey =
  | 'overview'
  | 'gestion'
  | 'equipes'
  | 'invitations'
  | 'matchs'
  | 'markets'
  | 'tresorerie'
  | 'demandes'
  | 'tournois';

type Accent = 'red' | 'emerald' | 'yellow' | 'blue' | 'purple';

const ACCENT_TEXT: Record<Accent, string> = {
  red: 'text-red-400',
  emerald: 'text-emerald-400',
  yellow: 'text-yellow-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
};

type NavItem = {
  key: AdminNavKey;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  accent: Accent;
  external?: boolean;
};

export const ADMIN_NAV: NavItem[] = [
  { key: 'overview', label: "Vue d'ensemble", href: '/admin', icon: LayoutDashboard, accent: 'red' },
  { key: 'gestion', label: 'Utilisateurs & Équipes', href: '/admin/dashboard', icon: Users, accent: 'emerald' },
  { key: 'equipes', label: 'Équipes (CRUD)', href: '/admin/equipes', icon: Shirt, accent: 'yellow' },
  { key: 'invitations', label: 'Invitations équipe', href: '/admin/invitations', icon: MailPlus, accent: 'emerald' },
  { key: 'matchs', label: 'Matchs à revoir', href: '/admin/matchs-a-revoir', icon: ClipboardCheck, accent: 'yellow' },
  { key: 'markets', label: 'Marchés (paris)', href: '/admin/markets', icon: Coins, accent: 'purple' },
  { key: 'tresorerie', label: 'Trésorerie', href: '/admin/tresorerie', icon: Wallet, accent: 'yellow' },
  { key: 'demandes', label: "Demandes d'adhésion", href: '/admin/demandes', icon: UserCheck, accent: 'emerald' },
  { key: 'tournois', label: 'Tournois', href: '/tournaments', icon: Trophy, accent: 'blue', external: true },
];

function NavList({ active, onNavigate }: { active: AdminNavKey; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {ADMIN_NAV.map((item) => {
        const isActive = item.key === active;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-white/[0.06] text-white'
                : 'text-white/55 hover:bg-white/[0.03] hover:text-white/90'
            )}
          >
            {isActive && (
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full',
                  item.accent === 'red' && 'bg-red-500',
                  item.accent === 'emerald' && 'bg-emerald-500',
                  item.accent === 'yellow' && 'bg-yellow-500',
                  item.accent === 'blue' && 'bg-blue-500',
                  item.accent === 'purple' && 'bg-purple-500'
                )}
              />
            )}
            <Icon className={cn('h-4 w-4 shrink-0', isActive ? ACCENT_TEXT[item.accent] : 'text-white/40 group-hover:text-white/70')} />
            <span className="flex-1 truncate">{item.label}</span>
            {item.external && <ExternalLink className="h-3 w-3 text-white/25" />}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-red-600 via-orange-600 to-yellow-500 shadow-lg shadow-red-500/30 ring-1 ring-white/15">
        <Shield className="h-4 w-4 text-white" strokeWidth={2.4} />
      </div>
      <div className="leading-none">
        <div className="text-sm font-black tracking-tight text-white">CDM 26</div>
        <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.3em] text-white/40">Admin</div>
      </div>
    </Link>
  );
}

/**
 * Coquille commune à tout l'espace admin : sidebar persistante (desktop),
 * drawer (mobile), health badge, et un en-tête de page optionnel. Wrappe le
 * contenu de chaque page admin — la nav est unifiée, plus de liens éparpillés.
 */
export function AdminShell({
  active,
  title,
  eyebrow,
  description,
  accent = 'red',
  actions,
  bleed = false,
  children,
}: {
  active: AdminNavKey;
  /** En-tête de page compact (optionnel — les pages historiques gardent leur hero). */
  title?: ReactNode;
  eyebrow?: string;
  description?: ReactNode;
  accent?: Accent;
  actions?: ReactNode;
  /** Main pleine largeur sans padding : pour les pages qui gèrent leurs propres sections. */
  bleed?: boolean;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-black/60 px-4 py-6 backdrop-blur lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <div className="mt-8 flex-1 overflow-y-auto">
          <div className="mb-3 px-3 text-[10px] font-mono uppercase tracking-[0.28em] text-white/30">Pilotage</div>
          <NavList active={active} />
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <SystemHealthBadge />
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Ouvrir le menu admin"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 hover:text-white"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-white/10 bg-black p-0 text-white">
            <SheetTitle className="sr-only">Navigation admin</SheetTitle>
            <div className="flex h-full flex-col px-4 py-6">
              <div className="px-2">
                <Brand />
              </div>
              <div className="mt-8 flex-1 overflow-y-auto">
                <div className="mb-3 px-3 text-[10px] font-mono uppercase tracking-[0.28em] text-white/30">Pilotage</div>
                <NavList active={active} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <SystemHealthBadge />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Brand />
        <div className="h-9 w-9" aria-hidden />
      </header>

      {/* Contenu */}
      <div className="lg:pl-64">
        {(title || eyebrow) && (
          <div className="border-b border-white/10 bg-black">
            <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
              {eyebrow && (
                <div className={cn('inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.32em]', ACCENT_TEXT[accent])}>
                  <span
                    className={cn(
                      'block h-px w-10',
                      accent === 'red' && 'bg-red-400',
                      accent === 'emerald' && 'bg-emerald-400',
                      accent === 'yellow' && 'bg-yellow-400',
                      accent === 'blue' && 'bg-blue-400',
                      accent === 'purple' && 'bg-purple-400'
                    )}
                  />
                  <span className="font-mono">/ {eyebrow}</span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  {title && (
                    <h1 className="text-3xl font-black leading-[0.95] tracking-tight md:text-5xl">{title}</h1>
                  )}
                  {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
            </div>
          </div>
        )}
        {bleed ? (
          <main>{children}</main>
        ) : (
          <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">{children}</main>
        )}
      </div>
    </div>
  );
}

/** Fil d'ariane léger réutilisable dans les pages admin. */
export function AdminCrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <div className="mb-6 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-white/40">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2">
          {it.href ? (
            <Link href={it.href} className="hover:text-white">
              {it.label}
            </Link>
          ) : (
            <span className="text-white/70">{it.label}</span>
          )}
          {i < items.length - 1 && <ChevronRight className="h-3 w-3 text-white/20" />}
        </span>
      ))}
    </div>
  );
}
