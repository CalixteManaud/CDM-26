'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Coffee, Users, Trophy, Sparkles, ExternalLink, Star, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup, AvatarGroupTooltip } from '@/components/ui/shadcn-io/avatar-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Admin {
  id: string;
  name: string;
  avatar: string | null;
}

interface ThankYouModalProps {
  /**
   * Afficher le modal ou non
   */
  isOpen: boolean;
  /**
   * Callback quand le modal se ferme
   */
  onClose: () => void;
  /**
   * Liste des administrateurs
   */
  admins: Admin[];
}

export function ThankYouModal({ isOpen, onClose, admins }: ThankYouModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hideThankYouModal', 'true');
      localStorage.setItem('hideThankYouModalDate', new Date().toISOString());
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop with animated gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-linear-to-br from-blue-900/40 via-purple-900/40 to-pink-900/40 backdrop-blur-xl"
          >
            {/* Animated orbs in background */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.5, 0.3, 0.5],
              }}
              transition={{ duration: 8, repeat: Infinity, delay: 1 }}
            />
          </motion.div>

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-4xl bg-background/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Gradient overlay at top */}
            <div className="absolute top-0 left-0 right-0 h-64 bg-linear-to-b from-blue-500/10 via-purple-500/5 to-transparent pointer-events-none" />

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ delay: 0.3 }}
              onClick={handleClose}
              className="absolute top-6 right-6 z-10 p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-110"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </motion.button>

            <div className="relative p-8 md:p-12">
              {/* Header avec animation */}
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1
                  }}
                  className="inline-flex items-center justify-center mb-6"
                >
                  <div className="relative">
                    {/* Pulsing rings */}
                    <motion.div
                      className="absolute inset-0 rounded-full bg-linear-to-r from-blue-500 to-purple-500"
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-linear-to-r from-purple-500 to-pink-500"
                      animate={{
                        scale: [1, 1.6, 1],
                        opacity: [0.3, 0, 0.3],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                    />

                    {/* Main icon */}
                    <div className="relative bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 p-6 rounded-full">
                      <Trophy className="w-12 h-12 text-white" />
                    </div>

                    {/* Floating sparkles */}
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute"
                        style={{
                          top: `${i * 30 - 15}%`,
                          right: `${i * 25 - 20}%`,
                        }}
                        animate={{
                          y: [-10, 10, -10],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.4,
                        }}
                      >
                        <Sparkles className="w-6 h-6 text-yellow-400" />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Badge variant="secondary" className="mb-4 text-xs font-medium px-3 py-1">
                    <Zap className="w-3 h-3 mr-1.5" />
                    Communauté CAN 2026
                  </Badge>

                  <h2 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
                    Merci d&apos;être là !
                  </h2>

                  <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Votre passion et votre soutien font de chaque tournoi un moment exceptionnel
                  </p>
                </motion.div>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-2 gap-4 mb-12">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />

                  <div className="relative">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-blue-500/20">
                        <Trophy className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="font-bold text-lg">Spectateurs Passionnés</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Votre présence et votre enthousiasme transforment chaque match en un moment inoubliable
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />

                  <div className="relative">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-purple-500/20">
                        <Users className="w-6 h-6 text-purple-400" />
                      </div>
                      <h3 className="font-bold text-lg">Rejoignez-nous</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Devenez acteur de la compétition et participez aux prochains tournois
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full group/btn"
                      onClick={() => window.location.href = '/sign-up'}
                    >
                      <span>S&apos;inscrire</span>
                      <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </motion.div>
              </div>

              {/* Section Admins */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-12 relative overflow-hidden rounded-3xl bg-linear-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 p-8"
              >
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />

                <div className="relative">
                  <div className="flex items-center justify-center mb-6">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-500">
                      <Star className="w-3 h-3 mr-1.5 fill-amber-500" />
                      L&apos;Équipe
                    </Badge>
                  </div>

                  <h3 className="text-2xl font-bold text-center mb-6 bg-linear-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    Rencontrez nos Administrateurs
                  </h3>

                  {admins.length > 0 ? (
                    <div className="flex justify-center mb-6">
                      <AvatarGroup variant="css">
                        {admins.map((admin) => (
                          <motion.div
                            key={admin.id}
                            whileHover={{ scale: 1.1, y: -5 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            <Avatar className="w-16 h-16 border-4 border-background shadow-xl ring-2 ring-amber-500/30">
                              <AvatarImage src={admin.avatar || undefined} alt={admin.name} />
                              <AvatarFallback className="bg-linear-to-br from-amber-500 via-orange-500 to-red-500 text-white font-bold text-xl">
                                {admin.name.charAt(0)}
                              </AvatarFallback>
                              <AvatarGroupTooltip>{admin.name}</AvatarGroupTooltip>
                            </Avatar>
                          </motion.div>
                        ))}
                      </AvatarGroup>
                    </div>
                  ) : (
                    <div className="flex justify-center mb-6">
                      <div className="text-center text-muted-foreground">
                        Chargement des administrateurs...
                      </div>
                    </div>
                  )}

                  <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
                    Une équipe passionnée qui travaille sans relâche pour vous offrir la meilleure expérience de tournoi
                  </p>
                </div>
              </motion.div>

              {/* Section Don */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="relative overflow-hidden rounded-3xl bg-linear-to-br from-pink-500/10 via-rose-500/5 to-transparent border border-pink-500/20 p-8"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-pink-500/5 to-transparent" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />

                <div className="relative">
                  <div className="text-center mb-8">
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      className="inline-block mb-4"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-linear-to-r from-pink-500 to-rose-500 rounded-full blur-xl opacity-50" />
                        <div className="relative bg-linear-to-br from-pink-500 to-rose-500 p-4 rounded-2xl">
                          <Coffee className="w-10 h-10 text-white" />
                        </div>
                      </div>
                    </motion.div>

                    <h3 className="text-2xl font-bold mb-3 bg-linear-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                      Soutenez notre Mission
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Chaque contribution nous aide à créer des expériences extraordinaires et à faire grandir notre communauté
                    </p>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="default"
                      size="lg"
                      className="w-full bg-linear-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold shadow-lg shadow-pink-500/50 group"
                      onClick={() => window.open('https://ko-fi.com/warthoz', '_blank')}
                    >
                      <Heart className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      <span>Offrir un café sur Ko-fi</span>
                      <ExternalLink className="w-4 h-4 ml-2 opacity-70" />
                    </Button>
                  </motion.div>

                  <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span>Même 1€ fait une énorme différence</span>
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </div>
                </div>
              </motion.div>

              {/* Option "Ne plus afficher" */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center"
              >
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-white/20 bg-transparent text-primary transition-all focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 checked:bg-primary checked:border-primary"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Ne plus afficher pendant 7 jours
                  </span>
                </label>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook pour gérer l'affichage du modal de remerciement
 * Affiche le modal une fois par session ou après 7 jours si "Ne plus afficher" a été coché
 */
export function useThankYouModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);

  useEffect(() => {
    // Charger les administrateurs depuis l'API
    const fetchAdmins = async () => {
      try {
        const response = await fetch('/api/admin/list');
        if (response.ok) {
          const data = await response.json();
          setAdmins(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des admins:', error);
      }
    };

    fetchAdmins();

    // Vérifier si l'utilisateur a demandé à ne plus voir le modal
    const hideModal = localStorage.getItem('hideThankYouModal');
    const hideDate = localStorage.getItem('hideThankYouModalDate');

    if (hideModal === 'true' && hideDate) {
      const daysSinceHidden = Math.floor(
        (Date.now() - new Date(hideDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Si plus de 7 jours, réafficher
      if (daysSinceHidden >= 7) {
        localStorage.removeItem('hideThankYouModal');
        localStorage.removeItem('hideThankYouModalDate');
      } else {
        return; // Ne pas afficher
      }
    }

    // Vérifier si déjà affiché pendant cette session
    const shownThisSession = sessionStorage.getItem('thankYouModalShown');

    if (!shownThisSession) {
      // Afficher après 10 secondes de présence sur le site
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem('thankYouModalShown', 'true');
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, []);

  return {
    isOpen,
    admins,
    openModal: () => setIsOpen(true),
    closeModal: () => setIsOpen(false),
  };
}
