"use client";

import { cn } from "@/lib/utils";

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
}

export function Card3D({ children, className }: Card3DProps) {
  return (
    <div className={cn("relative group", className)}>
      {children}
    </div>
  );
}
