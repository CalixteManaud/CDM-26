'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  X,
  Trash2,
  Loader2,
  ArrowRight,
  Coins,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useBetSlip } from '@/lib/contexts/bet-slip-context';

const PRESETS = [100, 500, 1000, 5000];

export function BetSlipPanel() {
  const { legs, combinedOdds, removeLeg, clear } = useBetSlip();
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState('500');
  const [submitting, setSubmitting] = useState(false);

  if (legs.length === 0) return null;

  const stakeNum = Number.parseInt(stake, 10);
  const potentialPayout =
    Number.isFinite(stakeNum) && stakeNum > 0 ? Math.floor(stakeNum * combinedOdds) : 0;
  const profit = potentialPayout - (Number.isFinite(stakeNum) ? stakeNum : 0);
  const canSubmit = legs.length >= 2 && Number.isFinite(stakeNum) && stakeNum >= 50;

  const onSubmit = async () => {
    if (!isSignedIn) {
      toast.info('Connecte-toi pour parier');
      return;
    }
    if (!canSubmit) {
      toast.error(
        legs.length < 2
          ? 'Un combiné nécessite au moins 2 paris'
          : 'Mise invalide (min 50 pts)'
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/markets/slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: legs.map((l) => ({ marketId: l.marketId, outcomeKey: l.outcomeKey })),
          totalStake: stakeNum,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur');
        return;
      }
      toast.success(`Combiné placé : ×${combinedOdds.toFixed(2)} pour ${potentialPayout.toLocaleString('fr-FR')} pts potentiels`);
      clear();
      setOpen(false);
      router.replace(router.asPath, undefined, { scroll: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button (always visible if legs > 0) */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 px-5 py-4 rounded-2xl bg-linear-to-r from-emerald-600 via-yellow-500 to-red-600 shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all"
          >
            <div className="relative">
              <Layers className="w-5 h-5 text-white" />
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center ring-2 ring-yellow-400 tabular-nums">
                {legs.length}
              </span>
            </div>
            <div className="flex flex-col items-start leading-tight text-white">
              <span className="text-xs font-mono uppercase tracking-[0.22em] opacity-80">/ combiné</span>
              <span className="text-sm font-black">×{combinedOdds.toFixed(2)}</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-black border-l border-white/15 flex flex-col text-white"
            >
              <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-yellow-300" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-base font-black tracking-tight">Mon combiné</span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 mt-0.5">
                      / {legs.length} pari{legs.length > 1 ? 's' : ''} · ×{combinedOdds.toFixed(2)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-white/65 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {legs.map((leg) => (
                  <div
                    key={leg.marketId}
                    className="rounded-xl border border-white/10 bg-white/2 p-3 hover:bg-white/4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                          {leg.marketLabel}
                        </div>
                        <div className="text-sm font-black text-white tracking-tight mt-0.5 truncate">
                          {leg.outcomeLabel}
                        </div>
                        {leg.context && (
                          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35 mt-1 truncate">
                            {leg.context}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-base font-black text-yellow-300 tabular-nums">
                          ×{leg.odds.toFixed(2)}
                        </span>
                        <button
                          title="Retirer ce pari du combiné"
                          onClick={() => removeLeg(leg.marketId)}
                          className="text-white/40 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {legs.length === 1 && (
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 text-center">
                    <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-yellow-300">
                      / ajoute au moins 1 pari supplémentaire pour combiner
                    </span>
                  </div>
                )}
              </div>

              <footer className="border-t border-white/10 p-4 space-y-3 bg-white/2">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45 font-bold flex items-center gap-1.5">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    Mise totale
                  </label>
                  <Input
                    type="number"
                    min={50}
                    step={50}
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    className="font-mono text-base font-black bg-white/5 border-white/15 mt-2"
                  />
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStake(String(preset))}
                        className="px-3 py-1.5 rounded border border-white/10 text-[11px] font-mono uppercase tracking-[0.22em] text-white/65 hover:border-yellow-400/30 hover:text-yellow-300"
                      >
                        {preset.toLocaleString('fr-FR')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                      Cote combinée
                    </div>
                    <div className="text-2xl font-black text-yellow-300 tabular-nums">
                      ×{combinedOdds.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">
                      Bénéfice potentiel
                    </div>
                    <div
                      className={cn(
                        'text-2xl font-black tabular-nums',
                        profit > 0 ? 'text-emerald-300' : 'text-white/40'
                      )}
                    >
                      +{Math.max(0, profit).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    onClick={clear}
                    className="text-white/50 hover:text-red-400 hover:bg-red-500/10 text-[11px] font-mono uppercase tracking-[0.22em]"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Vider
                  </Button>
                  <ShimmerButton
                    onClick={onSubmit}
                    disabled={submitting || !canSubmit}
                    background="linear-gradient(110deg, #16a34a 0%, #facc15 50%, #dc2626 100%)"
                    shimmerColor="#ffffff"
                    className="px-5 py-3 font-black uppercase tracking-[0.18em] text-[11px] disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                        Valider {Number.isFinite(stakeNum) ? stakeNum.toLocaleString('fr-FR') : 0} pts
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </>
                    )}
                  </ShimmerButton>
                </div>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
