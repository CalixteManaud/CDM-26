'use client';

import { useTransition } from "react";
import { motion } from "framer-motion";
import { UserCheck, ArrowRight, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RoleUpgradeCardProps {
  currentRole: string;
  onUpgradeComplete?: () => void;
}

type UpgradeResponse = {
  success: boolean;
  data?: { role: string };
  error?: string;
};

export function RoleUpgradeCard({
  currentRole,
  onUpgradeComplete,
}: RoleUpgradeCardProps) {
  const [isPending, startTransition] = useTransition();

  if (currentRole !== "GUEST") return null;

  const handleUpgrade = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/users/upgrade-to-participant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        // évite crash si la réponse n'est pas JSON
        let json: UpgradeResponse | null = null;
        try {
          json = (await res.json()) as UpgradeResponse;
        } catch {
          json = null;
        }

        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? "Erreur lors de la mise à niveau");
        }

        toast.success("Mise à niveau effectuée !");
        onUpgradeComplete?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-hover rounded-2xl p-8 border-2 border-purple-500/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Devenir Participant</h3>
              <p className="text-sm text-muted-foreground">Statut actuel: Invité</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-muted-foreground">En tant que participant, vous pourrez :</p>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-purple-400" />
                <span className="text-sm">Rejoindre des équipes</span>
              </li>
              <li className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-purple-400" />
                <span className="text-sm">Participer à des tournois</span>
              </li>
              <li className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-purple-400" />
                <span className="text-sm">Accumuler des statistiques</span>
              </li>
            </ul>
          </div>

          <motion.button
            onClick={handleUpgrade}
            disabled={isPending}
            whileHover={{ scale: isPending ? 1 : 1.02 }}
            whileTap={{ scale: isPending ? 1 : 0.98 }}
            className="w-full py-3 bg-linear-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Mise à niveau...</span>
              </>
            ) : (
              <>
                <span>Devenir participant</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
