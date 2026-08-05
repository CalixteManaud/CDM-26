import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Shirt, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminDataTable, type AdminColumn, type AdminRowAction } from '@/components/admin/admin-data-table';
import { CoachCombobox } from '@/components/admin/coach-combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TeamRow = {
  id: string;
  name: string;
  shortName: string;
  coachUserId: string | null;
  tournament: { id: string; name: string };
  coach: { id: string; name: string } | null;
};

type TournamentOpt = {
  id: string;
  name: string;
  groups: Array<{ id: string; name: string }>;
};

type PageProps = {
  initialTeams: TeamRow[];
  total: number;
  tournaments: TournamentOpt[];
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const { getAuth } = await import('@clerk/nextjs/server');
  const { isSiteAdmin } = await import('@/lib/utils/permissions');
  const { syncClerkUserFromReq } = await import('@/lib/clerk');

  const { userId } = getAuth(ctx.req);
  if (!userId) return { redirect: { destination: '/sign-in', permanent: false } };
  const dbUser = await syncClerkUserFromReq(ctx.req);
  if (!dbUser) return { redirect: { destination: '/', permanent: false } };
  if (!(await isSiteAdmin(dbUser.id))) return { redirect: { destination: '/', permanent: false } };

  const prisma = (await import('@/lib/prisma')).default;

  const [teams, total, tournaments] = await Promise.all([
    prisma.team.findMany({
      select: {
        id: true,
        name: true,
        shortName: true,
        coachUserId: true,
        tournament: { select: { id: true, name: true } },
        coach: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.team.count(),
    prisma.tournament.findMany({
      select: {
        id: true,
        name: true,
        groups: { select: { id: true, name: true }, orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    props: {
      initialTeams: JSON.parse(JSON.stringify(teams)),
      total,
      tournaments: JSON.parse(JSON.stringify(tournaments)),
    },
  };
};

const NO_GROUP = 'none';

type FormState = { name: string; shortName: string; logo: string; tournamentId: string; groupId: string };
const EMPTY_FORM: FormState = { name: '', shortName: '', logo: '', tournamentId: '', groupId: NO_GROUP };

export default function AdminTeamsPage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { initialTeams, total, tournaments } = props;
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((r) => r + 1);

  const [editing, setEditing] = useState<TeamRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<TeamRow | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (t: TeamRow) => {
    setEditing(t);
    setDialogOpen(true);
  };

  const columns = useMemo<AdminColumn<TeamRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Équipe',
        sortable: true,
        cell: (t) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] font-mono text-[10px] font-black text-white/60">
              {t.shortName.slice(0, 3)}
            </span>
            <div className="flex flex-col">
              <span className="font-medium text-white">{t.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{t.shortName}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'tournament',
        header: 'Tournoi',
        sortable: true,
        hideOnMobile: true,
        cell: (t) => (
          <Badge className="border-white/15 bg-white/5 font-mono text-[10px] text-white/70">{t.tournament.name}</Badge>
        ),
      },
      {
        key: 'coach',
        header: 'Coach',
        cell: (t) => (
          <div onClick={(e) => e.stopPropagation()}>
            <CoachCombobox teamId={t.id} currentCoachId={t.coachUserId} onAssigned={bump} />
          </div>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<AdminRowAction<TeamRow>[]>(
    () => [
      { label: 'Éditer', icon: Pencil, onSelect: (t) => openEdit(t) },
      {
        label: "Copier l'ID",
        onSelect: (t) => {
          navigator.clipboard.writeText(t.id);
          toast.success('ID copié');
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        destructive: true,
        separatorBefore: true,
        onSelect: (t) => setDeleting(t),
      },
    ],
    []
  );

  const onDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/teams/${deleting.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la suppression');
        return;
      }
      toast.success(`Équipe « ${deleting.name} » supprimée`);
      setDeleting(null);
      bump();
    } catch {
      toast.error('Erreur réseau');
    }
  };

  return (
    <>
      <Head>
        <title>Équipes — Admin CDM 26</title>
      </Head>

      <AdminShell
        active="equipes"
        accent="yellow"
        eyebrow="TMS · CRUD"
        title={
          <span className="flex items-center gap-3">
            <Shirt className="h-8 w-8 text-yellow-400 md:h-10 md:w-10" />
            <span className="text-gradient-worldcup">Équipes.</span>
          </span>
        }
        description="Créer, éditer, supprimer les équipes et assigner leur coach. Recherche, tri et pagination côté serveur."
      >
        <AdminDataTable<TeamRow>
          endpoint="/api/admin/teams-list"
          columns={columns}
          rowActions={rowActions}
          initialData={initialTeams}
          initialTotal={total}
          getRowId={(t) => t.id}
          sortableKeys={['name', 'tournament']}
          initialSort={{ key: 'createdAt', desc: true }}
          searchPlaceholder="Rechercher une équipe…"
          emptyLabel="Aucune équipe."
          refreshSignal={refresh}
          toolbarRight={
            <Button
              onClick={openCreate}
              className="bg-yellow-500 font-bold uppercase tracking-[0.14em] text-black hover:bg-yellow-400"
              size="sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nouvelle équipe
            </Button>
          }
        />
      </AdminShell>

      <TeamFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        tournaments={tournaments}
        onSaved={bump}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="border-white/15 bg-black text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-black">
              <Trash2 className="h-5 w-5 text-red-400" />
              Supprimer l&apos;équipe ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/55">
              {deleting && (
                <>
                  « <span className="font-bold text-white">{deleting.name}</span> » sera définitivement supprimée. Une
                  équipe avec des joueurs, matchs ou paris ne peut pas être supprimée tant que ces données existent.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-white/5 text-white/70 hover:bg-white/10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-red-500 font-bold text-white hover:bg-red-400">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TeamFormDialog({
  open,
  onOpenChange,
  editing,
  tournaments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TeamRow | null;
  tournaments: TournamentOpt[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  // (Re)hydrate le formulaire à l'ouverture / au changement de cible.
  const targetKey = editing?.id ?? 'new';
  if (open && hydratedFor !== targetKey) {
    setHydratedFor(targetKey);
    setForm(
      editing
        ? {
            name: editing.name,
            shortName: editing.shortName,
            logo: '',
            tournamentId: editing.tournament.id,
            groupId: NO_GROUP,
          }
        : EMPTY_FORM
    );
  }
  if (!open && hydratedFor !== null) setHydratedFor(null);

  const groups = tournaments.find((t) => t.id === form.tournamentId)?.groups ?? [];

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v, ...(k === 'tournamentId' ? { groupId: NO_GROUP } : {}) }));

  const submit = async () => {
    if (form.name.trim().length < 2) return toast.error('Nom trop court (min 2 caractères)');
    if (form.shortName.trim().length < 2 || form.shortName.trim().length > 3)
      return toast.error('Nom court : 2 à 3 caractères');
    if (!editing && !form.tournamentId) return toast.error('Choisis un tournoi');

    setSaving(true);
    try {
      const isEdit = !!editing;
      const groupId = form.groupId === NO_GROUP ? null : form.groupId;
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        shortName: form.shortName.trim().toUpperCase(),
      };
      if (form.logo.trim()) body.logo = form.logo.trim();
      if (isEdit) {
        body.tournamentId = form.tournamentId;
        body.groupId = groupId; // null autorisé en PATCH
      } else {
        body.tournamentId = form.tournamentId;
        if (groupId) body.groupId = groupId;
      }

      const res = await fetch(isEdit ? `/api/admin/teams/${editing!.id}` : '/api/admin/teams/create', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur');
        return;
      }
      toast.success(isEdit ? 'Équipe mise à jour' : 'Équipe créée');
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/15 bg-black text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">
            {editing ? "Éditer l'équipe" : 'Nouvelle équipe'}
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/45">
            {editing ? `/ ${editing.name}` : '/ créer une équipe'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Field label="Nom de l'équipe">
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="France"
              className="border-white/15 bg-white/[0.03]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom court (2-3)">
              <Input
                value={form.shortName}
                onChange={(e) => set('shortName', e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="FRA"
                className="border-white/15 bg-white/[0.03] font-mono uppercase"
              />
            </Field>
            <Field label="Logo (URL, option.)">
              <Input
                value={form.logo}
                onChange={(e) => set('logo', e.target.value)}
                placeholder="https://…"
                className="border-white/15 bg-white/[0.03]"
              />
            </Field>
          </div>

          <Field label="Tournoi">
            <Select value={form.tournamentId} onValueChange={(v) => set('tournamentId', v)}>
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
          </Field>

          {/* Le groupe ne se choisit qu'en édition — à la création, l'équipe est
              rattachée au tournoi puis répartie dans un groupe plus tard. */}
          {editing && (
            <Field label="Groupe (optionnel)">
              <Select
                value={form.groupId}
                onValueChange={(v) => set('groupId', v)}
                disabled={!form.tournamentId || groups.length === 0}
              >
                <SelectTrigger className={cn('border-white/15 bg-white/[0.03]', (!form.tournamentId || groups.length === 0) && 'opacity-50')}>
                  <SelectValue placeholder="Aucun groupe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>Aucun groupe</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white">
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="bg-yellow-500 font-bold uppercase tracking-[0.14em] text-black hover:bg-yellow-400"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">{label}</Label>
      {children}
    </div>
  );
}
