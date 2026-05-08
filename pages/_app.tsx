import { ClerkProvider } from '@clerk/nextjs';
import type { AppProps } from 'next/app';
import { MainLayout } from '@/components/layout/main-layout';
import { ThemeProvider } from '@/contexts/theme-context';
import { Toaster } from 'sonner';
import { Analytics } from "@vercel/analytics/next";
import { BetSlipProvider } from '@/lib/contexts/bet-slip-context';
import { BetSlipPanel } from '@/components/betting/bet-slip-panel';
import { GlobalLiveNotifier } from '@/components/match/global-live-notifier';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ClerkProvider {...pageProps}>
        <BetSlipProvider>
          <MainLayout>
            <Component {...pageProps} />
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
