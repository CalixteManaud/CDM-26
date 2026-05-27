'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSignIn } from '@clerk/nextjs/legacy';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ArrowRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';

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

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async (strategy: 'oauth_twitch') => {
    if (!isLoaded) {
      toast.info('Initialisation en cours, réessaie dans un instant.');
      return;
    }
    setError(null);
    setOauthLoading(strategy);
    try {
      await signIn.authenticateWithRedirect({
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

    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn.create({
        strategy: 'password',
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // window.location pour forcer un reload qui prend bien les cookies
        // Clerk fraîchement set, sinon getServerSideProps tombe sur un user
        // anonyme et le middleware bounce sur /sign-in.
        window.location.href = REDIRECT_COMPLETE;
      } else {
        console.warn('[sign-in] Unexpected status:', result.status, result);
        setError(`Étape supplémentaire requise (${result.status}). Contacte le support si le problème persiste.`);
        setSubmitting(false);
      }
    } catch (err) {
      console.error('[sign-in] error:', err);
      setError(getClerkError(err));
      setSubmitting(false);
    }
  };

  // Boutons (OAuth + submit) : bloqués uniquement si une opération est en
  // cours — on garde le bouton cliquable même si Clerk n'a pas fini son init
  // (le handler montre un toast et no-op dans ce cas).
  const actionsDisabled = submitting || oauthLoading !== null;
  // Inputs : seulement bloqués pendant la soumission active.
  const inputsDisabled = submitting;

  return (
    <div className="space-y-5">
      {/* OAuth providers */}
      <OAuthButton
        onClick={() => handleOAuth('oauth_twitch')}
        disabled={actionsDisabled}
        loading={oauthLoading === 'oauth_twitch'}
        icon={<TwitchIcon className="w-4 h-4" />}
        iconBg="bg-[#9146ff]"
        label="Continuer avec Twitch"
        highlight
      />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/35">
          ou par email
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Email / password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="email"
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
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/65 flex items-center gap-1.5"
            >
              <Lock className="w-3 h-3 text-emerald-400" />
              Mot de passe
            </Label>
            <Link
              href="/sign-in/reset-password"
              className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              Oublié ?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
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
              Connexion…
            </>
          ) : (
            <>
              Se connecter
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </ShimmerButton>
      </form>

      {/* CAPTCHA mount node — Clerk Smart CAPTCHA */}
      <div id="clerk-captcha" />
    </div>
  );
}

/* ============================================================
 * Sub-components
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
