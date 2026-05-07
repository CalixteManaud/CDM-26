import type { GetServerSideProps } from 'next';
import { syncClerkUserFromReq } from '@/lib/clerk';

type PageProps = {
  dbUser: {
    id: string;
    email: string;
    name: string;
    username: string | null;
    role: string;
    clerkId: string;
  } | null;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const dbUser = await syncClerkUserFromReq(ctx.req);

  return {
    props: {
      dbUser: dbUser ? JSON.parse(JSON.stringify(dbUser)) : null,
    },
  };
};

export default function DebugUserPage({ dbUser }: PageProps) {
  if (!dbUser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-3xl font-bold mb-4">Non connecté</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Debug Utilisateur</h1>
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Informations Supabase (Source de vérité)</h2>
        <div className="space-y-2 font-mono text-sm">
          <div>
            <span className="text-gray-400">ID:</span>{' '}
            <span className="text-green-400">{dbUser.id}</span>
          </div>
          <div>
            <span className="text-gray-400">Email:</span>{' '}
            <span className="text-green-400">{dbUser.email}</span>
          </div>
          <div>
            <span className="text-gray-400">Nom:</span>{' '}
            <span className="text-green-400">{dbUser.name}</span>
          </div>
          <div>
            <span className="text-gray-400">Username:</span>{' '}
            <span className="text-green-400">{dbUser.username || '(non défini)'}</span>
          </div>
          <div>
            <span className="text-gray-400">Rôle (Supabase):</span>{' '}
            <span className="text-yellow-400 font-bold text-lg">{dbUser.role}</span>
          </div>
          <div>
            <span className="text-gray-400">Clerk ID:</span>{' '}
            <span className="text-green-400">{dbUser.clerkId}</span>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500 rounded">
          <p className="text-sm text-blue-200">
            <strong>Note:</strong> Le rôle est UNIQUEMENT stocké dans Supabase, pas dans Clerk.
            Clerk gère l&apos;authentification, Supabase gère les rôles et permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
