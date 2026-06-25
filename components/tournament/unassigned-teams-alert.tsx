import Link from 'next/link';
import { AlertTriangle, Sparkles, Users, ArrowRight } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type TeamLite = { id: string; name: string; shortName: string };

/**
 * Bandeau d'alerte affiché (admin) quand des équipes du tournoi ne sont
 * assignées à aucun groupe — donc exclues des matchs, du classement et du
 * bracket. Deux états :
 *  - avant génération des matchs de poules → CTA vers le tirage au sort ;
 *  - après génération (tirage verrouillé) → alerte rouge informative.
 */
export function UnassignedTeamsAlert({
  tournamentId,
  unassignedTeams,
  hasGroupMatches,
  onViewTeams,
}: {
  tournamentId: string;
  unassignedTeams: TeamLite[];
  hasGroupMatches: boolean;
  onViewTeams?: () => void;
}) {
  if (unassignedTeams.length === 0) return null;

  const count = unassignedTeams.length;
  const preview = unassignedTeams.slice(0, 5);
  const rest = count - preview.length;

  const chips = (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {preview.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-white/80"
        >
          {t.name}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-white/45">
          +{rest} autre{rest > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );

  if (hasGroupMatches) {
    return (
      <Alert
        variant="destructive"
        className="border-red-500/40 bg-red-950/30 text-red-100 [&>svg]:text-red-400"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-black tracking-tight text-red-200">
          {count} équipe{count > 1 ? 's' : ''} hors des groupes
        </AlertTitle>
        <AlertDescription className="text-red-100/80">
          <p>
            {count > 1 ? 'Ces équipes ne sont' : 'Cette équipe n’est'} dans aucun groupe et{' '}
            {count > 1 ? 'ne joueront' : 'ne jouera'} aucun match de la phase de poules. Les matchs
            étant déjà générés, le tirage est verrouillé — utilise{' '}
            <strong className="text-red-100">Réinitialiser la phase de poules</strong> (onglet
            Matchs) pour relancer un tirage, puis régénère les matchs.
          </p>
          {chips}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-500/40 bg-amber-950/20 text-amber-100 [&>svg]:text-amber-400">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-black tracking-tight text-amber-200">
        {count} équipe{count > 1 ? 's' : ''} sans groupe
      </AlertTitle>
      <AlertDescription className="text-amber-100/80">
        <p>
          Lance le tirage au sort pour assigner {count > 1 ? 'ces équipes' : 'cette équipe'} à un
          groupe. Tant qu’{count > 1 ? 'elles ne sont' : 'elle n’est'} pas assignée
          {count > 1 ? 's' : ''}, {count > 1 ? 'elles seront exclues' : 'elle sera exclue'} des
          matchs, du classement et du bracket.
        </p>
        {chips}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href={`/tournaments/${tournamentId}/draw`}>
            <Button
              size="sm"
              className="bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-[0.18em] text-[11px]"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Tirage au sort
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
          {onViewTeams && (
            <Button
              size="sm"
              variant="outline"
              onClick={onViewTeams}
              className="border-amber-500/30 bg-transparent text-amber-200 hover:bg-amber-500/10 hover:text-amber-100 font-black uppercase tracking-[0.18em] text-[11px]"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Voir les équipes
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
