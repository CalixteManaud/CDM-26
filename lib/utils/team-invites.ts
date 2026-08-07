/**
 * Helpers pour les invitations « crée ton équipe ».
 *
 * Un admin envoie à un joueur un lien/QR unique (token single-use) pour créer
 * lui-même son équipe et en devenir coach. Notif in-app systématique + email
 * optionnel (Resend). Server-only (importe Prisma).
 */
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { TeamInviteStatus, NotificationType } from '@/prisma/prisma-client/enums';
import { createNotification } from '@/lib/utils/notifications';
import { sendEmail } from '@/lib/email';

export const INVITE_TTL_HOURS = 1;
/** Libellé humain de la durée de validité (utilisé dans l'email). */
export const INVITE_TTL_LABEL = INVITE_TTL_HOURS === 1 ? '1 heure' : `${INVITE_TTL_HOURS} heures`;

/** Jeton URL-safe (32 caractères) — 24 octets aléatoires en base64url. */
export function generateInviteToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
}

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function inviteUrl(token: string): string {
  return `${appBaseUrl()}/invite/${token}`;
}

/** Statuts « encore actionnables » par le joueur. */
export const OPEN_INVITE_STATUSES: TeamInviteStatus[] = [
  TeamInviteStatus.PENDING,
  TeamInviteStatus.CLICKED,
];

/**
 * Passe en EXPIRED les invitations PENDING/CLICKED dont la date est dépassée.
 * Appelé paresseusement (liste admin, ouverture du lien).
 */
export async function expireStaleInvites(): Promise<void> {
  try {
    await prisma.teamCreationInvite.updateMany({
      where: { status: { in: OPEN_INVITE_STATUSES }, expiresAt: { lt: new Date() } },
      data: { status: TeamInviteStatus.EXPIRED },
    });
  } catch (err) {
    console.error('[team-invites] expireStaleInvites', err);
  }
}

function inviteEmailHtml(params: { userName: string; tournamentName: string; url: string }): string {
  const { userName, tournamentName, url } = params;
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
    <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#fbbf24">CDM 26</div>
    <h1 style="font-size:24px;margin:12px 0 4px">Crée ton équipe 🏆</h1>
    <p style="color:#b5b5b5;line-height:1.6">
      Salut ${userName}, un admin t'invite à créer ton équipe pour
      <strong style="color:#fff">${tournamentName}</strong> et en devenir le coach.
      Choisis un nom (unique), un logo, et c'est parti.
    </p>
    <a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 22px;background:linear-gradient(110deg,#16a34a,#facc15,#dc2626);color:#000;font-weight:800;text-decoration:none;border-radius:10px">
      Créer mon équipe
    </a>
    <p style="color:#666;font-size:12px;margin-top:20px">
      Lien valable ${INVITE_TTL_LABEL}. Si le bouton ne marche pas : ${url}
    </p>
  </div>`;
}

/**
 * Prévient le joueur cible : notif in-app (toujours) + email (si Resend
 * configuré, sinon mocké). Fire-and-forget — n'interrompt jamais le flux admin.
 */
export async function notifyInviteTarget(params: {
  userId: string;
  userEmail: string | null;
  userName: string;
  token: string;
  tournamentName: string;
}): Promise<void> {
  const { userId, userEmail, userName, token, tournamentName } = params;

  await createNotification({
    userId,
    type: NotificationType.SYSTEM,
    title: 'Crée ton équipe 🏆',
    body: `Tu es invité à créer ton équipe pour ${tournamentName}. Clique pour choisir ton nom et ton logo.`,
    href: `/invite/${token}`,
  });

  if (userEmail) {
    await sendEmail({
      to: userEmail,
      subject: `Crée ton équipe — ${tournamentName}`,
      html: inviteEmailHtml({ userName, tournamentName, url: inviteUrl(token) }),
    }).catch((err) => console.error('[team-invites] email', err));
  }
}

export type LoadedInvite = {
  id: string;
  tournamentId: string;
  tournament: { id: string; name: string };
};

export type LoadInviteResult =
  | { ok: true; invite: LoadedInvite }
  | { ok: false; status: number; error: string };

/**
 * Charge une invitation par token pour l'utilisateur courant et vérifie qu'elle
 * est bien exploitable (destinataire correct, ni acceptée/refusée/révoquée, non
 * expirée). Marque EXPIRED au passage si le délai est dépassé.
 */
export async function loadInviteForUser(token: string, dbUserId: string): Promise<LoadInviteResult> {
  const invite = await prisma.teamCreationInvite.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      targetUserId: true,
      tournamentId: true,
      tournament: { select: { id: true, name: true } },
    },
  });
  if (!invite) return { ok: false, status: 404, error: 'Invitation introuvable' };
  if (invite.targetUserId !== dbUserId) {
    return { ok: false, status: 403, error: "Cette invitation ne t'est pas destinée." };
  }
  if (invite.status === TeamInviteStatus.ACCEPTED) {
    return { ok: false, status: 400, error: 'Invitation déjà utilisée — ton équipe existe déjà.' };
  }
  if (invite.status === TeamInviteStatus.REVOKED) {
    return { ok: false, status: 400, error: 'Invitation annulée par un administrateur.' };
  }
  if (invite.status === TeamInviteStatus.REFUSED) {
    return { ok: false, status: 400, error: 'Invitation déjà refusée.' };
  }
  if (invite.status === TeamInviteStatus.EXPIRED || invite.expiresAt < new Date()) {
    if (invite.status !== TeamInviteStatus.EXPIRED) {
      await prisma.teamCreationInvite.update({ where: { id: invite.id }, data: { status: TeamInviteStatus.EXPIRED } });
    }
    return { ok: false, status: 400, error: 'Invitation expirée.' };
  }
  return {
    ok: true,
    invite: { id: invite.id, tournamentId: invite.tournamentId, tournament: invite.tournament },
  };
}

/** Nom d'équipe déjà pris (insensible à la casse) dans un tournoi ? */
export async function isTeamNameTaken(tournamentId: string, name: string, excludeTeamId?: string): Promise<boolean> {
  const existing = await prisma.team.findFirst({
    where: {
      tournamentId,
      name: { equals: name.trim(), mode: 'insensitive' },
      ...(excludeTeamId ? { id: { not: excludeTeamId } } : {}),
    },
    select: { id: true },
  });
  return !!existing;
}

/** Nom court déjà pris (insensible à la casse) dans un tournoi ? */
export async function isTeamShortNameTaken(tournamentId: string, shortName: string): Promise<boolean> {
  const existing = await prisma.team.findFirst({
    where: { tournamentId, shortName: { equals: shortName.trim(), mode: 'insensitive' } },
    select: { id: true },
  });
  return !!existing;
}
