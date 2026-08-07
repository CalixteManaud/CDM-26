import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  MailPlus,
  Search,
  X,
  Send,
  Loader2,
  QrCode,
  Link2,
  RotateCcw,
  Ban,
  UserPlus,
  Mail,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminDataTable, type AdminColumn, type AdminRowAction } from '@/components/admin/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type TournamentOpt = { id: string; name: string };

type InviteRow = {
  id: string;
  token: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  clickedAt: string | null;
  respondedAt: string | null;
  targetUser: { id: string; name: string; username: string | null; email: string };
  tournament: { id: string; name: string };
  team: { id: string; name: string } | null;
};

type PageProps = {
  tournaments: TournamentOpt[];
  initialInvites: InviteRow[];
  total: number;
  isOwner: boolean;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { isSiteAdmin, isOwnerEmail } = await import('@/lib/utils/permissions');
  const { syncClerkUserFromReq } = await import('@/lib/clerk');
  const { expireStaleInvites } = await import('@/lib/utils/team-invites');

  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };
  const dbUser = await syncClerkUserFromReq(ctx.req);
  if (!dbUser) return { redirect: { destination: '/', permanent: false } };
  if (!(await isSiteAdmin(dbUser.id))) return { redirect: { destination: '/', permanent: false } };
  const isOwner = isOwnerEmail(dbUser.email);

  await expireStaleInvites();

  const prisma = (await import('@/lib/prisma')).default;
  const [tournaments, invites, total] = await Promise.all([
    prisma.tournament.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.teamCreationInvite.findMany({
      select: {
        id: true,
        token: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        clickedAt: true,
        respondedAt: true,
        targetUser: { select: { id: true, name: true, username: true, email: true } },
        tournament: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.teamCreationInvite.count(),
  ]);

  return {
    props: {
      tournaments: JSON.parse(JSON.stringify(tournaments)),
      initialInvites: JSON.parse(JSON.stringify(invites)),
      total,
      isOwner,
    },
  };
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  CLICKED: { label: 'Ouvert', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  ACCEPTED: { label: 'Accepté', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  REFUSED: { label: 'Refusé', cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
  EXPIRED: { label: 'Expiré', cls: 'bg-white/5 text-white/45 border-white/15' },
  REVOKED: { label: 'Révoqué', cls: 'bg-white/5 text-white/45 border-white/15' },
};

const OPEN = new Set(['PENDING', 'CLICKED']);

export default function AdminInvitationsPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { tournaments, initialInvites, total, isOwner } = props;
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((r) => r + 1);
  const [qrRow, setQrRow] = useState<InviteRow | null>(null);

  const inviteLink = (token: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/invite/${token}` : `/invite/${token}`;

  const resend = async (row: InviteRow) => {
    const res = await fetch(`/api/admin/team-invites/${row.id}/resend`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(json.error ?? 'Échec du renvoi'); return; }
    toast.success('Invitation renvoyée');
    bump();
  };

  const revoke = async (row: InviteRow) => {
    const res = await fetch(`/api/admin/team-invites/${row.id}/revoke`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(json.error ?? 'Échec de la révocation'); return; }
    toast.success('Invitation révoquée');
    bump();
  };

  const columns = useMemo<AdminColumn<InviteRow>[]>(
    () => [
      {
        key: 'targetUser',
        header: 'Joueur',
        cell: (r) => (
          <div className="flex flex-col">
            <span className="font-medium text-white">{r.targetUser.username || r.targetUser.name}</span>
            <span className="text-xs text-white/40">{r.targetUser.email}</span>
          </div>
        ),
      },
      {
        key: 'tournament',
        header: 'Tournoi',
        hideOnMobile: true,
        cell: (r) => (
          <Badge className="border-white/15 bg-white/5 font-mono text-[10px] text-white/70">{r.tournament.name}</Badge>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        sortable: true,
        cell: (r) => {
          const m = STATUS_META[r.status] ?? { label: r.status, cls: 'bg-white/5 text-white/60 border-white/15' };
          return (
            <div className="flex flex-col gap-0.5">
              <Badge className={cn('w-fit font-mono text-[10px]', m.cls)}>{m.label}</Badge>
              {r.team && <span className="text-[10px] text-white/40">→ {r.team.name}</span>}
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        header: 'Envoyée',
        sortable: true,
        hideOnMobile: true,
        align: 'right',
        cell: (r) => (
          <div className="flex flex-col items-end">
            <span className="font-mono text-xs tabular-nums text-white/55">
              {new Date(r.createdAt).toLocaleDateString('fr-FR')}
            </span>
            {OPEN.has(r.status) && (
              <span className="font-mono text-[10px] text-white/30">
                expire {new Date(r.expiresAt).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<AdminRowAction<InviteRow>[]>(
    () => [
      {
        label: 'Copier le lien',
        icon: Link2,
        hidden: (r) => !OPEN.has(r.status),
        onSelect: (r) => {
          navigator.clipboard.writeText(inviteLink(r.token));
          toast.success('Lien copié');
        },
      },
      {
        label: 'QR code',
        icon: QrCode,
        hidden: (r) => !OPEN.has(r.status),
        onSelect: (r) => setQrRow(r),
      },
      {
        label: 'Renvoyer',
        icon: RotateCcw,
        separatorBefore: true,
        hidden: (r) => r.status === 'ACCEPTED',
        onSelect: (r) => resend(r),
      },
      {
        label: 'Révoquer',
        icon: Ban,
        destructive: true,
        hidden: (r) => !OPEN.has(r.status),
        onSelect: (r) => revoke(r),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <>
      <Head>
        <title>Invitations équipe — Admin CDM 26</title>
      </Head>

      <AdminShell
        active="invitations"
        accent="emerald"
        eyebrow="ADH · Crée ton équipe"
        title={
          <span className="flex items-center gap-3">
            <MailPlus className="h-8 w-8 text-emerald-400 md:h-10 md:w-10" />
            <span className="text-gradient-worldcup">Invitations.</span>
          </span>
        }
        description="Invite un ou plusieurs joueurs à créer eux-mêmes leur équipe (ils en deviennent coach). Notif in-app + email. Suis l'état de chaque envoi."
        actions={isOwner ? <EmailTestButton /> : undefined}
      >
        <NewInvitePanel tournaments={tournaments} onSent={bump} />

        <div className="mt-10">
          <h2 className="mb-4 text-lg font-black tracking-tight text-white">Suivi des envois</h2>
          <AdminDataTable<InviteRow>
            endpoint="/api/admin/team-invites/list"
            columns={columns}
            rowActions={rowActions}
            initialData={initialInvites}
            initialTotal={total}
            getRowId={(r) => r.id}
            sortableKeys={['status', 'createdAt']}
            initialSort={{ key: 'createdAt', desc: true }}
            searchPlaceholder="Rechercher un joueur ou un tournoi…"
            emptyLabel="Aucune invitation envoyée."
            refreshSignal={refresh}
          />
        </div>
      </AdminShell>

      <QrDialog row={qrRow} onClose={() => setQrRow(null)} link={qrRow ? inviteLink(qrRow.token) : ''} />
    </>
  );
}

/* ===== Bouton « Email de test » (propriétaire uniquement) ===== */

function EmailTestButton() {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Échec de l'envoi");
        return;
      }
      if (json.mocked) toast(json.message ?? 'Email mocké (clé Resend absente).');
      else toast.success(`Email de test envoyé à ${json.to} ✅`);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={run}
      disabled={loading}
      className="border-white/15 bg-white/[0.03]"
    >
      {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
      Email de test
    </Button>
  );
}

/* ============================ Nouvelle invitation ============================ */

type PlayerLite = { id: string; name: string; username: string | null; email: string };

function NewInvitePanel({ tournaments, onSent }: { tournaments: TournamentOpt[]; onSent: () => void }) {
  const [tournamentId, setTournamentId] = useState('');
  const [selected, setSelected] = useState<PlayerLite[]>([]);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!tournamentId) return toast.error('Choisis un tournoi');
    if (selected.length === 0) return toast.error('Sélectionne au moins un joueur');
    setSending(true);
    try {
      const res = await fetch('/api/admin/team-invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, targetUserIds: selected.map((p) => p.id) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Échec de l'envoi");
        return;
      }
      const skipped = (json.skipped ?? []) as Array<{ userId: string; reason: string }>;
      toast.success(
        `${json.created} invitation${json.created > 1 ? 's' : ''} envoyée${json.created > 1 ? 's' : ''}` +
          (skipped.length ? ` · ${skipped.length} ignorée(s)` : '')
      );
      if (skipped.length) {
        const names = skipped
          .map((s) => selected.find((p) => p.id === s.userId)?.username ?? 'joueur')
          .join(', ');
        toast(`Ignorés : ${names} (déjà invités ou déjà coach).`);
      }
      setSelected([]);
      onSent();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-emerald-400" />
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-300">Nouvelle invitation</span>
      </div>

      <div className="grid gap-5 md:grid-cols-[240px_1fr]">
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">Tournoi</Label>
          <Select value={tournamentId} onValueChange={setTournamentId}>
            <SelectTrigger className="border-white/15 bg-white/[0.03]">
              <SelectValue placeholder="Choisir un tournoi" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">Joueurs à inviter</Label>
          <PlayerMultiSelect selected={selected} onChange={setSelected} />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          onClick={send}
          disabled={sending || !tournamentId || selected.length === 0}
          className="bg-emerald-500 font-bold uppercase tracking-[0.14em] text-black hover:bg-emerald-400"
        >
          {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
          Envoyer {selected.length > 0 && `(${selected.length})`}
        </Button>
      </div>
    </div>
  );
}

function PlayerMultiSelect({
  selected,
  onChange,
}: {
  selected: PlayerLite[];
  onChange: (v: PlayerLite[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ pageSize: '15', sortBy: 'name', sortDir: 'asc', search: q });
        const res = await fetch(`/api/admin/users-list?${params.toString()}`);
        const json = (await res.json()) as { rows: PlayerLite[] };
        setResults(json.rows ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const add = (p: PlayerLite) => {
    if (!selected.some((s) => s.id === p.id)) onChange([...selected, p]);
    setQuery('');
    setResults([]);
  };
  const remove = (id: string) => onChange(selected.filter((s) => s.id !== id));

  const available = results.filter((r) => !selected.some((s) => s.id === r.id));

  return (
    <div ref={boxRef} className="relative">
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200"
            >
              {p.username || p.name}
              <button type="button" onClick={() => remove(p.id)} className="text-emerald-300/60 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un joueur (nom, pseudo, email)…"
          className="border-white/15 bg-white/[0.03] pl-9"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" />}
      </div>

      {open && query.trim().length >= 1 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-black shadow-xl">
          {available.length === 0 ? (
            <div className="px-4 py-3 text-sm text-white/40">{loading ? 'Recherche…' : 'Aucun joueur'}</div>
          ) : (
            available.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04]"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{p.username || p.name}</span>
                  <span className="text-[11px] text-white/40">{p.email}</span>
                </div>
                <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ================================ QR dialog ================================ */

function QrDialog({ row, onClose, link }: { row: InviteRow | null; onClose: () => void; link: string }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let active = true;
    if (!row) {
      setDataUrl('');
      return;
    }
    (async () => {
      try {
        const QR = (await import('qrcode')).default;
        const url = await QR.toDataURL(link, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
        if (active) setDataUrl(url);
      } catch {
        if (active) setDataUrl('');
      }
    })();
    return () => {
      active = false;
    };
  }, [row, link]);

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-white/15 bg-black text-white sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">QR — crée ton équipe</DialogTitle>
          <DialogDescription className="text-white/55">
            {row && `Pour ${row.targetUser.username || row.targetUser.name} · ${row.tournament.name}`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR code d'invitation" className="h-56 w-56 rounded-xl bg-white p-2" />
          ) : (
            <div className="grid h-56 w-56 place-items-center rounded-xl border border-white/10">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success('Lien copié');
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] text-white/80 hover:bg-white/5"
          >
            <Link2 className="h-3.5 w-3.5" /> Copier le lien
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
