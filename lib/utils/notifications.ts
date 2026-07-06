/**
 * Helpers de création de notifications in-app.
 *
 * Server-only (importe Prisma). Toujours en fire-and-forget côté appelant :
 * une notif ratée ne doit JAMAIS casser le flux métier (transfert, settlement).
 * On avale donc les erreurs ici et on log.
 */

import prisma from '@/lib/prisma';
import { NotificationType } from '@/prisma/prisma-client/enums';

export type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
};

/** Crée une notification. Ne throw jamais. */
export async function createNotification(n: NewNotification): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href ?? null,
      },
    });
  } catch (err) {
    console.error('[notifications] création échouée', n, err);
  }
}

/** Crée plusieurs notifications d'un coup. Ne throw jamais. */
export async function createNotifications(rows: NewNotification[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: rows.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href ?? null,
      })),
    });
  } catch (err) {
    console.error('[notifications] création groupée échouée', { count: rows.length }, err);
  }
}
