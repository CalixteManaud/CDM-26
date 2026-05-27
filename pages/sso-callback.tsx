import Head from 'next/head';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';

import { FloatingBalls } from '@/components/landing/floating-balls';

export default function SsoCallbackPage() {
  return (
    <>
      <Head>
        <title>Connexion en cours… — CDM 26</title>
      </Head>

      <section className="relative isolate overflow-hidden min-h-[calc(100vh-5rem)] bg-black text-white flex items-center justify-center">
        <div className="absolute inset-0 -z-20 bg-mesh-cdm opacity-70" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-[60%] -z-10 bg-aurora opacity-60" aria-hidden />
        <FloatingBalls />

        <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-300 mb-2">
              / Connexion sécurisée
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              On finalise ton accès<span className="text-gradient-worldcup">.</span>
            </h1>
            <p className="text-sm text-white/55 mt-2 max-w-md mx-auto">
              Quelques secondes — on récupère ton compte et on te redirige vers les tournois.
            </p>
          </div>
        </div>

        <AuthenticateWithRedirectCallback
          signInForceRedirectUrl="/tournaments"
          signUpForceRedirectUrl="/tournaments"
        />
      </section>
    </>
  );
}
