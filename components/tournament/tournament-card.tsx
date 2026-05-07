'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Trophy, Users, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TournamentCardProps {
  tournament: {
    id: string;
    name: string;
    startDate: Date;
    groupCount: number;
    teamsPerGroup: number;
    groupStageComplete: boolean;
    _count?: {
      teams: number;
      matches: number;
    };
  };
  index?: number;
}

export function TournamentCard({ tournament, index = 0 }: TournamentCardProps) {
  const isUpcoming = new Date(tournament.startDate) > new Date();
  const isOngoing = !tournament.groupStageComplete && new Date(tournament.startDate) <= new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-linear-to-r from-blue-500 via-purple-600 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500" />

      <Link href={`/tournaments/${tournament.id}`}>
        <div className="relative glass-hover rounded-2xl p-6 h-full">
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            {isUpcoming ? (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                À venir
              </span>
            ) : isOngoing ? (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">
                En cours
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Phase finale
              </span>
            )}
          </div>

          {/* Trophy Icon */}
          <div className="mb-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-linear-to-r from-yellow-400 to-yellow-600 rounded-xl blur-md opacity-75" />
              <div className="relative bg-linear-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl p-3 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold mb-3 text-gradient-gaming group-hover:scale-105 transition-transform">
            {tournament.name}
          </h3>

          {/* Stats */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{format(new Date(tournament.startDate), 'PPP', { locale: fr })}</span>
            </div>

            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="w-4 h-4 mr-2" />
              <span>{tournament._count?.teams || 0} équipes inscrites</span>
            </div>

            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{tournament.groupCount} groupes de {tournament.teamsPerGroup}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progression</span>
              <span>{tournament._count?.matches || 0} matchs</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: tournament.groupStageComplete ? '100%' : '60%' }}
                transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                className="h-full bg-linear-to-r from-blue-500 via-purple-500 to-pink-500"
              />
            </div>
          </div>

          {/* Hover indicator */}
          <div className="mt-4 flex items-center text-sm font-medium text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Voir le tournoi
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
