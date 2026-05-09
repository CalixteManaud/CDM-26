'use server';

import prisma from '@/lib/prisma';
import {
  BettingMarketStatus,
  BettingMarketType,
  BetStatus,
} from '@/prisma/prisma-client/enums';
import { creditWizebotPoints, debitWizebotPoints } from '@/lib/wizebot';
import { computeMarketOdds, isMarketOpen, generateExactScoreOutcomes } from '@/lib/utils/markets';

const TEAM_SELECT = {
  id: true,
  name: true,
  shortName: true,
  logo: true,
} as const;

const PLAYER_SELECT = {
  id: true,
  jerseyNumber: true,
  position: true,
  user: { select: { name: true, username: true, avatar: true } },
  team: { select: TEAM_SELECT },
} as const;

const POOL_SELECT = {
  id: true,
  outcomeKey: true,
  totalPool: true,
  betCount: true,
  playerId: true,
  teamId: true,
  player: { select: PLAYER_SELECT },
  team: { select: TEAM_SELECT },
} as const;

const MARKET_SELECT = {
  id: true,
  type: true,
  status: true,
  param: true,
  closesAt: true,
  housePercentage: true,
  settledOutcomeKey: true,
  finalTotalPool: true,
  matchId: true,
  tournamentId: true,
  match: {
    select: {
      id: true,
      matchDate: true,
      status: true,
      homeTeam: { select: TEAM_SELECT },
      awayTeam: { select: TEAM_SELECT },
      tournament: { select: { id: true, name: true } },
    },
  },
  tournament: { select: { id: true, name: true } },
  pools: { select: POOL_SELECT },
} as const;

// =================== Lecture ===================

/**
 * Tous les marchés additionnels d'un match (hors 1X2 qui reste sur Bet).
 */
export async function getMatchMarkets(matchId: string) {
  try {
    const markets = await prisma.bettingMarket.findMany({
      where: { matchId },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      select: MARKET_SELECT,
    });
    return { success: true, data: markets };
  } catch (error) {
    console.error('Error fetching match markets:', error);
    return { success: false, error: 'Erreur lors de la récupération des marchés' };
  }
}

/**
 * Tous les marchés tournoi (top buteur, MVP, vainqueur).
 */
export async function getTournamentMarkets(tournamentId: string) {
  try {
    const markets = await prisma.bettingMarket.findMany({
      where: { tournamentId },
      orderBy: [{ status: 'asc' }, { type: 'asc' }],
      select: MARKET_SELECT,
    });
    return { success: true, data: markets };
  } catch (error) {
    console.error('Error fetching tournament markets:', error);
    return { success: false, error: 'Erreur lors de la récupération des marchés' };
  }
}

export async function getMarketDetails(marketId: string) {
  try {
    const market = await prisma.bettingMarket.findUnique({
      where: { id: marketId },
      select: MARKET_SELECT,
    });
    if (!market) return { success: false, error: 'Marché introuvable' };
    return { success: true, data: market };
  } catch (error) {
    console.error('Error fetching market details:', error);
    return { success: false, error: 'Erreur lors de la récupération du marché' };
  }
}

/**
 * Tous les marchés ouverts (paris en cours), tous types confondus.
 * Sert à la page /paris pour afficher l'offre globale.
 */
export async function getAllOpenMarkets() {
  try {
    const markets = await prisma.bettingMarket.findMany({
      where: {
        status: BettingMarketStatus.OPEN,
        closesAt: { gt: new Date() },
      },
      orderBy: { closesAt: 'asc' },
      select: MARKET_SELECT,
    });
    return { success: true, data: markets };
  } catch (error) {
    console.error('Error fetching open markets:', error);
    return { success: false, error: 'Erreur lors de la récupération des paris ouverts' };
  }
}

// =================== Validation helpers ===================

const MIN_STAKE = 50;
const MAX_STAKE = 100_000;

function validateStake(amount: number): string | null {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) return 'Mise invalide';
  if (amount < MIN_STAKE) return `Mise minimum : ${MIN_STAKE} pts`;
  if (amount > MAX_STAKE) return `Mise maximum : ${MAX_STAKE.toLocaleString('fr-FR')} pts`;
  return null;
}

// =================== Création (admin) ===================

type CreateMatchScoreInput = {
  matchId: string;
  closesAt: Date;
  housePercentage?: number;
  maxGoals?: number;
};

export async function adminCreateMatchExactScoreMarket(input: CreateMatchScoreInput) {
  try {
    const outcomes = generateExactScoreOutcomes(input.maxGoals ?? 4);
    const market = await prisma.bettingMarket.create({
      data: {
        type: BettingMarketType.MATCH_EXACT_SCORE,
        matchId: input.matchId,
        closesAt: input.closesAt,
        housePercentage: input.housePercentage ?? 0,
        pools: { create: outcomes.map((outcomeKey) => ({ outcomeKey })) },
      },
      select: MARKET_SELECT,
    });
    return { success: true, data: market };
  } catch (error) {
    console.error('Error creating exact-score market:', error);
    return { success: false, error: 'Impossible de créer le marché score exact' };
  }
}

type CreateTotalGoalsInput = {
  matchId: string;
  closesAt: Date;
  line: string; // ex "2.5"
  housePercentage?: number;
};

export async function adminCreateMatchTotalGoalsMarket(input: CreateTotalGoalsInput) {
  try {
    const market = await prisma.bettingMarket.create({
      data: {
        type: BettingMarketType.MATCH_TOTAL_GOALS,
        matchId: input.matchId,
        param: input.line,
        closesAt: input.closesAt,
        housePercentage: input.housePercentage ?? 0,
        pools: { create: [{ outcomeKey: 'OVER' }, { outcomeKey: 'UNDER' }] },
      },
      select: MARKET_SELECT,
    });
    return { success: true, data: market };
  } catch (error) {
    console.error('Error creating total-goals market:', error);
    return { success: false, error: 'Impossible de créer le marché total buts' };
  }
}

export async function adminCreateMatchBttsMarket(input: {
  matchId: string;
  closesAt: Date;
  housePercentage?: number;
}) {
  try {
    const market = await prisma.bettingMarket.create({
      data: {
        type: BettingMarketType.MATCH_BTTS,
        matchId: input.matchId,
        closesAt: input.closesAt,
        housePercentage: input.housePercentage ?? 0,
        pools: { create: [{ outcomeKey: 'YES' }, { outcomeKey: 'NO' }] },
      },
      select: MARKET_SELECT,
    });
    return { success: true, data: market };
  } catch (error) {
    console.error('Error creating BTTS market:', error);
    return { success: false, error: 'Impossible de créer le marché BTTS' };
  }
}

type CreateTournamentPlayerMarketInput = {
  tournamentId: string;
  type: 'TOURNAMENT_TOP_SCORER' | 'TOURNAMENT_MVP';
  closesAt: Date;
  housePercentage?: number;
  playerIds?: string[]; // si omis, tous les joueurs du tournoi
};

export async function adminCreateTournamentPlayerMarket(input: CreateTournamentPlayerMarketInput) {
  try {
    let playerIds = input.playerIds;
    if (!playerIds || playerIds.length === 0) {
      const players = await prisma.player.findMany({
        where: { team: { tournamentId: input.tournamentId } },
        select: { id: true },
      });
      playerIds = players.map((p) => p.id);
    }
    if (playerIds.length === 0) {
      return { success: false, error: 'Aucun joueur dans ce tournoi' };
    }

    const market = await prisma.bettingMarket.create({
      data: {
        type:
          input.type === 'TOURNAMENT_TOP_SCORER'
            ? BettingMarketType.TOURNAMENT_TOP_SCORER
            : BettingMarketType.TOURNAMENT_MVP,
        tournamentId: input.tournamentId,
        closesAt: input.closesAt,
        housePercentage: input.housePercentage ?? 0,
        pools: {
          create: playerIds.map((playerId) => ({ outcomeKey: playerId, playerId })),
        },
      },
      select: MARKET_SELECT,
    });
    return { success: true, data: market };
  } catch (error) {
    console.error('Error creating tournament player market:', error);
    return { success: false, error: 'Impossible de créer ce marché' };
  }
}

export async function adminCreateTournamentWinnerMarket(input: {
  tournamentId: string;
  closesAt: Date;
  housePercentage?: number;
  teamIds?: string[];
}) {
  try {
    let teamIds = input.teamIds;
    if (!teamIds || teamIds.length === 0) {
      const teams = await prisma.team.findMany({
        where: { tournamentId: input.tournamentId, disqualified: false },
        select: { id: true },
      });
      teamIds = teams.map((t) => t.id);
    }
    if (teamIds.length === 0) {
      return { success: false, error: 'Aucune équipe dans ce tournoi' };
    }

    const market = await prisma.bettingMarket.create({
      data: {
        type: BettingMarketType.TOURNAMENT_WINNER,
        tournamentId: input.tournamentId,
        closesAt: input.closesAt,
        housePercentage: input.housePercentage ?? 0,
        pools: {
          create: teamIds.map((teamId) => ({ outcomeKey: teamId, teamId })),
        },
      },
      select: MARKET_SELECT,
    });
    return { success: true, data: market };
  } catch (error) {
    console.error('Error creating tournament winner market:', error);
    return { success: false, error: 'Impossible de créer le marché vainqueur' };
  }
}

// =================== Placement de pari (single) ===================

export class MarketBettingError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

type PlaceMarketBetInput = {
  userId: string;
  twitchUsername: string;
  marketId: string;
  outcomeKey: string;
  amount: number;
};

/**
 * Place un pari simple sur un marché. Débite Wizebot et crée le MarketBet
 * de manière atomique.
 */
export async function placeMarketBet(input: PlaceMarketBetInput) {
  const stakeError = validateStake(input.amount);
  if (stakeError) {
    return { success: false, error: stakeError, code: 'INVALID_STAKE' };
  }

  // 1. Vérifie le marché + pool ouvert + outcome existant — hors transaction
  const market = await prisma.bettingMarket.findUnique({
    where: { id: input.marketId },
    select: {
      id: true,
      status: true,
      closesAt: true,
      housePercentage: true,
      pools: { select: { outcomeKey: true, totalPool: true } },
    },
  });
  if (!market) {
    return { success: false, error: 'Marché introuvable', code: 'NOT_FOUND' };
  }
  if (!isMarketOpen({ status: market.status, closesAt: market.closesAt })) {
    return { success: false, error: 'Ce marché est fermé', code: 'CLOSED' };
  }
  const targetPool = market.pools.find((p) => p.outcomeKey === input.outcomeKey);
  if (!targetPool) {
    return { success: false, error: 'Outcome inconnu pour ce marché', code: 'BAD_OUTCOME' };
  }

  // Cote au moment du placement (snapshot informatif)
  const oddsMap = computeMarketOdds(market.pools, Number(market.housePercentage));
  const snapshotOdds = oddsMap[input.outcomeKey] ?? 1.01;

  // 2. Débit Wizebot
  const debit = await debitWizebotPoints({
    twitchUsername: input.twitchUsername,
    amount: input.amount,
    reason: `Pari ${market.id.slice(0, 8)} → ${input.outcomeKey}`,
  });
  if (!debit.ok) {
    return {
      success: false,
      error:
        debit.code === 'INSUFFICIENT_FUNDS'
          ? 'Solde Wizebot insuffisant pour cette mise.'
          : `Débit Wizebot échoué : ${debit.error}`,
      code: debit.code ?? 'WIZEBOT_DEBIT_FAILED',
    };
  }
  const debitTxId = debit.txId;

  // 3. Crée le bet + maj pool atomiquement
  try {
    const bet = await prisma.$transaction(async (tx) => {
      const created = await tx.marketBet.create({
        data: {
          marketId: input.marketId,
          userId: input.userId,
          outcomeKey: input.outcomeKey,
          pointsWagered: input.amount,
          oddsAtPlacement: snapshotOdds.toFixed(3),
          wizebotDebitTxId: debitTxId,
        },
      });
      await tx.marketPool.update({
        where: {
          marketId_outcomeKey: {
            marketId: input.marketId,
            outcomeKey: input.outcomeKey,
          },
        },
        data: {
          totalPool: { increment: input.amount },
          betCount: { increment: 1 },
        },
      });
      return created;
    });

    return { success: true, data: bet };
  } catch (error) {
    console.error('Error creating market bet (debit succeeded):', error);
    return {
      success: false,
      error: 'Pari KO après débit. Le débit Wizebot sera remboursé manuellement.',
      code: 'BET_CREATE_FAILED',
      debitTxId,
    };
  }
}

// =================== Placement combiné (BetSlip) ===================

type BetSlipLeg = { marketId: string; outcomeKey: string };
type PlaceBetSlipInput = {
  userId: string;
  twitchUsername: string;
  legs: BetSlipLeg[];
  totalStake: number;
};

export async function placeBetSlip(input: PlaceBetSlipInput) {
  if (input.legs.length < 2) {
    return { success: false, error: 'Un combiné nécessite au moins 2 paris', code: 'TOO_FEW_LEGS' };
  }
  if (input.legs.length > 10) {
    return { success: false, error: 'Maximum 10 paris dans un combiné', code: 'TOO_MANY_LEGS' };
  }
  const stakeError = validateStake(input.totalStake);
  if (stakeError) {
    return { success: false, error: stakeError, code: 'INVALID_STAKE' };
  }

  // 1. Charge les marchés concernés en parallèle
  const marketIds = input.legs.map((l) => l.marketId);
  const dedupMarketIds = Array.from(new Set(marketIds));
  if (dedupMarketIds.length !== marketIds.length) {
    return {
      success: false,
      error: 'Tu ne peux pas mettre deux paris sur le même marché dans un combiné',
      code: 'DUPLICATE_MARKET',
    };
  }

  const markets = await prisma.bettingMarket.findMany({
    where: { id: { in: marketIds } },
    select: {
      id: true,
      status: true,
      closesAt: true,
      housePercentage: true,
      pools: { select: { outcomeKey: true, totalPool: true } },
    },
  });
  if (markets.length !== marketIds.length) {
    return { success: false, error: 'Un marché du combiné est introuvable', code: 'NOT_FOUND' };
  }

  // Validation + collecte des cotes
  const legOdds: Array<{ marketId: string; outcomeKey: string; odds: number; stake: number }> = [];
  let combinedOdds = 1;
  const perLegStake = Math.floor(input.totalStake / input.legs.length);
  if (perLegStake < 1) {
    return { success: false, error: 'Mise par jambe trop faible', code: 'STAKE_TOO_LOW' };
  }

  for (const leg of input.legs) {
    const m = markets.find((mk) => mk.id === leg.marketId)!;
    if (!isMarketOpen({ status: m.status, closesAt: m.closesAt })) {
      return {
        success: false,
        error: 'Un marché du combiné est fermé',
        code: 'CLOSED',
      };
    }
    const target = m.pools.find((p) => p.outcomeKey === leg.outcomeKey);
    if (!target) {
      return {
        success: false,
        error: 'Outcome inconnu dans un marché du combiné',
        code: 'BAD_OUTCOME',
      };
    }
    const oddsMap = computeMarketOdds(m.pools, Number(m.housePercentage));
    const o = oddsMap[leg.outcomeKey] ?? 1.01;
    legOdds.push({ marketId: m.id, outcomeKey: leg.outcomeKey, odds: o, stake: perLegStake });
    combinedOdds *= o;
  }

  const potentialPayout = Math.floor(input.totalStake * combinedOdds);

  // 2. Débit Wizebot pour la mise totale
  const debit = await debitWizebotPoints({
    twitchUsername: input.twitchUsername,
    amount: input.totalStake,
    reason: `Combiné ${input.legs.length} paris (×${combinedOdds.toFixed(2)})`,
  });
  if (!debit.ok) {
    return {
      success: false,
      error:
        debit.code === 'INSUFFICIENT_FUNDS'
          ? 'Solde Wizebot insuffisant pour ce combiné.'
          : `Débit Wizebot échoué : ${debit.error}`,
      code: debit.code ?? 'WIZEBOT_DEBIT_FAILED',
    };
  }
  const debitTxId = debit.txId;

  // 3. Crée slip + bets + maj pools en transaction
  try {
    const slip = await prisma.$transaction(async (tx) => {
      const created = await tx.betSlip.create({
        data: {
          userId: input.userId,
          totalStake: input.totalStake,
          combinedOdds: combinedOdds.toFixed(3),
          potentialPayout,
          wizebotDebitTxId: debitTxId,
          bets: {
            create: legOdds.map((l) => ({
              marketId: l.marketId,
              userId: input.userId,
              outcomeKey: l.outcomeKey,
              pointsWagered: l.stake,
              oddsAtPlacement: l.odds.toFixed(3),
            })),
          },
        },
      });
      // Maj des pools
      await Promise.all(
        legOdds.map((l) =>
          tx.marketPool.update({
            where: {
              marketId_outcomeKey: { marketId: l.marketId, outcomeKey: l.outcomeKey },
            },
            data: {
              totalPool: { increment: l.stake },
              betCount: { increment: 1 },
            },
          })
        )
      );
      return created;
    });

    return { success: true, data: { slipId: slip.id, combinedOdds, potentialPayout } };
  } catch (error) {
    console.error('Error creating bet slip (debit succeeded):', error);
    return {
      success: false,
      error: 'Combiné KO après débit. Le débit Wizebot sera remboursé manuellement.',
      code: 'SLIP_CREATE_FAILED',
      debitTxId,
    };
  }
}

// =================== Settlement ===================

/**
 * Verrouille le marché (status LOCKED) et snapshot le pool total.
 * À appeler par l'admin AVANT settle pour figer les paris.
 */
export async function lockMarket(marketId: string) {
  try {
    const pools = await prisma.marketPool.findMany({
      where: { marketId },
      select: { totalPool: true },
    });
    const finalTotal = pools.reduce((s, p) => s + p.totalPool, 0);
    const market = await prisma.bettingMarket.update({
      where: { id: marketId },
      data: {
        status: BettingMarketStatus.LOCKED,
        lockedAt: new Date(),
        finalTotalPool: finalTotal,
      },
      select: { id: true, finalTotalPool: true, status: true },
    });
    return { success: true, data: market };
  } catch (error) {
    console.error('Error locking market:', error);
    return { success: false, error: 'Impossible de verrouiller le marché' };
  }
}

type SettleMarketInput = {
  marketId: string;
  winningOutcomeKey: string;
};

/**
 * Règle un marché : marque les paris WON/LOST, calcule les payouts.
 * Crédite Wizebot pour les paris simples gagnants ; les paris en BetSlip
 * ne sont crédités qu'une fois TOUS les bets du slip settled (cf. evaluateSlip).
 */
export async function settleMarket(input: SettleMarketInput) {
  try {
    const market = await prisma.bettingMarket.findUnique({
      where: { id: input.marketId },
      select: {
        id: true,
        status: true,
        housePercentage: true,
        finalTotalPool: true,
        pools: { select: { outcomeKey: true, totalPool: true } },
        bets: {
          select: {
            id: true,
            outcomeKey: true,
            pointsWagered: true,
            slipId: true,
            user: { select: { id: true, twitchUsername: true } },
          },
          where: { status: BetStatus.PENDING },
        },
      },
    });

    if (!market) return { success: false, error: 'Marché introuvable' };

    const winnerPool = market.pools.find((p) => p.outcomeKey === input.winningOutcomeKey);
    if (!winnerPool) {
      return { success: false, error: 'Outcome gagnant inconnu' };
    }

    const totalPool =
      market.finalTotalPool ?? market.pools.reduce((s, p) => s + p.totalPool, 0);
    const houseRatio = 1 - Number(market.housePercentage) / 100;
    const distributable = Math.floor(totalPool * houseRatio);

    // Update market
    await prisma.bettingMarket.update({
      where: { id: input.marketId },
      data: {
        status: BettingMarketStatus.SETTLED,
        settledOutcomeKey: input.winningOutcomeKey,
        settledAt: new Date(),
        finalTotalPool: totalPool,
      },
    });

    const slipsToReevaluate = new Set<string>();

    for (const bet of market.bets) {
      const isWin = bet.outcomeKey === input.winningOutcomeKey;
      let payout = 0;
      if (isWin && winnerPool.totalPool > 0) {
        payout = Math.floor((bet.pointsWagered / winnerPool.totalPool) * distributable);
      }

      // Pour un MarketBet en slip, on ne crédite pas individuellement.
      // On marque juste le statut. Le slip décide à la fin.
      if (bet.slipId) {
        await prisma.marketBet.update({
          where: { id: bet.id },
          data: {
            status: isWin ? BetStatus.WON : BetStatus.LOST,
            actualPayout: 0, // settled au niveau slip
            settledAt: new Date(),
          },
        });
        slipsToReevaluate.add(bet.slipId);
        continue;
      }

      // Pari simple : credit Wizebot fire-and-forget si gagnant
      if (isWin) {
        if (bet.user.twitchUsername && payout > 0) {
          const credit = await creditWizebotPoints({
            twitchUsername: bet.user.twitchUsername,
            amount: payout,
            reason: `Gain pari ${market.id.slice(0, 8)}`,
          });
          if (credit.ok) {
            await prisma.marketBet.update({
              where: { id: bet.id },
              data: {
                status: BetStatus.WON,
                actualPayout: payout,
                settledAt: new Date(),
                wizebotCreditTxId: credit.txId,
              },
            });
          } else {
            await prisma.marketBet.update({
              where: { id: bet.id },
              data: {
                status: BetStatus.CREDIT_FAILED,
                actualPayout: payout,
                settledAt: new Date(),
                wizebotCreditError: credit.error,
              },
            });
          }
        } else {
          await prisma.marketBet.update({
            where: { id: bet.id },
            data: {
              status: BetStatus.WON,
              actualPayout: payout,
              settledAt: new Date(),
            },
          });
        }
      } else {
        await prisma.marketBet.update({
          where: { id: bet.id },
          data: { status: BetStatus.LOST, settledAt: new Date() },
        });
      }
    }

    // Re-évaluation des combinés impactés
    for (const slipId of slipsToReevaluate) {
      await evaluateBetSlip(slipId);
    }

    return { success: true, data: { settled: market.bets.length } };
  } catch (error) {
    console.error('Error settling market:', error);
    return { success: false, error: 'Erreur de settlement' };
  }
}

/**
 * Re-évalue un BetSlip : si tous ses MarketBets sont WON → slip WON et crédit
 * Wizebot. Si au moins un est LOST → slip LOST. Sinon attendre les autres bets.
 */
export async function evaluateBetSlip(slipId: string) {
  try {
    const slip = await prisma.betSlip.findUnique({
      where: { id: slipId },
      select: {
        id: true,
        status: true,
        totalStake: true,
        combinedOdds: true,
        potentialPayout: true,
        user: { select: { twitchUsername: true } },
        bets: { select: { id: true, status: true } },
      },
    });
    if (!slip) return { success: false, error: 'Slip introuvable' };
    if (slip.status !== BetStatus.PENDING) return { success: true, data: slip };

    const anyLost = slip.bets.some((b) => b.status === BetStatus.LOST);
    const allSettled = slip.bets.every(
      (b) =>
        b.status === BetStatus.WON ||
        b.status === BetStatus.LOST ||
        b.status === BetStatus.CREDIT_FAILED
    );

    if (anyLost) {
      await prisma.betSlip.update({
        where: { id: slipId },
        data: { status: BetStatus.LOST, settledAt: new Date() },
      });
      return { success: true, data: { status: 'LOST' } };
    }

    if (!allSettled) {
      return { success: true, data: { status: 'PENDING' } };
    }

    // Tous gagnants : crédit Wizebot
    const payout = slip.potentialPayout;
    let creditTxId: string | undefined;
    if (slip.user.twitchUsername && payout > 0) {
      const c = await creditWizebotPoints({
        twitchUsername: slip.user.twitchUsername,
        amount: payout,
        reason: `Combiné gagnant (×${Number(slip.combinedOdds).toFixed(2)})`,
      });
      if (!c.ok) {
        // On laisse le slip en PENDING pour retry manuel
        console.error('BetSlip credit failed:', c.error);
        return { success: false, error: 'Crédit Wizebot échoué — à rejouer' };
      }
      creditTxId = c.txId;
    }
    await prisma.betSlip.update({
      where: { id: slipId },
      data: {
        status: BetStatus.WON,
        actualPayout: payout,
        settledAt: new Date(),
        wizebotCreditTxId: creditTxId,
      },
    });
    return { success: true, data: { status: 'WON', payout } };
  } catch (error) {
    console.error('Error evaluating bet slip:', error);
    return { success: false, error: 'Erreur évaluation combiné' };
  }
}
