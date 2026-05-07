"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation, useInView, cubicBezier } from "framer-motion";
import { cn } from "@/lib/utils";

interface AppleHelloEffectProps {
  text: string;
  className?: string;
}

export function AppleHelloEffect({ text, className }: AppleHelloEffectProps) {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  const words = text.split(" ");

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const child = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: cubicBezier(0.25, 0.4, 0.25, 1),
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={cn("overflow-hidden", className)}
      variants={container}
      initial="hidden"
      animate={controls}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={child}
          className="inline-block mr-2 md:mr-4"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
