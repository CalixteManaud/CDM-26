import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';

import { DrawCeremony } from '@/components/tournament/draw/draw-ceremony';

export type DrawTeam = {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  currentGroupId: string | null;
};

export type DrawGroup = {
  id: string;
  name: string;
  position: number;
};

export type DrawPageProps = {
  tournament: {
    id: string;
    name: string;
    groupCount: number;
    teamsPerGroup: number;
    archivedAt: string | null;
    hasGroupMatches: boolean;
  };
  groups: DrawGroup[];
  teams: DrawTeam[];
};

export const getServerSideProps: GetServerSideProps<DrawPageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { syncClerkUserById } = await import('@/lib/clerk');
  const { default: prisma } = await import('@/lib/prisma');

  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };

  const dbUser = await syncClerkUserById(userId);
  if (!dbUser || dbUser.role !== 'ADMIN') {
    return { redirect: { destination: `/tournaments/${ctx.params!.id}`, permanent: false } };
  }

  const id = ctx.params!.id as string;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      groupCount: true,
      teamsPerGroup: true,
      archivedAt: true,
      groups: {
        select: { id: true, name: true, position: true },
        orderBy: { position: 'asc' },
      },
      teams: {
        where: { disqualified: false },
        select: { id: true, name: true, shortName: true, logo: true, groupId: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!tournament) return { notFound: true };

  const hasGroupMatches =
    (await prisma.match.count({ where: { tournamentId: id, stage: 'GROUP' } })) > 0;

  return {
    props: {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        groupCount: tournament.groupCount,
        teamsPerGroup: tournament.teamsPerGroup,
        archivedAt: tournament.archivedAt ? tournament.archivedAt.toISOString() : null,
        hasGroupMatches,
      },
      groups: tournament.groups,
      teams: tournament.teams.map((t) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        logo: t.logo,
        currentGroupId: t.groupId,
      })),
    },
  };
};

export default function DrawPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>{`Tirage au sort — ${props.tournament.name} — CDM 26`}</title>
        <meta
          name="description"
          content={`Cérémonie de tirage au sort officielle — ${props.tournament.name}`}
        />
      </Head>
      <DrawCeremony {...props} />
    </>
  );
}
