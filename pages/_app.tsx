import { ClerkProvider } from '@clerk/nextjs';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { MainLayout } from '@/components/layout/main-layout';
import { ThemeProvider } from '@/contexts/theme-context';
import { Toaster } from 'sonner';
import { Analytics } from "@vercel/analytics/next";
import { BetSlipProvider } from '@/lib/contexts/bet-slip-context';
import { BetSlipPanel } from '@/components/betting/bet-slip-panel';
import { GlobalLiveNotifier } from '@/components/match/global-live-notifier';
import { ErrorBoundary } from '@/components/error-boundary';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  // og:image DOIT être une URL ABSOLUE (Discord/Twitter ne résolvent pas les
  // chemins relatifs). Les `key` permettent à next/head de dédoublonner : une
  // page qui rend <PageHead> écrase ces valeurs par défaut (au lieu d'ajouter
  // une 2e balise en conflit).
  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://cdm.rgtcity.fr').replace(/\/$/, '');
  const ogImage = `${APP_URL}/og.png`;
  return (
    <ThemeProvider>
      {/* Métadonnées de partage par défaut (Open Graph / Twitter). */}
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta property="og:site_name" content="CDM 26" key="og:site_name" />
        <meta property="og:type" content="website" key="og:type" />
        <meta
          property="og:description"
          content="Coupe du Monde FIFA 26 sur Twitch — tournois, équipes, matchs en direct et paris en points de chaîne."
          key="og:description"
        />
        <meta property="og:image" content={ogImage} key="og:image" />
        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:image" content={ogImage} key="twitter:image" />
      </Head>
      <ClerkProvider {...pageProps}>
        <BetSlipProvider>
          <MainLayout>
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
          </MainLayout>
          <BetSlipPanel />
          <GlobalLiveNotifier />
          <Toaster position="top-right" richColors closeButton />
          <Analytics />
        </BetSlipProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}

export default MyApp;
