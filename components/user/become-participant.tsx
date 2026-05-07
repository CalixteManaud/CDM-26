'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { UserCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function BecomeParticipant() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/user/become-participant', {
          method: 'POST',
        });

        const json: { success?: boolean; error?: string } = await res.json();

        if (!res.ok || !json.success) {
          toast.error(json.error ?? 'Erreur lors de la mise à jour');
          return;
        }

        toast.success('Vous êtes maintenant un participant! 🎉');
        setIsOpen(false);

        // Refresh the page to update the UI
        setTimeout(() => {
          router.reload();
        }, 1000);
      } catch (error) {
        toast.error('Erreur réseau');
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="group relative overflow-hidden px-6 py-3 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/50 transition-all"
        >
          <div className="absolute inset-0 bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Devenir Participant</span>
          </span>
        </motion.button>
      </AlertDialogTrigger>

      <AlertDialogContent className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-yellow-500/10 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
              </div>
            </div>
          </div>

          <AlertDialogTitle className="text-2xl font-bold text-center text-stone-900 dark:text-white">
            Devenir Participant
          </AlertDialogTitle>

          <AlertDialogDescription className="text-center space-y-4 pt-4">
            <p className="text-stone-600 dark:text-stone-400 text-base">
              En devenant <span className="font-semibold text-purple-600">Participant</span>, vous pourrez:
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2 text-left">
              <div className="flex items-start space-x-2">
                <UserCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-900 dark:text-blue-200">
                  Créer et gérer vos équipes
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <UserCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-900 dark:text-blue-200">
                  Participer aux tournois
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <UserCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-900 dark:text-blue-200">
                  Ajouter des joueurs à vos équipes
                </span>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm font-bold text-red-900 dark:text-red-200 flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span>ATTENTION: Action irréversible</span>
              </p>
              <p className="text-sm text-red-800 dark:text-red-300">
                Une fois que vous devenez Participant, vous ne pourrez <strong>plus revenir</strong> au statut Invité.
              </p>
            </div>

            <p className="text-sm text-stone-500 dark:text-stone-400">
              Êtes-vous sûr de vouloir continuer ?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            disabled={isPending}
            className="font-semibold hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold shadow-lg"
          >
            {isPending ? (
              <span className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>En cours...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4" />
                <span>Oui, devenir Participant</span>
              </span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
