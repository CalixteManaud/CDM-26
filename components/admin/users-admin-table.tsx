'use client';

import { useMemo, useState } from 'react';
import { Shield, User, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AdminDataTable, type AdminColumn, type AdminRowAction } from '@/components/admin/admin-data-table';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  createdAt: string;
  coachedTeams?: Array<{ id: string; name: string; tournament: { name: string } }>;
}

const ROLE_META: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: 'Admin', cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
  PARTICIPANT: { label: 'Participant', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  GUEST: { label: 'Invité', cls: 'bg-white/5 text-white/60 border-white/15' },
};

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: json.error };
  } catch {
    return { ok: false, error: 'Erreur réseau' };
  }
}

export function UsersAdminTable({
  initialData,
  initialTotal,
  onMutate,
}: {
  initialData: UserRow[];
  initialTotal: number;
  /** Rafraîchit les stats globales du dashboard après une mutation. */
  onMutate?: () => void;
}) {
  const [refresh, setRefresh] = useState(0);
  const afterMutation = () => {
    setRefresh((r) => r + 1);
    onMutate?.();
  };

  const changeRole = async (u: UserRow, newRole: 'GUEST' | 'PARTICIPANT') => {
    const r = await post('/api/admin/change-user-role', { targetUserId: u.id, newRole });
    if (!r.ok) { toast.error(r.error ?? 'Erreur lors du changement de rôle'); return; }
    toast.success(`${u.name} est maintenant ${newRole === 'PARTICIPANT' ? 'Participant' : 'Invité'}`);
    afterMutation();
  };

  const promote = async (u: UserRow) => {
    const r = await post('/api/admin/promote-to-admin', { targetUserId: u.id });
    if (!r.ok) { toast.error(r.error ?? 'Erreur lors de la promotion'); return; }
    toast.success(`${u.name} est maintenant administrateur`);
    afterMutation();
  };

  const demote = async (u: UserRow) => {
    const r = await post('/api/admin/demote-from-admin', { targetUserId: u.id });
    if (!r.ok) { toast.error(r.error ?? 'Erreur lors de la rétrogradation'); return; }
    toast.success(`${u.name} n'est plus administrateur`);
    afterMutation();
  };

  const columns = useMemo<AdminColumn<UserRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Membre',
        sortable: true,
        cell: (u) => (
          <div className="flex flex-col">
            <span className="font-medium text-white">{u.name}</span>
            {u.username && <span className="text-xs text-white/40">@{u.username}</span>}
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Rôle',
        sortable: true,
        cell: (u) => {
          const m = ROLE_META[u.role] ?? { label: u.role, cls: 'bg-white/5 text-white/60 border-white/15' };
          return <Badge className={cn('font-mono text-[10px]', m.cls)}>{m.label}</Badge>;
        },
      },
      {
        key: 'coachedTeams',
        header: 'Équipes coachées',
        hideOnMobile: true,
        cell: (u) => {
          const teams = u.coachedTeams ?? [];
          if (teams.length === 0) return <span className="text-sm text-white/40">Aucune</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {teams.map((t) => (
                <Badge key={t.id} className="border-white/15 bg-white/5 text-[10px] text-white/70">
                  {t.name}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        header: 'Inscription',
        sortable: true,
        hideOnMobile: true,
        align: 'right',
        cell: (u) => (
          <span className="font-mono text-xs tabular-nums text-white/50">
            {new Date(u.createdAt).toLocaleDateString('fr-FR')}
          </span>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<AdminRowAction<UserRow>[]>(
    () => [
      { label: "Copier l'ID", onSelect: (u) => { navigator.clipboard.writeText(u.id); toast.success('ID copié'); } },
      { label: "Copier l'email", onSelect: (u) => { navigator.clipboard.writeText(u.email); toast.success('Email copié'); } },
      {
        label: 'Passer en Participant',
        icon: User,
        hidden: (u) => u.role !== 'GUEST',
        separatorBefore: true,
        onSelect: (u) => changeRole(u, 'PARTICIPANT'),
      },
      {
        label: 'Passer en Invité',
        icon: Eye,
        hidden: (u) => u.role !== 'PARTICIPANT',
        separatorBefore: true,
        onSelect: (u) => changeRole(u, 'GUEST'),
      },
      {
        label: 'Promouvoir Admin',
        icon: Shield,
        hidden: (u) => u.role === 'ADMIN',
        onSelect: (u) => promote(u),
      },
      {
        label: 'Rétrograder Admin',
        icon: Shield,
        destructive: true,
        hidden: (u) => u.role !== 'ADMIN',
        onSelect: (u) => demote(u),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <AdminDataTable<UserRow>
      endpoint="/api/admin/users-list"
      columns={columns}
      rowActions={rowActions}
      initialData={initialData}
      initialTotal={initialTotal}
      getRowId={(u) => u.id}
      sortableKeys={['name', 'role', 'createdAt']}
      initialSort={{ key: 'createdAt', desc: true }}
      searchPlaceholder="Rechercher par nom, pseudo ou email…"
      emptyLabel="Aucun utilisateur trouvé."
      refreshSignal={refresh}
    />
  );
}
