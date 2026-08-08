'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import {
  Sparkles,
  AlertTriangle,
  Trophy,
  Users,
  Gamepad2,
  Tv,
  Lock,
  Loader2,
  ArrowRight,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BorderBeam } from '@/components/ui/border-beam';
import { ShimmerButton } from '@/components/ui/shimmer-button';

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;

export function BecomeParticipant() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const initialUsername =
    (clerkUser?.publicMetadata?.username as string | undefined) ||
    clerkUser?.username ||
    '';

  const [username, setUsername] = useState(initialUsername);
  const [error, setError] = useState<string | null>(null);

  const validate = (value: string): string | null => {
    const v = value.trim();
    if (v.length === 0) return 'Choisis un pseudo de joueur';
    if (v.length < 3 || v.length > 20) return '3 à 20 caractères';
    if (!USERNAME_RE.test(v)) return 'Lettres, chiffres, tirets et underscores uniquement';
    return null;
  };

  const handleConfirm = () => {
    const validationError = validate(username);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/user/become-participant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim() }),
        });

        const json: { success?: boolean; error?: string } = await res.json();

        if (!res.ok || !json.success) {
          toast.error(json.error ?? 'Erreur lors de la mise à jour');
          return;
        }

        toast.success('Bienvenue dans la compétition 🏆');
        setIsOpen(false);

        setTimeout(() => router.reload(), 800);
      } catch {
        toast.error('Erreur réseau');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="group relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/85 border border-black/40 text-white font-black text-xs uppercase tracking-[0.18em] shadow-lg shadow-black/40 hover:bg-black transition-colors"
        >
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>Devenir Joueur</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </motion.button>
      </DialogTrigger>

      <DialogContent className="p-0 max-w-lg max-h-[92dvh] overflow-y-auto overflow-x-hidden bg-black border-white/10 text-white gap-0">
        <BorderBeam size={160} duration={9} colorFrom="#10b981" colorTo="#facc15" borderWidth={1.2} />

        {/* HEADER avec mesh CDM */}
        <div className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-mesh-cdm opacity-30 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="relative px-7 pt-8 pb-6">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 mb-4">
              <Trophy className="w-3 h-3 text-emerald-300" />
              <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-[0.22em]">
                Mode joueur
              </span>
            </div>
            <DialogHeader className="space-y-3 text-left">
              <DialogTitle className="text-3xl md:text-4xl font-black leading-[0.95] tracking-tight">
                Rejoins la <span className="text-gradient-worldcup">compétition.</span>
              </DialogTitle>
              <DialogDescription className="text-sm text-white/60 leading-relaxed">
                En passant <strong className="text-white">Joueur</strong>, tu peux intégrer une nation et
                disputer la CDM 26. Choisis bien ton pseudo — c&apos;est celui qui sera affiché sur
                tes matchs et tes stats.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* BODY */}
        <div className="px-7 py-6 space-y-6">
          {/* Pseudo input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="player-username"
                className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/65 flex items-center gap-1.5"
              >
                <Gamepad2 className="w-3 h-3 text-emerald-400" />
                Ton pseudo de joueur
              </Label>
              <span className="text-[10px] font-mono text-white/35 uppercase tracking-[0.22em]">
                {username.trim().length}/20
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono text-sm select-none pointer-events-none">
                @
              </span>
              <Input
                id="player-username"
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="ton_pseudo_de_jeu"
                pattern="[a-zA-Z0-9_-]+"
                minLength={3}
                maxLength={20}
                className="pl-8 h-12 text-base bg-black/40 border-white/10 focus:border-emerald-500/60 text-white font-medium"
              />
            </div>
            {error ? (
              <p className="text-[11px] text-red-400 flex items-center gap-1.5 font-mono uppercase tracking-[0.18em]">
                <AlertTriangle className="w-3 h-3" /> {error}
              </p>
            ) : (
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.22em]">
                3 à 20 caractères · lettres / chiffres / - / _
              </p>
            )}

            {/* Note Twitch — distinction claire */}
            <div className="mt-3 rounded-lg bg-purple-500/[0.06] border border-purple-500/20 px-3.5 py-2.5 flex items-start gap-2.5">
              <Tv className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-white/65 leading-relaxed">
                <strong className="text-purple-300">Indépendant de Twitch.</strong> Ton compte
                Twitch reste utilisé uniquement pour les paris (débit/crédit des points de chaîne
                via Wizebot). Ici c&apos;est ton pseudo affiché en tant que joueur.
              </p>
            </div>
          </div>

          {/* Liste avantages */}
          <div className="rounded-xl bg-white/[0.02] border border-white/10 divide-y divide-white/5">
            <PerkRow icon={Users} text="Rejoindre une nation et intégrer son effectif" />
            <PerkRow icon={Trophy} text="Disputer les matchs officiels CDM 26" />
            <PerkRow icon={Pencil} text="Apparaître au classement des buteurs et MVPs" />
          </div>

          {/* Warning irréversible */}
          <div className="relative rounded-lg bg-red-500/[0.05] border border-red-500/25 px-4 py-3 flex items-start gap-3">
            <div className="shrink-0 w-7 h-7 rounded-md bg-red-500/15 border border-red-500/30 flex items-center justify-center mt-0.5">
              <Lock className="w-3.5 h-3.5 text-red-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-red-300 font-bold mb-1">
                Action irréversible
              </div>
              <p className="text-[11px] text-white/65 leading-relaxed">
                Une fois Joueur, tu ne pourras plus revenir au statut Invité. Tu pourras toujours
                modifier ton pseudo plus tard depuis ton profil.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="px-7 pb-7 pt-2 gap-3 sm:gap-2 flex-col-reverse sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
            className="bg-transparent border-white/15 text-white/75 hover:bg-white/5 hover:text-white font-mono uppercase tracking-[0.18em] text-[11px] h-11"
          >
            Annuler
          </Button>
          <ShimmerButton
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            shimmerColor="#fbbf24"
            background="linear-gradient(110deg, #059669 0%, #ca8a04 50%, #dc2626 100%)"
            className="flex-1 px-5 h-11 font-black uppercase tracking-[0.18em] text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                En cours…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Confirmer et rejoindre
              </>
            )}
          </ShimmerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PerkRow({
  icon: Icon,
  text,
}: {
  icon: typeof Trophy;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="shrink-0 w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-emerald-300" />
      </div>
      <span className="text-[12.5px] text-white/80 leading-snug">{text}</span>
    </div>
  );
}
