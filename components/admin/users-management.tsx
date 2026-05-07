'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Shield, UserCheck, Users as UsersIcon, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getUserDisplayName } from '@/lib/utils/display';

interface CoachedTeam {
  id: string;
  name: string;
  tournament: { name: string };
}

interface User {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  createdAt: string;
  coachedTeams?: CoachedTeam[];
}

interface UsersManagementProps {
  users: User[];
  onUpdate?: () => void;
}

export function UsersManagement({ users, onUpdate }: UsersManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

  const handlePromote = (userId: string) => {
    setActioningUserId(userId);
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/promote-to-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: userId }),
        });

        const json: { success?: boolean; error?: string } = await res.json();

        if (!res.ok || !json.success) {
          toast.error(json.error ?? 'Erreur lors de la promotion');
        } else {
          toast.success('Utilisateur promu administrateur');
          onUpdate?.();
        }
      } catch (error) {
        toast.error('Erreur réseau');
      }

      setActioningUserId(null);
    });
  };

  const handleDemote = (userId: string) => {
    setActioningUserId(userId);
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/demote-from-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: userId }),
        });

        const json: { success?: boolean; error?: string } = await res.json();

        if (!res.ok || !json.success) {
          toast.error(json.error ?? 'Erreur lors de la rétrogradation');
        } else {
          toast.success('Utilisateur rétrogradé');
          onUpdate?.();
        }
      } catch (error) {
        toast.error('Erreur réseau');
      }

      setActioningUserId(null);
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Admin',
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/30',
        };
      case 'PARTICIPANT':
        return {
          label: 'Participant',
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
        };
      case 'GUEST':
        return {
          label: 'Invité',
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          border: 'border-gray-500/30',
        };
      default:
        return {
          label: role,
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          border: 'border-gray-500/30',
        };
    }
  };

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const canAddAdmin = adminCount < 5;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-hover rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Administrateurs</p>
              <p className="text-2xl font-bold text-gradient-gaming">{adminCount}/5</p>
            </div>
            <Shield className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="glass-hover rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Participants</p>
              <p className="text-2xl font-bold text-gradient-gaming">
                {users.filter((u) => u.role === 'PARTICIPANT').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-hover rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Invités</p>
              <p className="text-2xl font-bold text-gradient-gaming">
                {users.filter((u) => u.role === 'GUEST').length}
              </p>
            </div>
            <UsersIcon className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {users.map((user, index) => {
          const badge = getRoleBadge(user.role);
          const isActioning = actioningUserId === user.id && isPending;

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-hover rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold">{getUserDisplayName(user)}</h3>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{user.email}</p>

                  {user.coachedTeams && user.coachedTeams.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-purple-400">Coach de:</p>
                      {user.coachedTeams.map((team) => (
                        <p key={team.id} className="text-xs text-muted-foreground">
                          • {team.name} ({team.tournament.name})
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {user.role !== 'ADMIN' && canAddAdmin && (
                    <motion.button
                      onClick={() => handlePromote(user.id)}
                      disabled={isActioning}
                      whileHover={{ scale: isActioning ? 1 : 1.05 }}
                      whileTap={{ scale: isActioning ? 1 : 0.95 }}
                      className="px-4 py-2 bg-linear-to-r from-red-500 to-pink-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isActioning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowUp className="w-4 h-4" />
                          <span>Promouvoir Admin</span>
                        </>
                      )}
                    </motion.button>
                  )}

                  {user.role === 'ADMIN' && (
                    <motion.button
                      onClick={() => handleDemote(user.id)}
                      disabled={isActioning}
                      whileHover={{ scale: isActioning ? 1 : 1.05 }}
                      whileTap={{ scale: isActioning ? 1 : 0.95 }}
                      className="px-4 py-2 bg-linear-to-r from-gray-500 to-gray-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:shadow-gray-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isActioning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowDown className="w-4 h-4" />
                          <span>Rétrograder</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {!canAddAdmin && (
        <div className="glass-hover rounded-xl p-4 border-2 border-red-500/30">
          <p className="text-sm text-red-400 text-center">
            Limite d&apos;administrateurs atteinte (5 maximum)
          </p>
        </div>
      )}
    </div>
  );
}
