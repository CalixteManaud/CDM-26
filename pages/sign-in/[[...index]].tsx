import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getAuth } from '@clerk/nextjs/server';

import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/sign-in-form';

const DEFAULT_LOGGED_IN_REDIRECT = '/tournaments';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { userId } = getAuth(ctx.req);
  if (userId) {
    return { redirect: { destination: DEFAULT_LOGGED_IN_REDIRECT, permanent: false } };
  }
  return { props: {} };
};

export default function SignInPage() {
  return (
    <>
      <Head>
        <title>Connexion — CDM 26</title>
        <meta
          name="description"
          content="Connecte-toi à CDM 26 pour suivre tes paris, gérer tes équipes et regarder la Coupe du Monde FIFA 26 sur Twitch."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AuthShell mode="sign-in">
        <SignInForm />
      </AuthShell>
    </>
  );
}
