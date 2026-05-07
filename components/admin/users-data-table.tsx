'use client';
'use no memo';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Shield,
  User,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CoachedTeam {
  id: string;
  name: string;
  tournament: { name: string };
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  createdAt: string;
  coachedTeams?: CoachedTeam[];
}

interface UsersDataTableProps {
  data: UserData[];
  onUpdate: () => void;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'destructive';
    case 'PARTICIPANT':
      return 'default';
    case 'GUEST':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'PARTICIPANT':
      return 'Participant';
    case 'GUEST':
      return 'Invité';
    default:
      return role;
  }
};

export function UsersDataTable({ data, onUpdate }: UsersDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const handlePromoteToAdmin = async (userId: string, userName: string) => {
    try {
      const res = await fetch('/api/admin/promote-to-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error();

      toast.success(`${userName} est maintenant administrateur`);
      onUpdate();
    } catch {
      toast.error('Erreur lors de la promotion');
    }
  };

  const handleDemoteFromAdmin = async (userId: string, userName: string) => {
    try {
      const res = await fetch('/api/admin/demote-from-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error();

      toast.success(`${userName} n'est plus administrateur`);
      onUpdate();
    } catch {
      toast.error('Erreur lors de la rétrogradation');
    }
  };

  const handleChangeRole = async (userId: string, userName: string, newRole: 'GUEST' | 'PARTICIPANT') => {
    try {
      const res = await fetch('/api/admin/change-user-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, newRole }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || 'Erreur lors du changement de rôle');
        return;
      }

      const roleLabel = newRole === 'PARTICIPANT' ? 'Participant' : 'Invité';
      toast.success(`${userName} est maintenant ${roleLabel}`);
      onUpdate();
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const columns: ColumnDef<UserData>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Nom
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const username = row.original.username;
        const name = row.getValue('name') as string;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            {username && (
              <span className="text-xs text-muted-foreground">@{username}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Rôle
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const role = row.getValue('role') as string;
        return (
          <Badge variant={getRoleBadgeVariant(role)} className="text-sm">
            {getRoleLabel(role)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'coachedTeams',
      header: 'Équipes Coachées',
      cell: ({ row }) => {
        const teams = row.getValue('coachedTeams') as CoachedTeam[] | undefined;
        if (!teams || teams.length === 0) {
          return <span className="text-muted-foreground text-sm">Aucune</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {teams.map((team) => (
              <Badge key={team.id} variant="outline" className="text-xs">
                {team.name}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Inscription
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'));
        return (
          <span className="text-sm text-muted-foreground">
            {format(date, 'PPP', { locale: fr })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        const isAdmin = user.role === 'ADMIN';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Ouvrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(user.id)}
              >
                Copier l&apos;ID
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(user.email)}
              >
                Copier l&apos;email
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Changement de rôle Invité <-> Participant */}
              {!isAdmin && (
                <>
                  {user.role === 'GUEST' ? (
                    <DropdownMenuItem
                      onClick={() => handleChangeRole(user.id, user.name, 'PARTICIPANT')}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Passer en Participant
                    </DropdownMenuItem>
                  ) : user.role === 'PARTICIPANT' ? (
                    <DropdownMenuItem
                      onClick={() => handleChangeRole(user.id, user.name, 'GUEST')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Passer en Invité
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Promotion/Rétrogradation Admin */}
              {isAdmin ? (
                <DropdownMenuItem
                  onClick={() => handleDemoteFromAdmin(user.id, user.name)}
                  className="text-destructive"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Rétrograder Admin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handlePromoteToAdmin(user.id, user.name)}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Promouvoir Admin
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Rechercher par nom..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              <Eye className="mr-2 h-4 w-4" />
              Colonnes <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Aucun utilisateur trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Lignes par page</p>
          <select
            title='Rows per page'
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="h-8 w-17.5 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {[10, 20, 30, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-25 items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} sur{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              Premier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Suivant
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              Dernier
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center text-sm text-muted-foreground">
        <User className="mr-2 h-4 w-4" />
        Total: {data.length} utilisateur{data.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}
