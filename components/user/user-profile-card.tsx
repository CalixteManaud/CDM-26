'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Users, Trophy, Calendar } from 'lucide-react';

interface CoachedTeam {
  id: string;
  name: string;
  tournament: {
    name: string;
  };
  group?: {
    name: string;
  } | null;
  _count?: {
    players: number;
  };
}

interface UserProfileCardProps {
  user: {
    name: string;
    email: string;
    role: string;
    coachedTeams?: CoachedTeam[];
  };
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Administrateur',
          gradient: 'from-red-500 to-pink-600',
          icon: Shield,
        };
      case 'PARTICIPANT':
        return {
          label: 'Participant',
          gradient: 'from-blue-500 to-purple-600',
          icon: Users,
        };
      case 'GUEST':
        return {
          label: 'Invité',
          gradient: 'from-gray-500 to-gray-600',
          icon: Users,
        };
      default:
        return {
          label: role,
          gradient: 'from-gray-500 to-gray-600',
          icon: Users,
        };
    }
  };

  const roleBadge = getRoleBadge(user.role);
  const RoleIcon = roleBadge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gradient-gaming mb-2">{user.name}</h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <div
          className={`px-4 py-2 bg-linear-to-r ${roleBadge.gradient} rounded-lg flex items-center space-x-2`}
        >
          <RoleIcon className="w-5 h-5 text-white" />
          <span className="text-white font-semibold">{roleBadge.label}</span>
        </div>
      </div>

      {/* Coached Teams */}
      {user.coachedTeams && user.coachedTeams.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="w-5 h-5 text-purple-400" />
            <h3 className="text-xl font-bold">Équipes que vous coachez</h3>
          </div>

          <div className="space-y-3">
            {user.coachedTeams.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <motion.div
                  whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  className="glass-hover rounded-xl p-4 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{team.name}</h4>
                      <div className="flex items-center space-x-3 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{team.tournament.name}</span>
                        </div>
                        {team.group && (
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{team.group.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {team._count && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gradient-gaming">
                          {team._count.players}
                        </p>
                        <p className="text-xs text-muted-foreground">Joueurs</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Admin Badge */}
      {user.role === 'ADMIN' && (
        <div className="mt-6 p-4 bg-linear-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-red-400" />
            <div>
              <p className="font-semibold text-red-400">Administrateur du site</p>
              <p className="text-sm text-muted-foreground">
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
