'use client';

import * as React from 'react';
import { UserCog, Check, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CoachUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CoachComboboxProps {
  teamId: string;
  currentCoachId?: string | null;
  /** Callback après une assignation réussie (refresh côté parent). */
  onAssigned?: () => void;
}

export function CoachCombobox({ teamId, currentCoachId, onAssigned }: CoachComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [users, setUsers] = React.useState<CoachUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [assigningId, setAssigningId] = React.useState<string | null>(null);

  // Recherche serveur debouncée — uniquement quand le popover est ouvert.
  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ pageSize: '20', sortBy: 'name', sortDir: 'asc' });
        if (query.trim()) params.set('search', query.trim());
        const res = await fetch(`/api/admin/users-list?${params.toString()}`);
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { rows: CoachUser[] };
        if (active) setUsers(json.rows);
      } catch {
        if (active) setUsers([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const assign = async (user: CoachUser) => {
    setAssigningId(user.id);
    try {
      const res = await fetch('/api/admin/assign-team-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, coachUserId: user.id }),
      });
      const json: { success?: boolean; error?: string } = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Erreur lors de l'assignation");
        return;
      }
      toast.success(`Coach assigné : ${user.name}`);
      setOpen(false);
      onAssigned?.();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <UserCog className="mr-2 h-4 w-4" />
          {currentCoachId ? 'Changer' : 'Assigner'}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 border-white/15 bg-black p-0 text-white"
      >
        {/* shouldFilter={false} → on laisse la recherche serveur décider, pas le filtre cmdk */}
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Rechercher un utilisateur…"
            className="text-white placeholder:text-white/35"
          />
          <CommandList className="max-h-none">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-white/45">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em]">Recherche…</span>
              </div>
            )}

            {!loading && (
              <CommandEmpty className="py-6 text-center text-xs font-mono uppercase tracking-[0.22em] text-white/40">
                Aucun utilisateur trouvé
              </CommandEmpty>
            )}

            {!loading && users.length > 0 && (
              <ScrollArea className="max-h-72">
                <CommandGroup className="p-1.5">
                  {users.map((user) => {
                    const isCurrent = user.id === currentCoachId;
                    const isAssigning = assigningId === user.id;
                    return (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        disabled={assigningId !== null}
                        onSelect={() => assign(user)}
                        className="gap-2.5 rounded-lg px-2 py-2 data-[selected=true]:bg-emerald-500/10"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 text-xs font-black text-white ring-1 ring-white/10">
                          {user.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-white">{user.name}</span>
                            {user.role === 'ADMIN' && <Crown className="h-3 w-3 shrink-0 text-amber-400" />}
                          </div>
                          <span className="block truncate text-xs text-white/45">{user.email}</span>
                        </div>
                        {isAssigning ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" />
                        ) : isCurrent ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </ScrollArea>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
