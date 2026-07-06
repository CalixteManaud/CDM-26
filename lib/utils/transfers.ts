/**
 * Transfert de points de chaîne entre deux users CDM 26.
 *
 * Les points vivent chez Wizebot (wallet Twitch). Un transfert =
 *   1. débit Wizebot de l'expéditeur (FORCE=0 → échoue si solde insuffisant)
 *   2. crédit Wizebot du destinataire
 *   3. si le crédit échoue → on re-crédite l'expéditeur (rollback) ; si ce
 *      re-crédit échoue à son tour → PendingRefund (rejoué par le cron).
 *
 * Chaque transfert laisse une trace PointTransfer (audit + historique).
 *
 * Server-only (importe Prisma + Wizebot) — jamais importé côté client.
 */

import prisma from '@/lib/prisma';
import {
  debitWizebotPoints,
  creditWizebotPoints,
  normalizeTwitchUsername,
} from '@/lib/wizebot';
import { recordPendingRefund } from '@/lib/utils/betting';
import { isActiveTournamentInsider } from '@/lib/utils/permissions';
import { createNotification } from '@/lib/utils/notifications';
import { TransferStatus, NotificationType } from '@/prisma/prisma-client/enums';

/** Montant minimum d'un transfert. */
export const MIN_TRANSFER_POINTS = 1;
/** Montant maximum par transfert (garde-fou anti fat-finger / abus). */
export const MAX_TRANSFER_POINTS = 100_000;

export type TransferCode =
  | 'INVALID_AMOUNT'
  | 'RECIPIENT_REQUIRED'
  | 'RECIPIENT_NOT_FOUND'
  | 'RECIPIENT_NO_TWITCH'
  | 'SELF_TRANSFER'
  | 'INSIDER_BLOCKED'
  | 'INSUFFICIENT_FUNDS'
  | 'WIZEBOT_ERROR'
  | 'CREDIT_FAILED_REFUNDED'
  | 'CREDIT_FAILED_PENDING'
  | 'INTERNAL';

export type TransferResult =
  | {
      ok: true;
      transferId: string;
      amount: number;
      recipient: { username: string | null; twitchUsername: string };
    }
  | { ok: false; code: TransferCode; error: string };

/**
 * Résout le destinataire depuis une saisie libre : d'abord par pseudo CDM 26,
 * sinon par username Twitch. Insensible à la casse.
 */
async function findRecipient(query: string) {
  const q = query.trim();
  if (!q) return null;
  return prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: q, mode: 'insensitive' } },
        { twitchUsername: { equals: normalizeTwitchUsername(q), mode: 'insensitive' } },
      ],
    },
    select: { id: true, username: true, twitchUsername: true },
  });
}

export async function transferPoints(params: {
  senderId: string;
  senderTwitch: string;
  recipientQuery: string;
  amount: number;
  note?: string | null;
}): Promise<TransferResult> {
  const { senderId, senderTwitch, recipientQuery, amount } = params;
  const note = params.note?.trim() ? params.note.trim().slice(0, 200) : null;

  // 1. Validation du montant
  if (!Number.isInteger(amount) || amount < MIN_TRANSFER_POINTS) {
    return { ok: false, code: 'INVALID_AMOUNT', error: `Montant minimum : ${MIN_TRANSFER_POINTS} pt.` };
  }
  if (amount > MAX_TRANSFER_POINTS) {
    return {
      ok: false,
      code: 'INVALID_AMOUNT',
      error: `Montant maximum par transfert : ${MAX_TRANSFER_POINTS.toLocaleString('fr-FR')} pts.`,
    };
  }
  if (!recipientQuery.trim()) {
    return { ok: false, code: 'RECIPIENT_REQUIRED', error: 'Indique le pseudo du destinataire.' };
  }

  // 2. Résolution du destinataire
  const recipient = await findRecipient(recipientQuery);
  if (!recipient) {
    return { ok: false, code: 'RECIPIENT_NOT_FOUND', error: 'Aucun utilisateur trouvé avec ce pseudo.' };
  }
  if (recipient.id === senderId) {
    return { ok: false, code: 'SELF_TRANSFER', error: 'Tu ne peux pas te transférer des points à toi-même.' };
  }
  if (!recipient.twitchUsername) {
    return {
      ok: false,
      code: 'RECIPIENT_NO_TWITCH',
      error: "Ce destinataire n'a pas encore lié son compte Twitch — il ne peut pas recevoir de points.",
    };
  }

  // 2 bis. Intégrité : un joueur/coach d'un tournoi actif ne peut pas transférer
  // ses points (il pourrait financer un prête-nom qui parie à sa place).
  if (await isActiveTournamentInsider(senderId)) {
    return {
      ok: false,
      code: 'INSIDER_BLOCKED',
      error:
        "En tant que joueur ou coach d'un tournoi en cours, tu ne peux pas transférer de points tant que le tournoi n'est pas archivé.",
    };
  }

  // 3. Débit de l'expéditeur
  const debit = await debitWizebotPoints({
    twitchUsername: senderTwitch,
    amount,
    reason: `CDM 26 — don à ${recipient.username ?? recipient.twitchUsername}`,
  });
  if (!debit.ok) {
    return {
      ok: false,
      code: debit.code === 'INSUFFICIENT_FUNDS' ? 'INSUFFICIENT_FUNDS' : 'WIZEBOT_ERROR',
      error:
        debit.code === 'INSUFFICIENT_FUNDS'
          ? 'Solde Wizebot insuffisant pour ce transfert.'
          : `Débit Wizebot échoué : ${debit.error}`,
    };
  }

  // 4. Crédit du destinataire
  const credit = await creditWizebotPoints({
    twitchUsername: recipient.twitchUsername,
    amount,
    reason: `CDM 26 — reçu de ${senderTwitch}`,
  });

  if (!credit.ok) {
    // Rollback : on re-crédite l'expéditeur.
    const rollback = await creditWizebotPoints({
      twitchUsername: senderTwitch,
      amount,
      reason: `CDM 26 — rollback transfert (crédit destinataire échoué)`,
    });

    if (rollback.ok) {
      await prisma.pointTransfer.create({
        data: {
          senderId,
          recipientId: recipient.id,
          senderTwitch,
          recipientTwitch: recipient.twitchUsername,
          amount,
          note,
          status: TransferStatus.REFUNDED,
          debitTxId: debit.txId,
          error: `Crédit destinataire échoué : ${credit.error}`,
        },
      });
      return {
        ok: false,
        code: 'CREDIT_FAILED_REFUNDED',
        error: 'Le transfert a échoué côté destinataire — tes points t\'ont été rendus.',
      };
    }

    // Rollback échoué aussi → refund différé (rejoué par le cron).
    await recordPendingRefund({
      userId: senderId,
      twitchUsername: senderTwitch,
      amount,
      reason: `transfert à ${recipient.username ?? recipient.twitchUsername}`,
      wizebotDebitTxId: debit.txId,
    });
    await prisma.pointTransfer.create({
      data: {
        senderId,
        recipientId: recipient.id,
        senderTwitch,
        recipientTwitch: recipient.twitchUsername,
        amount,
        note,
        status: TransferStatus.FAILED,
        debitTxId: debit.txId,
        error: `Crédit destinataire ET rollback échoués : ${credit.error} | ${rollback.error}`,
      },
    });
    return {
      ok: false,
      code: 'CREDIT_FAILED_PENDING',
      error:
        'Le transfert a échoué côté destinataire — tes points te seront rendus automatiquement sous quelques minutes.',
    };
  }

  // 5. Succès
  const transfer = await prisma.pointTransfer.create({
    data: {
      senderId,
      recipientId: recipient.id,
      senderTwitch,
      recipientTwitch: recipient.twitchUsername,
      amount,
      note,
      status: TransferStatus.COMPLETED,
      debitTxId: debit.txId,
      creditTxId: credit.txId,
    },
    select: { id: true },
  });

  // Notif au destinataire (fire-and-forget — ne bloque pas la réponse).
  await createNotification({
    userId: recipient.id,
    type: NotificationType.TRANSFER_RECEIVED,
    title: `+${amount.toLocaleString('fr-FR')} pts reçus`,
    body: note
      ? `${senderTwitch} t'a envoyé ${amount.toLocaleString('fr-FR')} pts : « ${note} »`
      : `${senderTwitch} t'a envoyé ${amount.toLocaleString('fr-FR')} pts.`,
    href: '/profile',
  });

  return {
    ok: true,
    transferId: transfer.id,
    amount,
    recipient: { username: recipient.username, twitchUsername: recipient.twitchUsername },
  };
}
