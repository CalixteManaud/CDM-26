import { ClerkProvider } from '@clerk/nextjs';
import type { AppProps } from 'next/app';
import { MainLayout } from '@/components/layout/main-layout';
import { ThemeProvider } from '@/contexts/theme-context';
import { Toaster } from 'sonner';
import { Analytics } from "@vercel/analytics/next";
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ClerkProvider {...pageProps}>
        <MainLayout>
          <Component {...pageProps} />
        </MainLayout>
        <Toaster position="top-right" richColors />
        <Analytics />
      </ClerkProvider>
    </ThemeProvider>
  );
}

export default MyApp;
