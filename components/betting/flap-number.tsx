'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

/** Une cellule à clapet : un chiffre ambre enchâssé qui « roule » vers sa valeur. */
function FlapChar({
  char,
  index,
  animate,
  cellClassName,
}: {
  char: string;
  index: number;
  animate: boolean;
  cellClassName?: string;
}) {
  const isDigit = /[0-9]/.test(char);
  const [display, setDisplay] = useState(() => (animate && isDigit ? '0' : char));

  useEffect(() => {
    if (!animate || !isDigit) {
      setDisplay(char);
      return;
    }
    let frame = 0;
    const rolls = 3 + index; // cascade légère : les cellules de droite s'arrêtent après
    const id = window.setInterval(() => {
      frame += 1;
      if (frame >= rolls) {
        setDisplay(char);
        window.clearInterval(id);
      } else {
        setDisplay(String(Math.floor(Math.random() * 10)));
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [char, index, animate, isDigit]);

  if (!isDigit) {
    return (
      <span className="ff-board inline-grid place-items-center w-[0.4em] text-[var(--tote-amber)] [text-shadow:0_0_8px_rgba(251,191,36,.4)]">
        {char}
      </span>
    );
  }

  return (
    <span className={cn('flap-cell ff-board h-[1.5em] w-[1.04em] font-bold leading-none', cellClassName)}>
      {display}
    </span>
  );
}

/**
 * Affiche une chaîne (cotes, gains…) en cellules à clapet ambre. Les chiffres
 * roulent vers leur valeur au montage et à chaque changement de `value` — l'effet
 * « tableau de cotes » qui se rafraîchit. Respecte prefers-reduced-motion.
 */
export function FlapNumber({
  value,
  className,
  cellClassName,
  animate = true,
}: {
  value: string;
  className?: string;
  cellClassName?: string;
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  const on = animate && !reduce;
  return (
    <span className={cn('inline-flex items-stretch gap-[2px]', className)}>
      {value.split('').map((c, i) => (
        <FlapChar key={`${i}-${c}`} char={c} index={i} animate={on} cellClassName={cellClassName} />
      ))}
    </span>
  );
}
