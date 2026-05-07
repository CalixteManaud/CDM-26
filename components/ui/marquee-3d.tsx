"use client";

import { cn } from "@/lib/utils";
import Marquee from "./marquee";

interface Marquee3DProps {
  className?: string;
  innerClassName?: string;
  pauseOnHover?: boolean;
  reverse?: boolean;
  fade?: boolean;
  direction?: "up" | "down" | "left" | "right";
  children: React.ReactNode;
}

export default function Marquee3D({
  className,
  innerClassName,
  pauseOnHover = false,
  reverse = false,
  fade = false,
  direction = "up",
  children,
}: Marquee3DProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden",
        "perspective-near transform-3d",
        className
      )}
    >
      <Marquee
        pauseOnHover={pauseOnHover}
        reverse={reverse}
        vertical={direction === "up" || direction === "down"}
        className={cn(
          "[--gap:1rem] transform-[rotateX(55deg)_rotateZ(-45deg)]",
          "mask-[linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]",
          innerClassName
        )}
      >
        {children}
      </Marquee>
      {fade && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-background"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-linear-to-l from-background"></div>
        </>
      )}
      <div className="pointer-events-none absolute inset-0 bg-grid-white/[0.02]" />
    </div>
  );
}
