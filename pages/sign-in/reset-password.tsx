import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getAuth } from '@clerk/nextjs/server';

import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

const DEFAULT_LOGGED_IN_REDIRECT = '/tournaments';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { userId } = getAuth(ctx.req);
  if (userId) {
    return { redirect: { destination: DEFAULT_LOGGED_IN_REDIRECT, permanent: false } };
  }
  return { props: {} };
};

export default function ResetPasswordPage() {
  return (
    <>
      <Head>
        <title>Mot de passe oublié — CDM 26</title>
        <meta
          name="description"
          content="Réinitialise le mot de passe de ton compte CDM 26 pour retrouver tes paris et tes équipes."
        />
      </Head>

      <AuthShell mode="sign-in">
        <ResetPasswordForm />
      </AuthShell>
    </>
  );
}
