"use client";

import { cn } from "@/lib/utils";
import Marquee from "./marquee";
import Image from "next/image";

interface ThreeDMarqueeProps {
  images: string[];
  className?: string;
  pauseOnHover?: boolean;
  reverse?: boolean;
}

export function ThreeDMarquee({
  images,
  className,
  pauseOnHover = false,
  reverse = false,
}: ThreeDMarqueeProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className
      )}
    >
      <Marquee
        pauseOnHover={pauseOnHover}
        reverse={reverse}
        className="[--gap:1.5rem]"
      >
        {images.map((image, idx) => (
          <div
            key={idx}
            className="relative h-32 w-48 shrink-0 overflow-hidden rounded-xl border border-foreground/5 bg-card/30 shadow-lg mx-3"
          >
            <Image
              src={image}
              alt={`Marquee image ${idx + 1}`}
              fill
              className="object-cover opacity-40"
            />
          </div>
        ))}
      </Marquee>

      {/* Fade effect */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-background"></div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-linear-to-l from-background"></div>
    </div>
  );
}
