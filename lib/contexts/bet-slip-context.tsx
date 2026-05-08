'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'cdm26.betSlip.v1';

export type SlipLeg = {
  marketId: string;
  outcomeKey: string;
  marketType: string;
  marketLabel: string;
  outcomeLabel: string;
  odds: number;
  context?: string; // ex "France vs Maroc" ou "Tournoi CDM 26"
};

type BetSlipContextValue = {
  legs: SlipLeg[];
  combinedOdds: number;
  addLeg: (leg: SlipLeg) => void;
  removeLeg: (marketId: string) => void;
  clear: () => void;
  hasLeg: (marketId: string) => boolean;
};

const Ctx = createContext<BetSlipContextValue | null>(null);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [legs, setLegs] = useState<SlipLeg[]>([]);

  // Restore from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLegs(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legs));
    } catch {
      // ignore
    }
  }, [legs]);

  const addLeg = useCallback((leg: SlipLeg) => {
    setLegs((prev) => {
      const filtered = prev.filter((l) => l.marketId !== leg.marketId);
      return [...filtered, leg];
    });
  }, []);

  const removeLeg = useCallback((marketId: string) => {
    setLegs((prev) => prev.filter((l) => l.marketId !== marketId));
  }, []);

  const clear = useCallback(() => setLegs([]), []);
  const hasLeg = useCallback(
    (marketId: string) => legs.some((l) => l.marketId === marketId),
    [legs]
  );

  const combinedOdds = useMemo(
    () => legs.reduce((acc, l) => acc * l.odds, 1),
    [legs]
  );

  return (
    <Ctx.Provider value={{ legs, combinedOdds, addLeg, removeLeg, clear, hasLeg }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBetSlip() {
  const v = useContext(Ctx);
  if (!v) {
    // Fail soft : avant que le provider ne soit monté côté client
    return {
      legs: [] as SlipLeg[],
      combinedOdds: 1,
      addLeg: () => {},
      removeLeg: () => {},
      clear: () => {},
      hasLeg: () => false,
    };
  }
  return v;
}
