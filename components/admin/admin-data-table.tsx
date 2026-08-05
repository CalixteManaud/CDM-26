'use client';

import * as React from 'react';
import { ArrowUpDown, MoreHorizontal, Loader2, Search, Inbox } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';

/** Une colonne, pilotée par config. `cell` reçoit la ligne typée. */
export type AdminColumn<Row> = {
  key: string;
  header: string;
  sortable?: boolean;
  /** Rendu de la cellule. Par défaut : `String(row[key])`. */
  cell?: (row: Row) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Masquée sous md (mobile) pour garder la table lisible. */
  hideOnMobile?: boolean;
  className?: string;
};

/** Une action de ligne (CRUD). Rendue dans le menu «…». */
export type AdminRowAction<Row> = {
  label: string | ((row: Row) => string);
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: (row: Row) => void | Promise<void>;
  destructive?: boolean;
  /** Cache l'action pour certaines lignes. */
  hidden?: (row: Row) => boolean;
  separatorBefore?: boolean;
};

type ListResponse<Row> = { rows: Row[]; total: number };

export type AdminDataTableProps<Row> = {
  /** Endpoint GET paginé : `?page&pageSize&search&sortBy&sortDir` → `{ rows, total }`. */
  endpoint: string;
  columns: AdminColumn<Row>[];
  rowActions?: AdminRowAction<Row>[];
  initialData: Row[];
  initialTotal: number;
  getRowId: (row: Row) => string;
  /** Clés triables (doit matcher ce que l'API accepte). */
  sortableKeys?: string[];
  initialSort?: { key: string; desc: boolean };
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Slot à droite de la barre d'outils (ex : bouton « Créer »). */
  toolbarRight?: React.ReactNode;
  /** Signal externe pour forcer un refetch (incrémente une valeur). */
  refreshSignal?: number;
  pageSizeOptions?: number[];
};

export function AdminDataTable<Row>({
  endpoint,
  columns,
  rowActions,
  initialData,
  initialTotal,
  getRowId,
  sortableKeys,
  initialSort,
  searchPlaceholder = 'Rechercher…',
  emptyLabel = 'Aucun résultat.',
  toolbarRight,
  refreshSignal = 0,
  pageSizeOptions = [10, 20, 30, 50],
}: AdminDataTableProps<Row>) {
  const sortable = React.useMemo(() => new Set(sortableKeys ?? []), [sortableKeys]);

  const [rows, setRows] = React.useState<Row[]>(initialData);
  const [total, setTotal] = React.useState(initialTotal);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(pageSizeOptions[0] ?? 10);
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<{ key: string; desc: boolean } | null>(initialSort ?? null);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Debounce recherche → reset page 1
  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const skipFirst = React.useRef(true);

  const fetchPage = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      if (sort && sortable.has(sort.key)) {
        params.set('sortBy', sort.key);
        params.set('sortDir', sort.desc ? 'desc' : 'asc');
      }
      const sep = endpoint.includes('?') ? '&' : '?';
      const res = await fetch(`${endpoint}${sep}${params.toString()}`);
      if (!res.ok) throw new Error();
      const json = (await res.json()) as ListResponse<Row>;
      setRows(json.rows);
      setTotal(json.total);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, search, sort, sortable]);

  // État initial = SSR ; on ne refetch pas au montage.
  React.useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    fetchPage();
  }, [fetchPage]);

  // Refetch sur signal externe (après une mutation déclenchée ailleurs).
  React.useEffect(() => {
    if (refreshSignal > 0) fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const toggleSort = (key: string) => {
    if (!sortable.has(key)) return;
    setSort((prev) => (prev?.key === key ? { key, desc: !prev.desc } : { key, desc: false }));
    setPage(1);
  };

  const alignCls = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  const hasActions = rowActions && rowActions.length > 0;

  return (
    <div className="w-full space-y-4">
      {/* Barre d'outils */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="border-white/15 bg-white/[0.02] pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" />
          )}
        </div>
        {toolbarRight && <div className="flex items-center gap-2">{toolbarRight}</div>}
      </div>

      {/* Table (scroll horizontal sur mobile — jamais le body) */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.01]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'text-white/50',
                    alignCls(col.align),
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.className
                  )}
                >
                  {col.sortable && sortable.has(col.key) ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1.5 font-medium text-white/60 hover:text-white"
                    >
                      {col.header}
                      <ArrowUpDown className={cn('h-3.5 w-3.5', sort?.key === col.key ? 'text-white' : 'text-white/30')} />
                    </button>
                  ) : (
                    <span className="font-medium">{col.header}</span>
                  )}
                </TableHead>
              ))}
              {hasActions && <TableHead className="w-12 text-right text-white/50">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className={cn('transition-opacity', loading && 'opacity-50')}>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={getRowId(row)} className="border-white/[0.06] hover:bg-white/[0.02]">
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        alignCls(col.align),
                        col.hideOnMobile && 'hidden md:table-cell',
                        col.className
                      )}
                    >
                      {col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className="text-right">
                      <RowActionsMenu row={row} actions={rowActions!} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="h-28 text-center">
                  <div className="flex flex-col items-center gap-2 text-white/40">
                    <Inbox className="h-6 w-6" />
                    <span className="text-sm">{loading ? 'Chargement…' : emptyLabel}</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — responsive */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-white/50">
          <span className="hidden sm:inline">Lignes</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-8 w-[70px] border-white/15 bg-white/[0.02]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="tabular-nums text-white/40">· {total} au total</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-white/50">
            Page {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-white/15 bg-white/[0.02]"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/15 bg-white/[0.02]"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount || loading}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}

function RowActionsMenu<Row>({ row, actions }: { row: Row; actions: AdminRowAction<Row>[] }) {
  const visible = actions.filter((a) => !a.hidden?.(row));
  if (visible.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 text-white/60 hover:text-white">
          <span className="sr-only">Ouvrir le menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-white/10 bg-black">
        <DropdownMenuLabel className="text-white/50">Actions</DropdownMenuLabel>
        {visible.map((a, i) => {
          const Icon = a.icon;
          const label = typeof a.label === 'function' ? a.label(row) : a.label;
          return (
            <React.Fragment key={i}>
              {a.separatorBefore && <DropdownMenuSeparator className="bg-white/10" />}
              <DropdownMenuItem
                onClick={() => a.onSelect(row)}
                className={cn('cursor-pointer', a.destructive && 'text-red-400 focus:text-red-300')}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {label}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
