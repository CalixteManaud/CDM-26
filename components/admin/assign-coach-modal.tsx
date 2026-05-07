'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  users: User[];
  currentCoachId?: string | null;
  onSuccess?: () => void;
}

export function AssignCoachModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  users,
  currentCoachId,
  onSuccess,
}: AssignCoachModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentCoachId ?? null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssign = () => {
    if (!selectedUserId) {
      toast.error('Veuillez sélectionner un utilisateur');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/assign-team-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId, coachUserId: selectedUserId }),
        });

        const json: { success?: boolean; error?: string } = await res.json();

        if (!res.ok || !json.success) {
          toast.error(json.error ?? 'Erreur lors de l\'assignation');
          return;
        }

        toast.success('Coach assigné avec succès');
        onSuccess?.();
        onClose();
      } catch (error) {
        toast.error('Erreur réseau');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl glass rounded-2xl p-8 max-h-[80vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gradient-gaming">Assigner un coach</h2>
              <p className="text-muted-foreground mt-1">Équipe: {teamName}</p>
            </div>
            <button
              title='Fermer'
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 glass rounded-lg border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-6">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                whileHover={{ x: 4 }}
                onClick={() => setSelectedUserId(user.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  selectedUserId === user.id
                    ? 'bg-linear-to-r from-blue-500/20 to-purple-500/20 border-2 border-purple-500'
                    : 'glass-hover border-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.role === 'ADMIN'
                          ? 'bg-linear-to-r from-red-500 to-pink-600'
                          : user.role === 'PARTICIPANT'
                          ? 'bg-linear-to-r from-blue-500 to-purple-600'
                          : 'bg-linear-to-r from-gray-500 to-gray-600'
                      }`}
                    >
                      <span className="text-white font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        user.role === 'ADMIN'
                          ? 'bg-red-500/20 text-red-400'
                          : user.role === 'PARTICIPANT'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {user.role}
                    </span>
                    {selectedUserId === user.id && (
                      <UserCheck className="w-5 h-5 text-purple-400" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>
            <motion.button
              onClick={handleAssign}
              disabled={!selectedUserId || isPending}
              whileHover={{ scale: !selectedUserId || isPending ? 1 : 1.02 }}
              whileTap={{ scale: !selectedUserId || isPending ? 1 : 0.98 }}
              className="px-6 py-3 bg-linear-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Assignation...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  <span>Assigner</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
