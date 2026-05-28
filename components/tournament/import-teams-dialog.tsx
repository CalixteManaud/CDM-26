import { useEffect, useState } from 'react';
import { Loader2, Download, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
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

export function ImportTeamsDialog({
  targetTournamentId,
  onDone,
}: {
  targetTournamentId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tournaments, setTournaments] = useState<ImportableTournament[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loadingList, setLoadingList] = useState(false);
  const [importing, setImporting] = useState(false);

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

  const handleImport = async () => {
    if (!selectedId) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/tournaments/${targetTournamentId}/import-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: selectedId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Erreur lors de l'import");
        return;
      }
      const { teamsCreated, playersCreated } = json.data as {
        teamsCreated: number;
        playersCreated: number;
      };
      toast.success(
        `${teamsCreated} équipe${teamsCreated > 1 ? 's' : ''} et ${playersCreated} joueur${playersCreated > 1 ? 's' : ''} importé${playersCreated > 1 ? 's' : ''}`
      );
      setOpen(false);
      setSelectedId('');
      onDone();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Erreur réseau');
    } finally {
      setImporting(false);
    }
  };

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importer des équipes</DialogTitle>
          <DialogDescription>
            Clone toutes les équipes (avec joueurs et coach) d&apos;un tournoi précédent vers
            celui-ci. Les équipes seront créées sans groupe assigné — tu pourras les
            répartir ensuite.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            Annuler
          </Button>
          <Button onClick={handleImport} disabled={!selectedId || importing}>
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Import en cours…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Importer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
