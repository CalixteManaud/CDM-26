'use client';

import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { AdminDataTable, type AdminColumn } from '@/components/admin/admin-data-table';
import { CoachCombobox } from '@/components/admin/coach-combobox';

export interface TeamRow {
  id: string;
  name: string;
  shortName: string;
  coachUserId?: string | null;
  tournament: { id: string; name: string };
  coach?: { id: string; name: string } | null;
}

export function TeamsAdminTable({
  initialData,
  initialTotal,
  onCoachAssigned,
}: {
  initialData: TeamRow[];
  initialTotal: number;
  onCoachAssigned?: () => void;
}) {
  const [refresh, setRefresh] = useState(0);
  const afterAssign = () => {
    setRefresh((r) => r + 1);
    onCoachAssigned?.();
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
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400/70" />
            <Badge className="border-white/15 bg-white/5 font-mono text-[10px] text-white/70">{t.tournament.name}</Badge>
          </div>
        ),
      },
      {
        key: 'coach',
        header: 'Coach',
        cell: (t) => (
          <div onClick={(e) => e.stopPropagation()}>
            <CoachCombobox teamId={t.id} currentCoachId={t.coachUserId} onAssigned={afterAssign} />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <AdminDataTable<TeamRow>
      endpoint="/api/admin/teams-list"
      columns={columns}
      initialData={initialData}
      initialTotal={initialTotal}
      getRowId={(t) => t.id}
      sortableKeys={['name', 'tournament']}
      initialSort={{ key: 'name', desc: false }}
      searchPlaceholder="Rechercher une équipe…"
      emptyLabel="Aucune équipe trouvée."
      refreshSignal={refresh}
    />
  );
}
