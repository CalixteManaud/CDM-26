import { z } from 'zod';

// Tournament validations
export const tournamentSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  startDate: z.coerce.date(),
  teamsPerGroup: z.coerce.number().min(2).max(8),
  playersPerTeam: z.coerce.number().min(3).max(15),
  groupCount: z.coerce.number().min(1).max(8),
});

export type TournamentInput = z.infer<typeof tournamentSchema>;

// Team validations
export const teamSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  shortName: z.string().min(2).max(3, 'Le nom court doit contenir 2-3 caractères'),
  logo: z.string().url('URL invalide').optional().or(z.literal('')),
  tournamentId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
});

export type TeamInput = z.infer<typeof teamSchema>;

// Player validations
export const playerSchema = z.object({
  jerseyNumber: z.coerce.number().min(1).max(99),
  position: z.enum(['GK', 'DEF', 'MID', 'ATT']).default('GK'),
  userId: z.string().uuid(),
  teamId: z.string().uuid(),
});

export type PlayerInput = z.infer<typeof playerSchema>;

// Match result validations
export const matchResultSchema = z.object({
  homeScore: z.coerce.number().min(0),
  awayScore: z.coerce.number().min(0),
  playerStats: z.array(
    z.object({
      playerId: z.string().uuid(),
      goals: z.coerce.number().min(0).default(0),
      assists: z.coerce.number().min(0).default(0),
      yellowCards: z.coerce.number().min(0).max(2).default(0),
      redCards: z.coerce.number().min(0).max(1).default(0),
    })
  ),
});

export type MatchResultInput = z.infer<typeof matchResultSchema>;

// Player stats validations
export const playerStatsSchema = z.object({
  goals: z.coerce.number().min(0),
  assists: z.coerce.number().min(0),
  yellowCards: z.coerce.number().min(0),
  redCards: z.coerce.number().min(0),
});

export type PlayerStatsInput = z.infer<typeof playerStatsSchema>;
