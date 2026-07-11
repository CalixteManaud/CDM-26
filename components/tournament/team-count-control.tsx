'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Minus, Plus, Users, Check } from 'lucide-react';
import { useRouter } from 'next/router';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const MIN_GROUP_COUNT = 1;
const MAX_GROUP_COUNT = 8;
const MIN_TEAMS_PER_GROUP = 2;
const MAX_TEAMS_PER_GROUP = 8;

/**
 * Contrôle admin : ajuste le nombre d'équipes que le tournoi peut accueillir
 * (= groupes × équipes par groupe), tant qu'aucun match n'a été généré.
 *
 * Les bornes basses tiennent compte des équipes déjà inscrites / réparties :
 * on ne peut pas réduire un groupe sous son occupation, ni supprimer un groupe
 * qui contient des équipes. Le serveur revérifie tout — ceci n'est qu'une aide
 * de saisie.
 */
export function TeamCountControl({
  tournamentId,
  currentGroupCount,
  currentTeamsPerGroup,
  largestGroupOccupancy,
  occupiedGroupsCount,
  registeredTeams,
}: {
  tournamentId: string;
  currentGroupCount: number;
  currentTeamsPerGroup: number;
  largestGroupOccupancy: number;
  occupiedGroupsCount: number;
  registeredTeams: number;
}) {
  const router = useRouter();
  const [groupCount, setGroupCount] = useState(currentGroupCount);
  const [teamsPerGroup, setTeamsPerGroup] = useState(currentTeamsPerGroup);
  const [loading, setLoading] = useState(false);

  const groupFloor = Math.max(MIN_GROUP_COUNT, occupiedGroupsCount);
  const teamsFloor = Math.max(MIN_TEAMS_PER_GROUP, largestGroupOccupancy);

  const dirty =
    groupCount !== currentGroupCount || teamsPerGroup !== currentTeamsPerGroup;
  const total = groupCount * teamsPerGroup;
  // La capacité ne peut pas descendre sous les équipes déjà inscrites : on
  // désactive un décrément qui violerait ce seuil.
  const groupDecBlocked = (groupCount - 1) * teamsPerGroup < registeredTeams;
  const teamsDecBlocked = groupCount * (teamsPerGroup - 1) < registeredTeams;

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/update-team-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupCount, teamsPerGroup }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Erreur lors de la mise à jour');
        return;
      }
      toast.success(`Capacité fixée à ${total} équipes`);
      router.replace(router.asPath);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden bg-linear-to-br from-emerald-950/20 via-black to-black border-emerald-500/20 p-6 md:p-7">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] mb-1.5 text-emerald-400">
            § Réglage · NOMBRE D&apos;ÉQUIPES
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-1.5 leading-tight">
            Équipes dans le tournoi
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            Combien d&apos;équipes peuvent entrer = groupes × équipes par groupe. Modifiable
            tant que les matchs n&apos;ont pas été générés.
            {registeredTeams > 0 && (
              <span className="text-white/40">
                {' '}
                Minimum {registeredTeams} (déjà inscrite{registeredTeams > 1 ? 's' : ''}).
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-5">
        <Stepper
          label="Groupes"
          value={groupCount}
          onDec={() => setGroupCount((v) => Math.max(groupFloor, v - 1))}
          onInc={() => setGroupCount((v) => Math.min(MAX_GROUP_COUNT, v + 1))}
          decDisabled={loading || groupCount <= groupFloor || groupDecBlocked}
          incDisabled={loading || groupCount >= MAX_GROUP_COUNT}
        />
        <span className="hidden lg:block text-2xl font-black text-white/25 pb-2">×</span>
        <Stepper
          label="Équipes / groupe"
          value={teamsPerGroup}
          onDec={() => setTeamsPerGroup((v) => Math.max(teamsFloor, v - 1))}
          onInc={() => setTeamsPerGroup((v) => Math.min(MAX_TEAMS_PER_GROUP, v + 1))}
          decDisabled={loading || teamsPerGroup <= teamsFloor || teamsDecBlocked}
          incDisabled={loading || teamsPerGroup >= MAX_TEAMS_PER_GROUP}
        />

        <div className="flex flex-col gap-1 lg:ml-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/45">
            Total équipes
          </span>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-3xl font-black tabular-nums text-emerald-300 text-center">
            {total}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={loading || !dirty || total < registeredTeams}
          className="lg:ml-auto bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.18em] text-xs px-5 h-11 disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              …
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  decDisabled: boolean;
  incDisabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/45">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 p-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDec}
          disabled={decDisabled}
          className="h-9 w-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
          aria-label={`Diminuer ${label}`}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="w-10 text-center text-2xl font-black tabular-nums text-white">
          {value}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onInc}
          disabled={incDisabled}
          className="h-9 w-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
          aria-label={`Augmenter ${label}`}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
