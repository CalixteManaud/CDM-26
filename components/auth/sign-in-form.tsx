'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs/legacy';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';

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
  const { isLoaded, signIn } = useSignIn();

  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async () => {
    if (!isLoaded) {
      toast.info('Initialisation en cours, réessaie dans un instant.');
      return;
    }
    setError(null);
    setOauthLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_twitch',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: REDIRECT_COMPLETE,
      });
    } catch (err) {
      setError(getClerkError(err));
      setOauthLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <OAuthButton
        onClick={handleOAuth}
        disabled={oauthLoading}
        loading={oauthLoading}
        icon={<TwitchIcon className="w-4 h-4" />}
        iconBg="bg-[#9146ff]"
        label="Continuer avec Twitch"
      />

      <p className="text-[11px] text-center text-white/45 leading-relaxed">
        La connexion se fait uniquement via ton compte Twitch — c&apos;est aussi
        le compte utilisé pour tes points de chaîne.
      </p>

      {error && <ErrorBox message={error} />}

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
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className="group relative overflow-hidden inline-flex items-center justify-center gap-2.5 w-full h-11 rounded-xl bg-[#9146ff] hover:bg-[#7c3aed] text-white font-bold text-sm shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <div
            className={`w-6 h-6 rounded-md ${iconBg ?? ''} flex items-center justify-center text-white`}
          >
            {icon}
          </div>
          {label}
        </>
      )}
    </motion.button>
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
