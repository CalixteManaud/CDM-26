import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { Trophy, Check, X, Loader2, ImageIcon, ShieldX, AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { ImageUpload } from '@/components/ui/image-upload';
import { TeamInviteStatus } from '@/prisma/prisma-client/enums';

type PageProps =
  | { state: 'error'; message: string }
  | { state: 'ok'; token: string; tournamentName: string };

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const token = typeof ctx.params?.token === 'string' ? ctx.params.token : '';
  const { getAuth } = await import('@clerk/nextjs/server');
  const { syncClerkUserFromReq } = await import('@/lib/clerk');

  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };
  const dbUser = await syncClerkUserFromReq(ctx.req);
  if (!dbUser) return { redirect: { destination: '/', permanent: false } };

  const { loadInviteForUser } = await import('@/lib/utils/team-invites');
  const loaded = await loadInviteForUser(token, dbUser.id);
  if (!loaded.ok) return { props: { state: 'error', message: loaded.error } };

  // Trace l'ouverture (PENDING → CLICKED) sans écraser un statut plus avancé.
  const prisma = (await import('@/lib/prisma')).default;
  await prisma.teamCreationInvite.updateMany({
    where: { id: loaded.invite.id, status: TeamInviteStatus.PENDING },
    data: { status: TeamInviteStatus.CLICKED, clickedAt: new Date() },
  });

  return { props: { state: 'ok', token, tournamentName: loaded.invite.tournament.name } };
};

export default function InvitePage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (props.state === 'error') return <InviteError message={props.message} />;
  return <InviteForm token={props.token} tournamentName={props.tournamentName} />;
}

function InviteError({ message }: { message: string }) {
  return (
    <>
      <Head>
        <title>Invitation — CDM 26</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="grid min-h-screen place-items-center bg-black px-4 text-white">
        <div className="max-w-md rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-8 text-center">
          <ShieldX className="mx-auto mb-4 h-10 w-10 text-red-400" />
          <h1 className="text-xl font-black">Invitation indisponible</h1>
          <p className="mt-2 text-sm text-white/60">{message}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg border border-white/15 px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] text-white/80 hover:bg-white/5"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </>
  );
}

type Availability = 'idle' | 'checking' | 'free' | 'taken';

function InviteForm({ token, tournamentName }: { token: string; tournamentName: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [logo, setLogo] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const lastQuery = useRef('');

  // Vérif du nom en direct (debounce 400 ms).
  useEffect(() => {
    const q = name.trim();
    if (q.length < 2) {
      setAvailability('idle');
      return;
    }
    setAvailability('checking');
    const t = setTimeout(async () => {
      lastQuery.current = q;
      try {
        const res = await fetch(`/api/invites/${token}/name-available?name=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (lastQuery.current !== q) return; // réponse obsolète
        setAvailability(json.available === false ? 'taken' : json.available === true ? 'free' : 'idle');
      } catch {
        setAvailability('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [name, token]);

  const canSubmit =
    name.trim().length >= 2 &&
    shortName.trim().length >= 2 &&
    shortName.trim().length <= 3 &&
    !!logo &&
    availability !== 'taken' &&
    availability !== 'checking';

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), shortName: shortName.trim(), logo }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la création');
        if (json.code === 'NAME_TAKEN') setAvailability('taken');
        return;
      }
      toast.success('Ton équipe est créée ! 🎉');
      router.push(`/teams/${json.teamId}`);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const refuse = async () => {
    setRefusing(true);
    try {
      const res = await fetch(`/api/invites/${token}/refuse`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? 'Erreur');
        return;
      }
      toast('Invitation refusée.');
      router.push('/');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setRefusing(false);
    }
  };

  return (
    <>
      <Head>
        <title>Crée ton équipe — CDM 26</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-black px-4 py-12 text-white">
        <div className="mx-auto max-w-lg">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-yellow-300">
              <Trophy className="h-3 w-3" /> Invitation coach
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight md:text-5xl">
              <span className="text-gradient-worldcup">Crée ton équipe.</span>
            </h1>
            <p className="mt-3 text-sm text-white/60">
              Tu es invité à monter ton équipe pour <strong className="text-white">{tournamentName}</strong> et
              en devenir le coach.
            </p>
          </div>

          <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            {/* Nom + dispo en direct */}
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">Nom de l&apos;équipe</Label>
              <div className="relative">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Les Lions de l'Atlas"
                  className="border-white/15 bg-white/[0.03] pr-9"
                  maxLength={40}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {availability === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
                  {availability === 'free' && <Check className="h-4 w-4 text-emerald-400" />}
                  {availability === 'taken' && <X className="h-4 w-4 text-red-400" />}
                </span>
              </div>
              {availability === 'taken' && (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-300/80">
                  Ce nom est déjà pris sur ce tournoi
                </p>
              )}
              {availability === 'free' && (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">Nom disponible</p>
              )}
            </div>

            {/* Nom court */}
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">Nom court (2-3 lettres)</Label>
              <Input
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase())}
                placeholder="ATL"
                maxLength={3}
                className="border-white/15 bg-white/[0.03] font-mono uppercase tracking-[0.3em]"
              />
            </div>

            {/* Logo obligatoire */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
                <ImageIcon className="h-3 w-3 text-emerald-400" />
                Logo <span className="text-red-300/80">(obligatoire)</span>
              </Label>
              <ImageUpload value={logo} onChange={setLogo} label="Logo de l'équipe" />
              <p className="text-[11px] text-white/40">Tu pourras le modifier plus tard depuis ta page d&apos;équipe.</p>
            </div>

            <ShimmerButton
              onClick={submit}
              disabled={!canSubmit || submitting}
              background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
              shimmerColor="#ffffff"
              className={cn('w-full px-5 py-4 text-sm font-black uppercase tracking-[0.16em]', (!canSubmit || submitting) && 'opacity-50')}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer mon équipe'}
            </ShimmerButton>

            <button
              type="button"
              onClick={refuse}
              disabled={refusing}
              className="flex w-full items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-white/40 hover:text-white/70 disabled:opacity-50"
            >
              {refusing ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
              Refuser l&apos;invitation
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
