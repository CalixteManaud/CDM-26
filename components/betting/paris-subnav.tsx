import Link from 'next/link';
import { Activity, Trophy, User } from 'lucide-react';

import { cn } from '@/lib/utils';

const TABS = [
  { href: '/paris', label: 'Cotes en direct', code: 'LIVE', icon: Activity, accent: 'text-yellow-300' },
  { href: '/paris/mes-paris', label: 'Mes paris', code: 'PERSO', icon: User, accent: 'text-emerald-300' },
  { href: '/paris/classement', label: 'Classement', code: 'TOP', icon: Trophy, accent: 'text-purple-300' },
] as const;

export function ParisSubnav({ active }: { active: 'live' | 'mine' | 'leaderboard' }) {
  const activeHref =
    active === 'live' ? '/paris' : active === 'mine' ? '/paris/mes-paris' : '/paris/classement';

  return (
    <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-16 z-30">
      <div className="container mx-auto px-4">
        <ul className="flex items-stretch gap-2 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.href === activeHref;
            return (
              <li key={t.href} className="shrink-0">
                <Link
                  href={t.href}
                  className={cn(
                    'group relative flex items-center gap-2.5 px-4 py-3 text-[11px] font-mono uppercase tracking-[0.22em] transition-colors',
                    isActive
                      ? 'text-white'
                      : 'text-white/45 hover:text-white/80'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5', isActive ? t.accent : 'text-white/40')} />
                  <span className="font-bold">{t.label}</span>
                  <span className={cn('text-[9px] tracking-[0.3em]', isActive ? 'text-white/35' : 'text-white/20')}>
                    / {t.code}
                  </span>
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-linear-to-r from-emerald-400 via-yellow-400 to-red-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
