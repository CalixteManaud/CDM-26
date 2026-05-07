import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  User as UserIcon,
  Upload,
  Check,
  Shield,
  Mail,
  Award,
  Tv,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Loader2,
  ChevronRight,
  CircleDot,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';

import { ImageUpload } from '@/components/ui/image-upload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BorderBeam } from '@/components/ui/border-beam';
import { ShimmerButton } from '@/components/ui/shimmer-button';

type User = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatar: string | null;
  role: string;
  twitchUsername: string | null;
  twitchUserId: string | null;
};

type PageProps = { user: User };

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { syncClerkUserFromReq } = await import('@/lib/clerk');

  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };

  const dbUser = await syncClerkUserFromReq(ctx.req);
  if (!dbUser) return { redirect: { destination: '/', permanent: false } };

  return { props: { user: JSON.parse(JSON.stringify(dbUser)) } };
};

const roleLabels: Record<string, { label: string; tone: 'admin' | 'participant' | 'guest' }> = {
  ADMIN: { label: 'Administrateur', tone: 'admin' },
  PARTICIPANT: { label: 'Participant', tone: 'participant' },
  GUEST: { label: 'Invité', tone: 'guest' },
};

type Accent = 'emerald' | 'yellow' | 'red' | 'purple';
const ACCENT: Record<Accent, { text: string; bg: string; border: string }> = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-500/30' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-500/30' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-500/30' },
};

function SectionEyebrow({ num, label, accent }: { num: string; label: string; accent: Accent }) {
  const s = ACCENT[accent];
  return (
    <div className={`inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold ${s.text}`}>
      <span className={`block w-12 h-px ${s.bg}`} />
      <span className="font-mono">/ {num}</span>
      <span className="text-white/30">—</span>
      <span>{label}</span>
    </div>
  );
}

export default function ProfilePage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    username: props.user.username || '',
    avatar: props.user.avatar || '',
    twitchUsernameManual: props.user.twitchUsername || '',
  });

  const [showManualTwitch, setShowManualTwitch] = useState<boolean>(
    !props.user.twitchUserId && !!props.user.twitchUsername
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error('Le pseudo ne peut pas être vide');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      toast.error('Lettres, chiffres, tirets et underscores uniquement');
      return;
    }
    if (formData.username.length < 3 || formData.username.length > 20) {
      toast.error('Le pseudo doit faire entre 3 et 20 caractères');
      return;
    }

    const body: Record<string, unknown> = {
      username: formData.username,
      avatar: formData.avatar || null,
    };

    if (!props.user.twitchUserId && showManualTwitch) {
      const twitchTrimmed = formData.twitchUsernameManual.trim().replace(/^@/, '').toLowerCase();
      if (twitchTrimmed.length > 0 && !/^[a-zA-Z0-9_]{4,25}$/.test(twitchTrimmed)) {
        toast.error('Username Twitch invalide (4-25 caractères, lettres/chiffres/_)');
        return;
      }
      body.twitchUsername = twitchTrimmed || null;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json: { success?: boolean; error?: string } = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? 'Impossible de mettre à jour le profil');
          return;
        }
        toast.success('Profil mis à jour !');
        router.reload();
      } catch {
        toast.error('Erreur réseau / serveur');
      }
    });
  };

  const role = roleLabels[props.user.role] ?? { label: props.user.role, tone: 'guest' as const };

  return (
    <>
      <Head>
        <title>Mon profil — CDM 26</title>
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-16 md:py-20 relative">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l&apos;accueil
            </Link>

            <SectionEyebrow num="USR" label="Mon profil · paramètres" accent="emerald" />
            <h1 className="text-5xl md:text-7xl font-black mt-5 leading-[0.92] tracking-tight">
              Mon <span className="text-gradient-worldcup">profil.</span>
            </h1>
            <p className="text-white/60 mt-7 max-w-2xl text-base md:text-lg leading-relaxed">
              Gère ton identité, ton avatar et ta liaison Twitch pour parier dans le chat de la
              chaîne CDM 26.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Badge className="bg-white/5 border-white/15 text-white/70 uppercase tracking-[0.22em] text-[10px] font-mono">
                <Mail className="w-3 h-3 mr-1" />
                {props.user.email}
              </Badge>
              <RoleBadge tone={role.tone}>{role.label}</RoleBadge>
              <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono">
                <CircleDot className="w-3 h-3 mr-1" /> Saison 2026
              </Badge>
            </div>
          </div>
        </section>

        {/* FORM */}
        <section className="relative bg-black border-b border-white/10 py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* SECTION 01 — IDENTITÉ */}
              <Card className="relative overflow-hidden bg-white/2 border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 mb-1.5">
                      § Section 01
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Identité</h2>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono flex items-center gap-1.5">
                      <Upload className="w-3 h-3 text-emerald-400" />
                      Photo de profil
                    </Label>
                    <ImageUpload
                      value={formData.avatar}
                      onChange={(url) => setFormData((p) => ({ ...p, avatar: url }))}
                      onRemove={() => setFormData((p) => ({ ...p, avatar: '' }))}
                      label="Photo de profil"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono"
                    >
                      Pseudo
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                      placeholder="ton_pseudo"
                      pattern="[a-zA-Z0-9_-]+"
                      minLength={3}
                      maxLength={20}
                      className="h-12 text-base bg-black/40 border-white/10 focus:border-emerald-500/50 text-white"
                    />
                    <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.22em]">
                      3 à 20 caractères · lettres / chiffres / - / _
                    </p>
                  </div>
                </div>
              </Card>

              {/* SECTION 02 — TWITCH */}
              <Card className="relative overflow-hidden bg-white/2 border-white/10 p-7 md:p-8">
                <div className="flex items-start justify-between gap-3 mb-7 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <Tv className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-purple-400 mb-1.5">
                        § Section 02
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                        Compte <span className="text-gradient-twitch">Twitch</span>
                      </h2>
                    </div>
                  </div>
                  <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 uppercase tracking-[0.22em] text-[10px] font-mono shrink-0">
                    Wizebot · !parier
                  </Badge>
                </div>

                <TwitchLinkCard
                  user={props.user}
                  manualValue={formData.twitchUsernameManual}
                  onManualChange={(v) => setFormData((p) => ({ ...p, twitchUsernameManual: v }))}
                  showManualInput={showManualTwitch}
                  onShowManualInput={setShowManualTwitch}
                />
              </Card>

              {/* SECTION 03 — INFO COMPTE (read-only) */}
              <Card className="relative overflow-hidden bg-linear-to-br from-emerald-950/30 via-black to-yellow-950/20 border-white/10 p-7 md:p-8">
                <div className="flex items-start gap-4 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-yellow-400 mb-1.5">
                      § Section 03 — Lecture seule
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                      Informations du compte
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <InfoRow icon={UserIcon} label="Nom" value={props.user.name} accent="emerald" />
                  <InfoRow icon={Mail} label="Email" value={props.user.email} accent="yellow" />
                  <InfoRow icon={Award} label="Rôle" value={role.label} accent="red" />
                </div>
              </Card>

              {/* SUBMIT */}
              <div className="pt-2">
                <ShimmerButton
                  type="submit"
                  disabled={isPending}
                  shimmerColor="#ffffff"
                  background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                  className="w-full px-7 py-5 font-black uppercase tracking-[0.18em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Mise à jour…
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Enregistrer les modifications
                    </>
                  )}
                </ShimmerButton>
              </div>
            </motion.form>
          </div>
        </section>
      </div>
    </>
  );
}

function RoleBadge({
  tone,
  children,
}: {
  tone: 'admin' | 'participant' | 'guest';
  children: React.ReactNode;
}) {
  const styles = {
    admin: 'bg-red-500/10 border-red-500/30 text-red-300',
    participant: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    guest: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
  } as const;
  return (
    <Badge className={`uppercase tracking-[0.22em] text-[10px] font-mono gap-1.5 ${styles[tone]}`}>
      <Award className="w-3 h-3" />
      {children}
    </Badge>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof UserIcon;
  label: string;
  value: string;
  accent: Accent;
}) {
  const s = ACCENT[accent];
  return (
    <div className="rounded-lg bg-black/40 border border-white/10 p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3 h-3 ${s.text}`} />
        <span className="text-[10px] font-mono text-white/45 uppercase tracking-[0.25em]">{label}</span>
      </div>
      <p className="text-sm font-black text-white tracking-tight truncate">{value}</p>
    </div>
  );
}

/* ============================================================
 * Twitch Link Card — 3 modes (OAuth / Manual / Unlinked)
 * ============================================================ */

function TwitchLinkCard({
  user,
  manualValue,
  onManualChange,
  showManualInput,
  onShowManualInput,
}: {
  user: User;
  manualValue: string;
  onManualChange: (v: string) => void;
  showManualInput: boolean;
  onShowManualInput: (v: boolean) => void;
}) {
  const { user: clerkUser } = useUser();
  const [linking, setLinking] = useState(false);

  const isOAuthLinked = !!user.twitchUserId;
  const isManualOnly = !isOAuthLinked && !!user.twitchUsername;

  const handleConnectTwitch = async () => {
    if (!clerkUser) return;
    setLinking(true);
    try {
      const externalAccount = await clerkUser.createExternalAccount({
        strategy: 'oauth_twitch',
        redirectUrl: window.location.href,
      });
      const url = externalAccount.verification?.externalVerificationRedirectURL?.toString();
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Impossible de lancer la connexion OAuth Twitch.');
        setLinking(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur connexion Twitch';
      toast.error(msg);
      setLinking(false);
    }
  };

  // === Mode 1 : lié via OAuth ===
  if (isOAuthLinked) {
    return (
      <div className="relative overflow-hidden rounded-xl p-6 border border-purple-500/40 bg-linear-to-br from-purple-950/40 via-black to-black">
        <BorderBeam size={140} duration={8} colorFrom="#9146ff" colorTo="#a855f7" borderWidth={1} />
        <div className="relative flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-[#9146ff] flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 mb-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-[0.22em]">
                Lié via OAuth
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white tracking-tight truncate">
              @{user.twitchUsername}
            </div>
            <p className="text-xs text-white/65 mt-3 leading-relaxed">
              Ton compte Twitch est lié automatiquement via Clerk. Tu peux maintenant utiliser{' '}
              <code className="text-purple-300 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded text-[11px] font-mono">
                !parier
              </code>{' '}
              dans le chat de la chaîne CDM 26. Pour délier, va dans les paramètres Clerk via le
              bouton avatar en haut à droite.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // === Mode 2 : saisi manuellement, pas d'OAuth ===
  if (isManualOnly) {
    return (
      <div className="rounded-xl p-6 border border-amber-500/40 bg-linear-to-br from-amber-950/30 via-black to-black space-y-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <AlertTriangle className="w-5 h-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 mb-2">
              <Pencil className="w-3 h-3 text-amber-300" />
              <span className="text-[10px] font-mono text-amber-300 uppercase tracking-[0.22em]">
                Saisi manuellement
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white tracking-tight truncate">
              @{user.twitchUsername}
            </div>
            <p className="text-xs text-white/65 mt-3 leading-relaxed">
              Pour plus de sécurité, lie ton compte Twitch via OAuth. Ça garantit que c&apos;est
              bien <strong className="text-white">toi</strong> qui paries depuis le chat.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleConnectTwitch}
          disabled={linking}
          className="w-full bg-[#9146ff] hover:bg-[#7c3aed] text-white font-black uppercase tracking-[0.18em] text-xs h-12 shadow-lg shadow-purple-500/30"
        >
          <Tv className="w-4 h-4 mr-2" />
          {linking ? 'Redirection…' : 'Lier via OAuth Twitch (recommandé)'}
          <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70" />
        </Button>

        {showManualInput ? (
          <ManualTwitchInput
            value={manualValue}
            onChange={onManualChange}
            onClose={() => onShowManualInput(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => onShowManualInput(true)}
            className="text-[10px] font-mono text-white/55 hover:text-white uppercase tracking-[0.22em] underline underline-offset-4"
          >
            Modifier la saisie manuelle
          </button>
        )}
      </div>
    );
  }

  // === Mode 3 : non lié ===
  return (
    <div className="rounded-xl p-6 border border-white/15 bg-black/40 space-y-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-white/4 border border-white/15 flex items-center justify-center">
          <Tv className="w-5 h-5 text-white/55" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1.5">
            Twitch non lié
          </div>
          <h3 className="text-lg md:text-xl font-black text-white tracking-tight mb-2 leading-tight">
            Lie ton compte pour <span className="text-gradient-twitch">parier.</span>
          </h3>
          <p className="text-xs text-white/60 leading-relaxed">
            Pour utiliser{' '}
            <code className="text-purple-300 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded text-[11px] font-mono">
              !parier
            </code>{' '}
            dans le chat de la chaîne CDM 26 et miser tes points Wizebot, lie ton compte Twitch.
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleConnectTwitch}
        disabled={linking || !clerkUser}
        className="w-full bg-[#9146ff] hover:bg-[#7c3aed] text-white font-black uppercase tracking-[0.18em] text-sm h-12 shadow-lg shadow-purple-500/30"
      >
        <Tv className="w-5 h-5 mr-2" />
        {linking ? 'Redirection vers Twitch…' : 'Connecter mon compte Twitch'}
        <ExternalLink className="w-4 h-4 ml-2 opacity-70" />
      </Button>

      {showManualInput ? (
        <ManualTwitchInput
          value={manualValue}
          onChange={onManualChange}
          onClose={() => onShowManualInput(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => onShowManualInput(true)}
          className="block w-full text-center text-[10px] font-mono text-white/45 hover:text-white uppercase tracking-[0.22em] underline underline-offset-4"
        >
          ou saisir mon username Twitch manuellement
        </button>
      )}
    </div>
  );
}

function ManualTwitchInput({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-2 pt-2 border-t border-white/10">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-mono text-white/55 uppercase tracking-[0.25em]">
          Saisie manuelle
        </Label>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] font-mono text-white/45 hover:text-white uppercase tracking-[0.22em] underline underline-offset-4"
        >
          Annuler
        </button>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/55 font-medium select-none text-sm font-mono">
          @
        </span>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ton_username_twitch"
          pattern="[a-zA-Z0-9_]{4,25}"
          maxLength={25}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="pl-7 h-11 bg-black/40 border-white/10 focus:border-purple-500/50 text-white"
        />
      </div>
      <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.22em]">
        4-25 caractères · lettres / chiffres / _ · vide pour délier
      </p>
    </div>
  );
}
