'use client';
'use no memo';

import * as React from 'react';
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  PaginationState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronDown,
  Eye,
  UserCog,
  Trophy,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export interface TeamData {
  id: string;
  name: string;
  shortName: string;
  coachUserId?: string | null;
  tournament: {
    id: string;
    name: string;
  };
  coach?: {
    id: string;
    name: string;
  } | null;
}

interface TeamsDataTableProps {
  initialData: TeamData[];
  initialTotal: number;
  initialCoached: number;
  onAssignCoach: (team: TeamData) => void;
}

const SORTABLE = new Set(['name', 'tournament']);

export function TeamsDataTable({ initialData, initialTotal, initialCoached, onAssignCoach }: TeamsDataTableProps) {
  const [data, setData] = React.useState<TeamData[]>(initialData);
  const [total, setTotal] = React.useState(initialTotal);
  const [loading, setLoading] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const skipFirstFetch = React.useRef(true);

  const fetchPage = React.useCallback(async () => {
    setLoading(true);
    try {
      const sort = sorting[0];
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
      });
      if (search) params.set('search', search);
      if (sort && SORTABLE.has(sort.id)) {
        params.set('sortBy', sort.id);
        params.set('sortDir', sort.desc ? 'desc' : 'asc');
      }
      const res = await fetch(`/api/admin/teams-list?${params.toString()}`);
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { rows: TeamData[]; total: number };
      setData(json.rows);
      setTotal(json.total);
    } catch {
      toast.error('Erreur lors du chargement des équipes');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, search, sorting]);

  React.useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    fetchPage();
  }, [fetchPage]);

  const columns: ColumnDef<TeamData>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Nom de l&apos;équipe
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        const shortName = row.original.shortName;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{name}</span>
            <Badge variant="outline" className="text-xs">
              {shortName}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'tournament',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Tournoi
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const tournament = row.getValue('tournament') as TeamData['tournament'];
        return (
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm">{tournament.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'coach',
      header: 'Coach',
      enableSorting: false,
      cell: ({ row }) => {
        const coach = row.getValue('coach') as TeamData['coach'];
        if (coach) {
          return (
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">{coach.name}</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-yellow-500">Aucun coach</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const team = row.original;
        return (
          <Button onClick={() => onAssignCoach(team)} variant="outline" size="sm" className="ml-auto">
            <UserCog className="mr-2 h-4 w-4" />
            {team.coach ? 'Changer' : 'Assigner'}
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
    rowCount: total,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting, columnVisibility, pagination },
  });

  const teamsWithoutCoach = total - initialCoached;

  return (
    <div className="w-full space-y-4">
      {/* Stats Cards (totaux globaux, indépendants de la page affichée) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Équipes</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <Trophy className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avec Coach</p>
              <p className="text-2xl font-bold text-green-500">{initialCoached}</p>
            </div>
            <UserCog className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sans Coach</p>
              <p className="text-2xl font-bold text-yellow-500">{teamsWithoutCoach}</p>
            </div>
            <UserCog className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Input
            placeholder="Rechercher une équipe..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
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
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
                  {loading ? 'Chargement…' : 'Aucune équipe trouvée.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Lignes par page</p>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={String(pageSize)}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-25 items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage() || loading}>
              Premier
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage() || loading}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage() || loading}>
              Suivant
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage() || loading}>
              Dernier
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
