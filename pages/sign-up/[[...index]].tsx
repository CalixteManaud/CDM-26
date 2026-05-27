import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getAuth } from '@clerk/nextjs/server';

import { AuthShell } from '@/components/auth/auth-shell';
import { SignUpForm } from '@/components/auth/sign-up-form';

const DEFAULT_LOGGED_IN_REDIRECT = '/tournaments';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { userId } = getAuth(ctx.req);
  if (userId) {
    return { redirect: { destination: DEFAULT_LOGGED_IN_REDIRECT, permanent: false } };
  }
  return { props: {} };
};

export default function SignUpPage() {
  return (
    <>
      <Head>
        <title>Inscription — CDM 26</title>
        <meta
          name="description"
          content="Crée ton compte CDM 26 pour intégrer une nation, parier sur les matchs FIFA 26 et viser le sacre mondial sur Twitch."
        />
      </Head>

      <AuthShell mode="sign-up">
        <SignUpForm />
      </AuthShell>
    </>
  );
}
