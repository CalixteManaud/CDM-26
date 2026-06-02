import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type ServiceStatus = 'ok' | 'down' | 'mock';
type Health = {
  services: { db: ServiceStatus; clerk: ServiceStatus; wizebot: ServiceStatus };
  overall: 'ok' | 'degraded' | 'down';
  checkedAt: string;
};

const OVERALL_META = {
  ok: { label: 'Tous services OK', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', icon: CheckCircle2 },
  degraded: { label: 'Service dégradé', cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', icon: AlertTriangle },
  down: { label: 'Incident détecté', cls: 'bg-red-500/10 border-red-500/30 text-red-300', icon: AlertTriangle },
} as const;

const DOT: Record<ServiceStatus, string> = {
  ok: 'bg-emerald-400',
  mock: 'bg-yellow-400',
  down: 'bg-red-400',
};

const SERVICE_LABEL: Record<string, string> = { db: 'Base de données', clerk: 'Auth (Clerk)', wizebot: 'Wizebot' };
const STATUS_WORD: Record<ServiceStatus, string> = { ok: 'OK', mock: 'mock (dev)', down: 'indispo' };

export function SystemHealthBadge({ pollMs = 30000 }: { pollMs?: number }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/admin/health');
        if (!res.ok) throw new Error();
        const json = (await res.json()) as Health;
        if (active) setHealth(json);
      } catch {
        if (active) setHealth({ services: { db: 'down', clerk: 'down', wizebot: 'down' }, overall: 'down', checkedAt: new Date().toISOString() });
      } finally {
        if (active) setLoading(false);
      }
    };

    tick();
    const interval = setInterval(tick, pollMs);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pollMs]);

  if (loading && !health) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
        <Loader2 className="h-3 w-3 animate-spin" /> Vérification…
      </span>
    );
  }

  const meta = OVERALL_META[health?.overall ?? 'down'];
  const Icon = meta.icon;
  const services = health?.services;

  const title = services
    ? (Object.keys(services) as (keyof typeof services)[])
        .map((k) => `${SERVICE_LABEL[k]} : ${STATUS_WORD[services[k]]}`)
        .join(' · ')
    : undefined;

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
        meta.cls
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
      {services && (
        <span className="ml-1 flex items-center gap-1">
          {(Object.keys(services) as (keyof typeof services)[]).map((k) => (
            <span key={k} className={cn('h-1.5 w-1.5 rounded-full', DOT[services[k]])} />
          ))}
        </span>
      )}
    </span>
  );
}
