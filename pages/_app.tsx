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
  return (
    <ThemeProvider>
      {/* Métadonnées par défaut (Open Graph / Twitter). Les pages peuvent les
          surcharger via <PageHead> ou leur propre <Head> — next/head dédoublonne
          par name/property. Donne un aperçu de partage de base partout. */}
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta property="og:site_name" content="CDM 26" />
        <meta property="og:type" content="website" />
        <meta
          property="og:description"
          content="Coupe du Monde FIFA 26 sur Twitch — tournois, équipes, matchs en direct et paris en points de chaîne."
        />
        <meta property="og:image" content="/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="/og.png" />
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
