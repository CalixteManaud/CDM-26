import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/prisma-client/client";
import { UserRole } from '../prisma/prisma-client/enums';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Dates relatives (pour que les matchs soient toujours dans le futur quand on
  // relance le seed — sinon les paris sont fermés via isBettingOpen()).
  const now = new Date();
  const matchDay1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // J+7
  const matchDay2 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000); // J+7 +2h
  const tournamentStart = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // J+5

  // 1. Créer des utilisateurs de test
  console.log('Creating users...');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cantwitch.com' },
    update: { twitchUsername: 'seed_admin' },
    create: {
      email: 'admin@cantwitch.com',
      name: 'Admin User',
      username: 'admin',
      clerkId: 'seed_admin_clerk_id',
      role: UserRole.ADMIN,
      twitchUsername: 'seed_admin',
    },
  });

  // Créer 20 joueurs participants
  const players = [];
  for (let i = 1; i <= 20; i++) {
    const player = await prisma.user.upsert({
      where: { email: `player${i}@cantwitch.com` },
      update: { twitchUsername: `seed_viewer${i}` },
      create: {
        email: `player${i}@cantwitch.com`,
        name: `Joueur ${i}`,
        username: `player${i}`,
        clerkId: `seed_player${i}_clerk_id`,
        role: UserRole.PARTICIPANT,
        twitchUsername: `seed_viewer${i}`,
      },
    });
    players.push(player);
  }

  console.log(`✅ Created ${players.length} players and 1 admin`);

  // 2. Créer un tournoi
  console.log('Creating tournament...');

  const tournament = await prisma.tournament.create({
    data: {
      name: 'CDM 26 - Tournoi Test',
      startDate: tournamentStart,
      teamsPerGroup: 2,
      playersPerTeam: 5,
      groupCount: 2,
      groupStageComplete: false,
    },
  });

  console.log(`✅ Created tournament: ${tournament.name}`);

  // 3. Créer 2 groupes
  console.log('Creating groups...');

  const groupA = await prisma.group.create({
    data: {
      name: 'Groupe A',
      position: 1,
      tournamentId: tournament.id,
    },
  });

  const groupB = await prisma.group.create({
    data: {
      name: 'Groupe B',
      position: 2,
      tournamentId: tournament.id,
    },
  });

  console.log(`✅ Created 2 groups: ${groupA.name}, ${groupB.name}`);

  // 4. Créer 4 équipes (2 par groupe)
  console.log('Creating teams...');

  const teams = [];

  // Équipes du Groupe A
  const team1 = await prisma.team.create({
    data: {
      name: 'Les Lions de Paris',
      shortName: 'LDP',
      tournamentId: tournament.id,
      groupId: groupA.id,
      coachUserId: adminUser.id,
    },
  });
  teams.push(team1);

  const team2 = await prisma.team.create({
    data: {
      name: 'Les Aigles de Lyon',
      shortName: 'ADL',
      tournamentId: tournament.id,
      groupId: groupA.id,
      coachUserId: adminUser.id,
    },
  });
  teams.push(team2);

  // Équipes du Groupe B
  const team3 = await prisma.team.create({
    data: {
      name: 'Les Tigres de Marseille',
      shortName: 'TDM',
      tournamentId: tournament.id,
      groupId: groupB.id,
      coachUserId: adminUser.id,
    },
  });
  teams.push(team3);

  const team4 = await prisma.team.create({
    data: {
      name: 'Les Faucons de Toulouse',
      shortName: 'FDT',
      tournamentId: tournament.id,
      groupId: groupB.id,
      coachUserId: adminUser.id,
    },
  });
  teams.push(team4);

  console.log(`✅ Created ${teams.length} teams`);

  // 5. Ajouter 5 joueurs par équipe
  console.log('Adding players to teams...');

  const positions = ['GK', 'DEF', 'DEF', 'MID', 'ATT'];
  let playerIndex = 0;

  for (const team of teams) {
    for (let i = 0; i < 5; i++) {
      await prisma.player.create({
        data: {
          jerseyNumber: i + 1,
          position: positions[i],
          teamId: team.id,
          userId: players[playerIndex].id,
        },
      });
      playerIndex++;
    }
  }

  console.log(`✅ Added 5 players to each team (${teams.length * 5} total)`);

  // 6. Créer les standings initiaux pour chaque équipe
  console.log('Creating initial standings...');

  for (let i = 0; i < teams.length; i++) {
    await prisma.standing.create({
      data: {
        tournamentId: tournament.id,
        teamId: teams[i].id,
        position: i + 1,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
    });
  }

  console.log(`✅ Created standings for ${teams.length} teams`);

  // 7. Générer les matchs de groupe (round-robin)
  console.log('Generating group stage matches...');

  // Groupe A: team1 vs team2
  await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      groupId: groupA.id,
      stage: 'GROUP',
      status: 'SCHEDULED',
      homeTeamId: team1.id,
      awayTeamId: team2.id,
      matchDate: matchDay1,
    },
  });

  // Groupe B: team3 vs team4
  await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      groupId: groupB.id,
      stage: 'GROUP',
      status: 'SCHEDULED',
      homeTeamId: team3.id,
      awayTeamId: team4.id,
      matchDate: matchDay2,
    },
  });

  console.log(`✅ Created 2 group stage matches`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - 1 Tournament: ${tournament.name}`);
  console.log(`   - 2 Groups: ${groupA.name}, ${groupB.name}`);
  console.log(`   - 4 Teams with coaches`);
  console.log(`   - 20 Players (5 per team)`);
  console.log(`   - 2 Group matches scheduled`);
  console.log(`   - 1 Admin user: admin@cantwitch.com`);
  console.log('\n💡 Note: Vous pouvez générer plus de matchs via l\'admin dashboard');
  console.log('   ou utiliser la fonction generateGroupMatches() pour un round-robin complet');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
