import { useEffect, useMemo, useState } from 'react';
import { Loader2, Download, Users, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ImportableTournament = {
  id: string;
  name: string;
  startDate: string;
  archivedAt: string | null;
  _count: { teams: number };
};

type SourceTeam = {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  _count: { players: number };
};

export function ImportTeamsDialog({
  targetTournamentId,
  onDone,
  remainingSlots,
  existingTeams,
}: {
  targetTournamentId: string;
  onDone: () => void;
  /** Places libres dans le tournoi cible (capacité − équipes déjà inscrites). */
  remainingSlots: number;
  /** Équipes déjà présentes dans la cible — pour ne pas réimporter de doublon. */
  existingTeams: { name: string; shortName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [tournaments, setTournaments] = useState<ImportableTournament[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loadingList, setLoadingList] = useState(false);

  const [teams, setTeams] = useState<SourceTeam[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [importing, setImporting] = useState(false);

  const cap = Math.max(0, remainingSlots);

  // Clés normalisées des équipes déjà présentes dans la cible (anti-doublon :
  // même code court — clé unique — ou même nom, insensible à la casse).
  const existing = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase();
    return {
      names: new Set(existingTeams.map((t) => norm(t.name))),
      shorts: new Set(existingTeams.map((t) => norm(t.shortName))),
    };
  }, [existingTeams]);
  const isDup = (t: { name: string; shortName: string }) => {
    const norm = (s: string) => s.trim().toLowerCase();
    return existing.shorts.has(norm(t.shortName)) || existing.names.has(norm(t.name));
  };

  useEffect(() => {
    if (!open) return;
    setLoadingList(true);
    fetch(`/api/tournaments/importable?excludeId=${targetTournamentId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTournaments(json.data ?? []);
        else toast.error(json.error ?? 'Erreur de chargement');
      })
      .catch(() => toast.error('Erreur réseau'))
      .finally(() => setLoadingList(false));
  }, [open, targetTournamentId]);

  useEffect(() => {
    if (!selectedId) {
      setTeams([]);
      setSelectedTeamIds(new Set());
      return;
    }
    setLoadingTeams(true);
    fetch(`/api/tournaments/${selectedId}/teams-list`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const list = (json.data ?? []) as SourceTeam[];
          setTeams(list);
          // Pré-sélection : équipes non déjà présentes, bornée aux places libres.
          const importable = list.filter((t) => !isDup(t));
          setSelectedTeamIds(new Set(importable.slice(0, cap).map((t) => t.id)));
        } else {
          toast.error(json.error ?? 'Erreur de chargement des équipes');
        }
      })
      .catch(() => toast.error('Erreur réseau'))
      .finally(() => setLoadingTeams(false));
    // isDup/cap dérivent de props stables (existingTeams, remainingSlots).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, remainingSlots, existing]);

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= cap) {
          toast.error(`Plus que ${cap} place${cap > 1 ? 's' : ''} disponible${cap > 1 ? 's' : ''}`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const importableTeams = teams.filter((t) => !isDup(t));
  const dupCount = teams.length - importableTeams.length;
  const selectableCount = Math.min(importableTeams.length, cap);

  const toggleAll = () => {
    if (selectedTeamIds.size >= selectableCount) {
      setSelectedTeamIds(new Set());
    } else {
      setSelectedTeamIds(new Set(importableTeams.slice(0, cap).map((t) => t.id)));
    }
  };

  const handleImport = async () => {
    if (!selectedId || selectedTeamIds.size === 0) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/tournaments/${targetTournamentId}/import-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: selectedId,
          teamIds: Array.from(selectedTeamIds),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Erreur lors de l'import");
        return;
      }
      const { teamsCreated, playersCreated, skipped = 0 } = json.data as {
        teamsCreated: number;
        playersCreated: number;
        skipped?: number;
      };
      const skipNote =
        skipped > 0 ? ` · ${skipped} déjà présente${skipped > 1 ? 's' : ''} ignorée${skipped > 1 ? 's' : ''}` : '';
      toast.success(
        `${teamsCreated} équipe${teamsCreated > 1 ? 's' : ''} et ${playersCreated} joueur${playersCreated > 1 ? 's' : ''} importé${playersCreated > 1 ? 's' : ''}${skipNote}`
      );
      setOpen(false);
      setSelectedId('');
      setSelectedTeamIds(new Set());
      onDone();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Erreur réseau');
    } finally {
      setImporting(false);
    }
  };

  const allSelected = teams.length > 0 && selectedTeamIds.size >= selectableCount;
  const isFull = cap <= 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 hover:border-emerald-500/50"
        >
          <Download className="w-4 h-4 mr-2" />
          Importer depuis un tournoi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des équipes</DialogTitle>
          <DialogDescription>
            Clone les équipes (avec joueurs et coach) d&apos;un tournoi précédent vers celui-ci.
            Les équipes seront créées sans groupe assigné — tu pourras les répartir ensuite.
          </DialogDescription>
        </DialogHeader>

        <div
          className={`mb-1 rounded-lg border px-3 py-2 text-xs font-mono uppercase tracking-[0.2em] ${
            isFull
              ? 'border-red-500/30 bg-red-500/5 text-red-300'
              : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
          }`}
        >
          {isFull
            ? 'Tournoi complet — aucune place disponible'
            : `${cap} place${cap > 1 ? 's' : ''} disponible${cap > 1 ? 's' : ''}`}
        </div>

        <div className="py-2 space-y-4">
          {loadingList ? (
            <div className="flex items-center justify-center py-8 text-white/60">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Chargement…
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-8 text-white/60 text-sm">
              Aucun tournoi source disponible. Crée d&apos;abord un tournoi avec des équipes.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/55">
                  Tournoi source
                </label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un tournoi source" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournaments.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t.name}</span>
                          <span className="text-white/40 text-xs">
                            · {t._count.teams} équipe{t._count.teams > 1 ? 's' : ''} ·{' '}
                            {format(new Date(t.startDate), 'MMM yyyy', { locale: fr })}
                            {t.archivedAt ? ' · archivé' : ''}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/55">
                      Équipes à importer
                      {teams.length > 0 && (
                        <span className="ml-2 text-emerald-300">
                          {selectedTeamIds.size}/{teams.length} · max {cap}
                        </span>
                      )}
                      {dupCount > 0 && (
                        <span className="ml-2 text-amber-300/80 normal-case">
                          ({dupCount} déjà inscrite{dupCount > 1 ? 's' : ''})
                        </span>
                      )}
                    </label>
                    {teams.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="text-[10px] font-mono text-white/55 hover:text-white uppercase tracking-[0.22em] flex items-center gap-1.5"
                      >
                        {allSelected ? (
                          <>
                            <Square className="w-3 h-3" /> Tout désélectionner
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-3 h-3" /> Tout sélectionner
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {loadingTeams ? (
                    <div className="flex items-center justify-center py-6 text-white/60">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm">Chargement des équipes…</span>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="text-center py-6 text-white/60 text-sm">
                      Aucune équipe dans ce tournoi.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-black/40 divide-y divide-white/5">
                      {teams.map((t) => {
                        const dup = isDup(t);
                        const checked = selectedTeamIds.has(t.id);
                        const atCap = !checked && selectedTeamIds.size >= cap;
                        const disabled = dup || atCap;
                        return (
                          <label
                            key={t.id}
                            className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                              disabled
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-white/2 cursor-pointer'
                            }`}
                          >
                            <Checkbox
                              checked={checked && !dup}
                              disabled={disabled}
                              onCheckedChange={() => toggleTeam(t.id)}
                            />
                            {t.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={t.logo}
                                alt={t.name}
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/70">
                                {t.shortName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white truncate">{t.name}</span>
                                {dup && (
                                  <span className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] text-amber-300">
                                    Déjà inscrite
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-white/45 uppercase tracking-[0.2em]">
                                {t._count.players} joueur{t._count.players > 1 ? 's' : ''}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              !selectedId ||
              selectedTeamIds.size === 0 ||
              importing ||
              isFull ||
              selectedTeamIds.size > cap
            }
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Import en cours…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Importer
                {selectedTeamIds.size > 0 && (
                  <span className="ml-1.5 text-xs opacity-75">
                    ({selectedTeamIds.size})
                  </span>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
