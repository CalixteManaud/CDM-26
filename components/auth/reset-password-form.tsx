'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSignIn } from '@clerk/nextjs/legacy';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Loader2,
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShimmerButton } from '@/components/ui/shimmer-button';

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
const MIN_PASSWORD_LENGTH = 8;

type Step = 'request' | 'reset';

export function ResetPasswordForm() {
  const { isLoaded, signIn, setActive } = useSignIn();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1 — Clerk envoie un code de réinitialisation par email.
  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded) {
      toast.info('Initialisation en cours, réessaie dans un instant.');
      return;
    }
    setError(null);

    if (!email.trim()) {
      setError('Email requis.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      toast.success('Code envoyé — vérifie ta boîte mail (et les spams).');
      setStep('reset');
      setSubmitting(false);
    } catch (err) {
      console.error('[reset-password] request error:', err);
      setError(getClerkError(err));
      setSubmitting(false);
    }
  };

  // Étape 2 — vérifie le code + applique le nouveau mot de passe, puis ouvre
  // la session. window.location pour forcer un reload qui prend bien les
  // cookies Clerk fraîchement set (même raison que dans SignInForm).
  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded) {
      toast.info('Initialisation en cours, réessaie dans un instant.');
      return;
    }
    setError(null);

    if (!code.trim() || !password) {
      setError('Code et nouveau mot de passe requis.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast.success('Mot de passe réinitialisé. Bon retour !');
        window.location.href = REDIRECT_COMPLETE;
      } else if (result.status === 'needs_second_factor') {
        setError(
          "Ton compte a la double authentification activée — elle n'est pas encore gérée ici. Contacte le support.",
        );
        setSubmitting(false);
      } else {
        console.warn('[reset-password] Unexpected status:', result.status, result);
        setError(
          `Étape supplémentaire requise (${result.status}). Contacte le support si le problème persiste.`,
        );
        setSubmitting(false);
      }
    } catch (err) {
      console.error('[reset-password] reset error:', err);
      setError(getClerkError(err));
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded || submitting) return;
    setError(null);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      toast.success('Nouveau code envoyé.');
    } catch (err) {
      setError(getClerkError(err));
    }
  };

  const inputsDisabled = submitting;

  return (
    <div className="space-y-5">
      {step === 'request' ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <p className="text-xs text-white/55 leading-relaxed">
            Saisis l&apos;email de ton compte. On t&apos;envoie un code pour définir un
            nouveau mot de passe.
          </p>

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

          {error && <ErrorBox message={error} />}

          <ShimmerButton
            type="submit"
            disabled={submitting}
            shimmerColor="#fbbf24"
            background="linear-gradient(110deg, #059669 0%, #ca8a04 50%, #dc2626 100%)"
            className="w-full h-11 font-black uppercase tracking-[0.18em] text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi…
              </>
            ) : (
              <>
                Envoyer le code
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </ShimmerButton>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <p className="text-xs text-white/55 leading-relaxed">
            Code envoyé à <span className="font-bold text-white/80">{email}</span>. Saisis-le
            avec ton nouveau mot de passe.
          </p>

          <Field
            id="code"
            type="text"
            label="Code reçu par email"
            icon={KeyRound}
            value={code}
            onChange={setCode}
            placeholder="123456"
            autoComplete="one-time-code"
            inputMode="numeric"
            required
            disabled={inputsDisabled}
          />

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/65 flex items-center gap-1.5"
            >
              <Lock className="w-3 h-3 text-emerald-400" />
              Nouveau mot de passe
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
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
            disabled={submitting}
            shimmerColor="#fbbf24"
            background="linear-gradient(110deg, #059669 0%, #ca8a04 50%, #dc2626 100%)"
            className="w-full h-11 font-black uppercase tracking-[0.18em] text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Réinitialisation…
              </>
            ) : (
              <>
                Réinitialiser
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </ShimmerButton>

          <button
            type="button"
            onClick={handleResend}
            disabled={submitting}
            className="w-full text-center text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 hover:text-emerald-300 transition-colors disabled:opacity-50"
          >
            Renvoyer le code
          </button>
        </form>
      )}

      {/* CAPTCHA mount node — Clerk Smart CAPTCHA */}
      <div id="clerk-captcha" />

      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 hover:text-emerald-300 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Retour à la connexion
      </Link>
    </div>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function Field({
  id,
  type,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
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
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
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
        inputMode={inputMode}
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
