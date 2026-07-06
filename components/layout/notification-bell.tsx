'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Gift, Trophy, RotateCcw, AlertTriangle, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

type NotifType = 'TRANSFER_RECEIVED' | 'BET_WON' | 'BET_REFUNDED' | 'BET_CREDIT_FAILED' | 'SYSTEM';

type Notif = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const ICON: Record<NotifType, typeof Bell> = {
  TRANSFER_RECEIVED: Gift,
  BET_WON: Trophy,
  BET_REFUNDED: RotateCcw,
  BET_CREDIT_FAILED: AlertTriangle,
  SYSTEM: Info,
};

const ICON_TONE: Record<NotifType, string> = {
  TRANSFER_RECEIVED: 'text-emerald-400',
  BET_WON: 'text-yellow-400',
  BET_REFUNDED: 'text-blue-400',
  BET_CREDIT_FAILED: 'text-red-400',
  SYSTEM: 'text-white/60',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const json = (await res.json()) as { notifications: Notif[]; unread: number };
      setItems(json.notifications ?? []);
      setUnread(json.unread ?? 0);
    } catch {
      // silencieux
    }
  }, []);

  // Polling 30s, en pause quand l'onglet est masqué.
  useEffect(() => {
    load();
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(load, 30_000);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        load();
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markAllRead = async () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // silencieux — on rechargera au prochain poll
    }
  };

  const markOneRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      // silencieux
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/3 border border-white/10 text-white/75 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black grid place-items-center tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/12 bg-black/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/60">
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300 hover:text-emerald-200"
              >
                <Check className="w-3 h-3" /> Tout lire
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-xs text-white/45">Aucune notification</p>
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICON[n.type];
                const inner = (
                  <div
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 border-b border-white/5 transition',
                      !n.read && 'bg-white/[0.03]'
                    )}
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 grid place-items-center">
                      <Icon className={cn('w-4 h-4', ICON_TONE[n.type])} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{n.title}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-white/60 leading-snug mt-0.5">{n.body}</p>
                      <span className="text-[10px] font-mono text-white/35 mt-1 block">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                );
                return n.href ? (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => {
                      markOneRead(n.id);
                      setOpen(false);
                    }}
                    className="block hover:bg-white/5"
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markOneRead(n.id)}
                    className="block w-full text-left hover:bg-white/5"
                  >
                    {inner}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
