"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import Image from "next/image";

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  image: string;
}

interface AnimatedTestimonialsProps {
  testimonials: Testimonial[];
  autoplay?: boolean;
  className?: string;
}

export function AnimatedTestimonials({
  testimonials,
  autoplay = true,
  className,
}: AnimatedTestimonialsProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!autoplay) return;

    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoplay, testimonials.length]);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative h-100 w-full overflow-hidden rounded-3xl bg-card border border-border">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 flex flex-col md:flex-row items-center justify-center p-8 md:p-16"
          >
            {/* Image */}
            <div className="relative w-32 h-32 md:w-48 md:h-48 mb-6 md:mb-0 md:mr-12 shrink-0">
              <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-primary/5 rounded-full blur-2xl" />
              <Image
                src={testimonials[active].image}
                alt={testimonials[active].name}
                fill
                className="rounded-full object-cover ring-4 ring-border"
              />
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <Quote className="w-10 h-10 text-primary/20 mb-4 mx-auto md:mx-0" />
              <p className="text-xl md:text-2xl text-foreground/80 font-medium mb-6 leading-relaxed">
                &quot;{testimonials[active].quote}&quot;
              </p>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {testimonials[active].name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {testimonials[active].role}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-4 left-4 flex space-x-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActive(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === active
                  ? "w-8 bg-primary"
                  : "w-1.5 bg-muted-foreground/30"
              )}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
