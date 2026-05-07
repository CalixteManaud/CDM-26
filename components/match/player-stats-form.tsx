'use client';

import { useState } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface Player {
  id: string;
  jerseyNumber: number;
  position: string;
  user: { name: string };
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  players: Player[];
}

interface PlayerStat {
  playerId: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  onStatsChange: (stats: PlayerStat[]) => void;
  initialStats?: PlayerStat[];
}

export function PlayerStatsForm({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  onStatsChange,
  initialStats = [],
}: Props) {
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>(initialStats);

  const allPlayers = [
    ...homeTeam.players.map((p) => ({ ...p, teamId: homeTeam.id, teamName: homeTeam.name, teamShort: homeTeam.shortName })),
    ...awayTeam.players.map((p) => ({ ...p, teamId: awayTeam.id, teamName: awayTeam.name, teamShort: awayTeam.shortName })),
  ];

  const addPlayerStat = () => {
    const next = [
      ...playerStats,
      { playerId: '', goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    ];
    setPlayerStats(next);
    onStatsChange(next);
  };

  const removePlayerStat = (index: number) => {
    const next = playerStats.filter((_, i) => i !== index);
    setPlayerStats(next);
    onStatsChange(next);
  };

  const updatePlayerStat = (index: number, field: keyof PlayerStat, value: string | number) => {
    const next = [...playerStats];
    if (field === 'playerId') {
      const newPlayerId = value as string;
      const isDuplicate = playerStats.some(
        (stat, i) => i !== index && stat.playerId === newPlayerId && newPlayerId !== ''
      );
      if (isDuplicate) {
        toast.error('Ce joueur est déjà sélectionné');
        return;
      }
      next[index][field] = newPlayerId;
    } else {
      next[index][field] = Number(value);
    }
    setPlayerStats(next);
    onStatsChange(next);
  };

  const homeGoals = playerStats
    .filter((stat) => allPlayers.find((p) => p.id === stat.playerId)?.teamId === homeTeam.id)
    .reduce((sum, stat) => sum + stat.goals, 0);

  const awayGoals = playerStats
    .filter((stat) => allPlayers.find((p) => p.id === stat.playerId)?.teamId === awayTeam.id)
    .reduce((sum, stat) => sum + stat.goals, 0);

  const homeMatch = homeGoals === homeScore;
  const awayMatch = awayGoals === awayScore;
  const isValid = homeMatch && awayMatch;

  return (
    <div className="space-y-5">
      {/* Validation summary */}
      <Card className="relative overflow-hidden bg-white/2 border-white/10 p-5">
        <div className="grid grid-cols-2 gap-5">
          <ValidationCell
            shortName={homeTeam.shortName}
            name={homeTeam.name}
            entered={homeGoals}
            target={homeScore}
            ok={homeMatch}
          />
          <ValidationCell
            shortName={awayTeam.shortName}
            name={awayTeam.name}
            entered={awayGoals}
            target={awayScore}
            ok={awayMatch}
          />
        </div>
        {!isValid && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-orange-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="leading-relaxed">
              Le nombre de buts saisis doit correspondre au score final.
            </p>
          </div>
        )}
      </Card>

      {/* Player stat rows */}
      <div className="space-y-3">
        {playerStats.map((stat, index) => {
          const selectedPlayer = allPlayers.find((p) => p.id === stat.playerId);
          const selectedPlayerIds = playerStats.filter((s, i) => i !== index).map((s) => s.playerId);
          const isHome = selectedPlayer?.teamId === homeTeam.id;

          return (
            <Card
              key={index}
              className={`relative overflow-hidden bg-white/2 border ${
                selectedPlayer
                  ? isHome
                    ? 'border-emerald-500/25'
                    : 'border-red-500/25'
                  : 'border-white/10'
              } p-5 space-y-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2 min-w-0">
                  <Label className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono flex items-center gap-1.5">
                    <UserIcon className="w-3 h-3 text-emerald-400" />
                    Joueur · ligne {String(index + 1).padStart(2, '0')}
                  </Label>
                  <Select
                    value={stat.playerId || undefined}
                    onValueChange={(v) => updatePlayerStat(index, 'playerId', v)}
                  >
                    <SelectTrigger className="h-11 w-full bg-black/40 border-white/10 hover:border-white/30 text-white">
                      <SelectValue placeholder="— Sélectionner un joueur —" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPlayers.map((player) => {
                        const isTaken = selectedPlayerIds.includes(player.id);
                        return (
                          <SelectItem key={player.id} value={player.id} disabled={isTaken}>
                            #{player.jerseyNumber.toString().padStart(2, '0')} · {player.user.name} ·{' '}
                            {player.teamShort} · {player.position}
                            {isTaken ? ' — déjà sélectionné' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  onClick={() => removePlayerStat(index)}
                  variant="outline"
                  size="sm"
                  className="shrink-0 mt-7 h-9 w-9 p-0 border-red-500/25 hover:border-red-500/50 hover:bg-red-500/10 text-red-400"
                  aria-label="Supprimer la ligne"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {selectedPlayer && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/10">
                  <NumField
                    label="Buts"
                    code="GLS"
                    color="text-emerald-400"
                    value={stat.goals}
                    onChange={(v) => updatePlayerStat(index, 'goals', v)}
                  />
                  <NumField
                    label="Passes"
                    code="AST"
                    color="text-purple-400"
                    value={stat.assists}
                    onChange={(v) => updatePlayerStat(index, 'assists', v)}
                  />
                  <NumField
                    label="Cartons J"
                    code="CJ"
                    color="text-yellow-400"
                    value={stat.yellowCards}
                    onChange={(v) => updatePlayerStat(index, 'yellowCards', v)}
                    max={2}
                  />
                  <NumField
                    label="Cartons R"
                    code="CR"
                    color="text-red-400"
                    value={stat.redCards}
                    onChange={(v) => updatePlayerStat(index, 'redCards', v)}
                    max={1}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add player button */}
      <button
        type="button"
        onClick={addPlayerStat}
        className="group w-full flex items-center justify-center gap-2.5 px-4 py-4 rounded-xl border border-dashed border-white/15 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-white/55 hover:text-emerald-300 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span className="font-black uppercase tracking-[0.2em] text-xs">Ajouter une ligne</span>
      </button>
    </div>
  );
}

function ValidationCell({
  shortName,
  name,
  entered,
  target,
  ok,
}: {
  shortName: string;
  name: string;
  entered: number;
  target: number;
  ok: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-1">
        {shortName}
      </div>
      <div className="font-black text-white tracking-tight truncate text-sm mb-3">{name}</div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-black/40 border border-white/10">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">
          Buts saisis
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`font-black tabular-nums ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {entered}
          </span>
          <span className="text-white/30 text-xs">/</span>
          <span className="text-white/55 tabular-nums">{target}</span>
          {ok && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </span>
      </div>
    </div>
  );
}

function NumField({
  label,
  code,
  color,
  value,
  onChange,
  max,
}: {
  label: string;
  code: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/55 flex items-center justify-between">
        <span>{label}</span>
        <span className={color}>{code}</span>
      </Label>
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-11 text-center text-xl font-black tabular-nums bg-black/40 border-white/10 focus:border-white/30 ${color}`}
      />
    </div>
  );
}
