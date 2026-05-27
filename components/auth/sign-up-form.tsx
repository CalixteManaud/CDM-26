'use client';

import { useState, useRef, useEffect } from 'react';
import { useSignUp } from '@clerk/nextjs/legacy';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  RotateCw,
  User as UserIcon,
  Camera,
  X,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { TwitchIcon } from './social-icons';

type ClerkError = { errors?: Array<{ message?: string; longMessage?: string }> };
function getClerkError(err: unknown): string {
  const e = err as ClerkError;
  return (
    e?.errors?.[0]?.longMessage ||
    e?.errors?.[0]?.message ||
    (err instanceof Error ? err.message : 'Une erreur est survenue.')
  );
}

const REDIRECT_COMPLETE = '/tournaments';
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

type Step = 'form' | 'verify';

export function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp();

  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // Avatar : on garde le File en mémoire et on l'upload UNIQUEMENT après que
  // la session soit active (l'endpoint /api/upload/image requiert l'auth).
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Cleanup de l'object URL au unmount pour éviter la fuite mémoire.
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handlePickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Le fichier doit être une image.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('L\'image ne doit pas dépasser 5 Mo.');
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const clearAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleOAuth = async (strategy: 'oauth_twitch') => {
    if (!isLoaded) {
      toast.info('Initialisation en cours, réessaie dans un instant.');
      return;
    }
    setError(null);
    setOauthLoading(strategy);
    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: REDIRECT_COMPLETE,
      });
    } catch (err) {
      setError(getClerkError(err));
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded) {
      toast.info('Initialisation en cours, réessaie dans un instant.');
      return;
    }
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Choisis un pseudo.');
      return;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      setError('Le pseudo doit faire entre 3 et 20 caractères.');
      return;
    }
    if (!USERNAME_RE.test(trimmedUsername)) {
      setError('Le pseudo n\'accepte que lettres, chiffres, tirets et underscores.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
    } catch (err) {
      console.error('[sign-up] create error:', err);
      setError(getClerkError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded) {
      toast.info('Initialisation en cours, réessaie dans un instant.');
      return;
    }
    setError(null);

    if (code.trim().length < 6) {
      setError('Code à 6 chiffres requis.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });

        // Maintenant qu'on a une session active, on upload l'avatar (si présent)
        // puis on push pseudo + avatar vers la DB via /api/profile/update.
        // Les erreurs sont non-bloquantes : l'utilisateur peut toujours fixer
        // depuis /profile, on ne veut pas le laisser bloqué sur la page d'auth.
        let avatarUrl: string | null = null;
        if (avatarFile) {
          try {
            const fd = new FormData();
            fd.append('file', avatarFile);
            const upRes = await fetch('/api/upload/image', { method: 'POST', body: fd });
            const upJson: { url?: string; error?: string } = await upRes.json();
            if (upRes.ok && upJson.url) {
              avatarUrl = upJson.url;
            } else {
              console.warn('[sign-up] avatar upload failed:', upJson.error);
            }
          } catch (e) {
            console.error('[sign-up] avatar upload exception:', e);
          }
        }

        try {
          await fetch('/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: username.trim(),
              avatar: avatarUrl,
            }),
          });
        } catch (e) {
          console.error('[sign-up] profile update exception:', e);
        }

        // Reload complet pour que getServerSideProps voie bien la session.
        window.location.href = REDIRECT_COMPLETE;
      } else {
        console.warn('[sign-up] verify unexpected status:', result.status, result);
        setError(`Vérification incomplète (${result.status}). Réessaie.`);
        setSubmitting(false);
      }
    } catch (err) {
      console.error('[sign-up] verify error:', err);
      setError(getClerkError(err));
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded) {
      toast.info('Initialisation en cours, réessaie dans un instant.');
      return;
    }
    setError(null);
    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    } catch (err) {
      setError(getClerkError(err));
    } finally {
      setResending(false);
    }
  };

  // Boutons : bloqués uniquement par une opération en cours, pas par
  // l'initialisation de Clerk (un toast d'attente s'affiche si on clique trop tôt).
  const actionsDisabled = submitting || oauthLoading !== null;
  const inputsDisabled = submitting;

  /* ============================================================
   * STEP 2 — Verification code
   * ============================================================ */
  if (step === 'verify') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="flex items-start gap-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/25 px-4 py-3">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Mail className="w-3.5 h-3.5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300 font-bold mb-0.5">
              Code envoyé
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed break-all">
              Un code à 6 chiffres a été envoyé sur <strong className="text-white">{email}</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="code"
              className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/65 flex items-center gap-1.5"
            >
              <KeyRound className="w-3 h-3 text-emerald-400" />
              Code de vérification
            </Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              disabled={inputsDisabled}
              className="h-12 text-center text-2xl font-black tracking-[0.5em] bg-black/40 border-white/10 focus:border-emerald-500/60 text-white tabular-nums"
              required
              autoFocus
            />
          </div>

          {error && <ErrorBox message={error} />}

          <ShimmerButton
            type="submit"
            disabled={actionsDisabled}
            shimmerColor="#fbbf24"
            background="linear-gradient(110deg, #059669 0%, #ca8a04 50%, #dc2626 100%)"
            className="w-full h-11 font-black uppercase tracking-[0.18em] text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vérification…
              </>
            ) : (
              <>
                Confirmer mon compte
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </ShimmerButton>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setCode('');
                setError(null);
              }}
              disabled={submitting}
              className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 hover:text-white transition-colors disabled:opacity-50"
            >
              ← Changer d&apos;email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={actionsDisabled || resending}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300 hover:text-emerald-200 transition-colors disabled:opacity-50"
            >
              {resending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RotateCw className="w-3 h-3" />
              )}
              Renvoyer le code
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  /* ============================================================
   * STEP 1 — Email + password + OAuth
   * ============================================================ */
  return (
    <div className="space-y-5">
      <OAuthButton
        onClick={() => handleOAuth('oauth_twitch')}
        disabled={actionsDisabled}
        loading={oauthLoading === 'oauth_twitch'}
        icon={<TwitchIcon className="w-4 h-4" />}
        iconBg="bg-[#9146ff]"
        label="Continuer avec Twitch"
        highlight
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/35">
          ou par email
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar (optionnel) + pseudo (requis) — Clerk webhook ne peut pas les
            fournir pour un signup email/password, donc on les collecte ici. */}
        <div className="space-y-2">
          <Label className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/65 flex items-center gap-1.5">
            <Camera className="w-3 h-3 text-emerald-400" />
            Photo de profil
            <span className="text-white/35 normal-case tracking-normal font-sans text-[10px]">
              · optionnel
            </span>
          </Label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={inputsDisabled}
              aria-label="Choisir une photo de profil"
              className="relative shrink-0 w-16 h-16 rounded-full border border-dashed border-white/15 bg-black/40 overflow-hidden hover:border-emerald-500/50 hover:bg-black/60 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {avatarPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarPreview}
                    alt="Aperçu avatar"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white/40 group-hover:text-emerald-300 transition-colors" />
                </div>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/65 leading-snug">
                {avatarFile ? (
                  <span className="truncate block">{avatarFile.name}</span>
                ) : (
                  'Choisis ton avatar — PNG, JPG, WEBP'
                )}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">
                  5 Mo max
                </span>
                {avatarFile && (
                  <button
                    type="button"
                    onClick={clearAvatar}
                    disabled={inputsDisabled}
                    className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.22em] text-rose-300 hover:text-rose-200 transition-colors disabled:opacity-50"
                  >
                    <X className="w-2.5 h-2.5" />
                    Retirer
                  </button>
                )}
              </div>
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handlePickAvatar}
            disabled={inputsDisabled}
            className="hidden"
          />
        </div>

        <Field
          id="username-su"
          type="text"
          label="Pseudo de joueur"
          icon={UserIcon}
          value={username}
          onChange={setUsername}
          placeholder="ton_pseudo"
          autoComplete="username"
          required
          disabled={inputsDisabled}
        />

        <Field
          id="email-su"
          type="email"
          label="Email"
          icon={Mail}
          value={email}
          onChange={setEmail}
          placeholder="toi@exemple.com"
          autoComplete="email"
          required
          disabled={inputsDisabled}
        />

        <div className="space-y-2">
          <Label
            htmlFor="password-su"
            className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/65 flex items-center gap-1.5"
          >
            <Lock className="w-3 h-3 text-emerald-400" />
            Mot de passe
          </Label>
          <div className="relative">
            <Input
              id="password-su"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={inputsDisabled}
              className="h-11 bg-black/40 border-white/10 focus:border-emerald-500/60 text-white pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              aria-label={showPassword ? 'Masquer' : 'Afficher'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
            Minimum 8 caractères
          </p>
        </div>

        {error && <ErrorBox message={error} />}

        <ShimmerButton
          type="submit"
          disabled={actionsDisabled}
          shimmerColor="#fbbf24"
          background="linear-gradient(110deg, #059669 0%, #ca8a04 50%, #dc2626 100%)"
          className="w-full h-11 font-black uppercase tracking-[0.18em] text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Création…
            </>
          ) : (
            <>
              Créer mon compte
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </ShimmerButton>

        <p className="text-[10px] font-mono text-center text-white/40 leading-relaxed pt-1">
          En t&apos;inscrivant, tu acceptes les{' '}
          <a href="/terms" className="underline underline-offset-2 hover:text-white">
            conditions
          </a>{' '}
          et la{' '}
          <a href="/privacy" className="underline underline-offset-2 hover:text-white">
            politique de confidentialité
          </a>
          .
        </p>
      </form>

      {/* CAPTCHA mount node — Clerk Smart CAPTCHA */}
      <div id="clerk-captcha" />
    </div>
  );
}

/* ============================================================
 * Sub-components (mêmes que sign-in-form)
 * ============================================================ */

function OAuthButton({
  onClick,
  disabled,
  loading,
  icon,
  iconBg,
  label,
  highlight,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={
        highlight
          ? 'group relative overflow-hidden inline-flex items-center justify-center gap-2.5 w-full h-11 rounded-xl bg-[#9146ff] hover:bg-[#7c3aed] text-white font-bold text-sm shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          : 'group relative inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-white/20 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
      }
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : highlight ? (
        <>
          <div
            className={`w-6 h-6 rounded-md ${iconBg ?? ''} flex items-center justify-center text-white`}
          >
            {icon}
          </div>
          {label}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </motion.button>
  );
}

function Field({
  id,
  type,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  disabled,
}: {
  id: string;
  type: string;
  label: string;
  icon: typeof Mail;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/65 flex items-center gap-1.5"
      >
        <Icon className="w-3 h-3 text-emerald-400" />
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className="h-11 bg-black/40 border-white/10 focus:border-emerald-500/60 text-white"
      />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg bg-rose-500/[0.08] border border-rose-500/30 px-3.5 py-2.5 flex items-start gap-2.5"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-rose-300 mt-0.5 shrink-0" />
      <p className="text-[11px] text-rose-100 leading-relaxed">{message}</p>
    </motion.div>
  );
}
