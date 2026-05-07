'use client';

import { motion } from 'framer-motion';

const BALLS = [
  { left: '8%', top: '18%', size: 56, delay: 0, duration: 7 },
  { left: '82%', top: '12%', size: 40, delay: 1.4, duration: 9 },
  { left: '15%', top: '70%', size: 72, delay: 0.6, duration: 8 },
  { left: '70%', top: '78%', size: 48, delay: 2.1, duration: 10 },
  { left: '50%', top: '40%', size: 32, delay: 0.9, duration: 6 },
  { left: '35%', top: '88%', size: 28, delay: 1.8, duration: 11 },
  { left: '92%', top: '55%', size: 36, delay: 0.3, duration: 9 },
];

function SoccerBall({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
    >
      <defs>
        <radialGradient id="ballHighlight" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#f4f4f5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a1a1aa" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#ballHighlight)" stroke="#27272a" strokeWidth="1.5" />
      <polygon points="32,16 40,22 37,32 27,32 24,22" fill="#18181b" />
      <polygon points="14,30 22,24 24,32 18,38" fill="#18181b" />
      <polygon points="50,30 42,24 40,32 46,38" fill="#18181b" />
      <polygon points="22,46 28,42 32,46 30,52" fill="#18181b" />
      <polygon points="42,46 36,42 32,46 34,52" fill="#18181b" />
    </svg>
  );
}

export function FloatingBalls() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {BALLS.map((ball, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: ball.left, top: ball.top }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: 0.55,
            scale: 1,
            y: [0, -22, 0],
            rotate: [0, 12, -8, 0],
          }}
          transition={{
            opacity: { duration: 1, delay: ball.delay * 0.3 },
            scale: { duration: 1, delay: ball.delay * 0.3 },
            y: { duration: ball.duration, repeat: Infinity, ease: 'easeInOut', delay: ball.delay },
            rotate: { duration: ball.duration * 1.4, repeat: Infinity, ease: 'easeInOut', delay: ball.delay },
          }}
        >
          <SoccerBall size={ball.size} />
        </motion.div>
      ))}
    </div>
  );
}
