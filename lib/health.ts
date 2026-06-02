import prisma from '@/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';

export type ServiceStatus = 'ok' | 'down' | 'mock';

export type SystemHealth = {
  services: { db: ServiceStatus; clerk: ServiceStatus; wizebot: ServiceStatus };
  overall: 'ok' | 'degraded' | 'down';
  checkedAt: string;
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Health-check des services critiques utilisés par le dashboard admin :
 * - DB (Supabase/Prisma) : ping SELECT 1
 * - Clerk : ping léger (count users)
 * - Wizebot : présence de la clé API (pas d'appel sortant pour éviter tout effet
 *   de bord / coût) → 'ok' si configurée, 'mock' en dev sans clé, 'down' en prod sans clé.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const [db, clerk] = await Promise.all([
    (async (): Promise<ServiceStatus> => {
      try {
        await withTimeout(prisma.$queryRaw`SELECT 1`, 4000);
        return 'ok';
      } catch {
        return 'down';
      }
    })(),
    (async (): Promise<ServiceStatus> => {
      try {
        const client = typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
        await withTimeout(client.users.getCount(), 4000);
        return 'ok';
      } catch {
        return 'down';
      }
    })(),
  ]);

  let wizebot: ServiceStatus;
  if (process.env.WIZEBOT_API_KEY) {
    wizebot = 'ok';
  } else {
    wizebot = process.env.NODE_ENV === 'production' ? 'down' : 'mock';
  }

  let overall: SystemHealth['overall'] = 'ok';
  if (db === 'down' || clerk === 'down' || wizebot === 'down') {
    overall = 'down';
  } else if (wizebot === 'mock') {
    overall = 'degraded';
  }

  return {
    services: { db, clerk, wizebot },
    overall,
    checkedAt: new Date().toISOString(),
  };
}
