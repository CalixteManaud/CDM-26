import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserCheck, ChevronRight } from 'lucide-react';

import { NumberTicker } from '@/components/ui/number-ticker';
import { JoinRequestsReview, type ReviewRequest } from '@/components/team/join-requests-review';

type PageProps = {
  team: { id: string; name: string; shortName: string };
  requests: ReviewRequest[];
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { syncClerkUserById } = await import('@/lib/clerk');
  const { canManageTeam } = await import('@/lib/utils/permissions');
  const { getTeamPendingRequests } = await import('@/lib/utils/join-requests');
  const prisma = (await import('@/lib/prisma')).default;

  const teamId = ctx.params?.id as string;
  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser) return { redirect: { destination: '/', permanent: false } };

  const canManage = await canManageTeam(dbUser.id, teamId);
  if (!canManage) return { redirect: { destination: `/teams/${teamId}`, permanent: false } };

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, shortName: true },
  });
  if (!team) return { notFound: true };

  const requests = await getTeamPendingRequests(teamId);

  return {
    props: {
      team,
      requests: JSON.parse(JSON.stringify(requests)),
    },
  };
};

export default function TeamJoinRequestsPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { team, requests } = props;

  return (
    <>
      <Head>
        <title>Demandes · {team.name} — CDM 26</title>
      </Head>

      <div className="relative bg-black text-white overflow-hidden isolate min-h-screen">
        {/* HERO */}
        <section className="relative bg-black border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-mesh-cdm opacity-25 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="container mx-auto px-4 py-14 md:py-18 relative">
            <Link
              href={`/teams/${team.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white uppercase tracking-[0.25em] mb-8 transition"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Retour à l&apos;équipe
            </Link>

            <div className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] font-bold text-emerald-400">
              <span className="block w-12 h-px bg-emerald-400" />
              <span className="font-mono">/ ADH</span>
              <span className="text-white/30">—</span>
              <span>Recrutement · {team.shortName}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black mt-5 leading-[0.92] tracking-tight">
              Demandes <span className="text-gradient-worldcup">d&apos;adhésion.</span>
            </h1>
            <p className="text-white/60 mt-6 max-w-2xl text-base leading-relaxed">
              Les participants qui veulent rejoindre <strong className="text-white">{team.name}</strong>. Accepte pour
              les ajouter à l&apos;effectif (numéro et poste ajustables) ou refuse.
            </p>

            <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/2 px-5 py-3">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-3xl font-black tabular-nums text-emerald-400">
                <NumberTicker value={requests.length} />
              </span>
              <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/55">en attente</span>
            </div>
          </div>
        </section>

        {/* LISTE */}
        <section className="relative bg-black py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <JoinRequestsReview requests={requests} />
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
