'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { NumberTicker } from '@/components/ui/number-ticker';

/* ------------------------------------------------------------------ *
 * useMeasure — largeur du conteneur en px (hover précis + rendu net). *
 * ------------------------------------------------------------------ */
function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

const fmt = (n: number) => n.toLocaleString('fr-FR');

/* ================================================================== *
 * KpiTile — chiffre héros. Sparkline mono-teinte optionnelle.         *
 * ================================================================== */
type KpiAccent = 'emerald' | 'yellow' | 'red' | 'purple' | 'blue';
const KPI_STROKE: Record<KpiAccent, string> = {
  emerald: '#34d399',
  yellow: '#fbbf24',
  red: '#f87171',
  purple: '#a78bfa',
  blue: '#60a5fa',
};
const KPI_TEXT: Record<KpiAccent, string> = {
  emerald: 'text-emerald-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
  blue: 'text-blue-400',
};

export function KpiTile({
  code,
  label,
  value,
  unit,
  spark,
  icon,
  accent = 'emerald',
}: {
  code: string;
  label: string;
  value: number;
  unit?: string;
  spark?: number[];
  icon?: ReactNode;
  accent?: KpiAccent;
}) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
          {icon}
          {code}
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} stroke={KPI_STROKE[accent]} />}
      </div>
      <div className="mt-4">
        <div className={cn('text-3xl font-black leading-none tracking-tight tabular-nums md:text-4xl', KPI_TEXT[accent])}>
          <NumberTicker value={value} />
          {unit && <span className="ml-1 text-sm font-bold text-white/30">{unit}</span>}
        </div>
        <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">{label}</div>
      </div>
    </div>
  );
}

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const w = 64;
  const h = 24;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / span) * h]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={stroke} />
    </svg>
  );
}

/* ================================================================== *
 * AreaTrend — série unique dans le temps (magnitude → 1 teinte).      *
 * Grille discrète, crosshair + tooltip au survol.                     *
 * ================================================================== */
export function AreaTrend({
  data,
  height = 200,
  stroke = '#34d399',
  valueSuffix = '',
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  stroke?: string;
  valueSuffix?: string;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;

  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const xAt = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - (v / max) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d.value).toFixed(1)}`).join(' ');
  const areaPath =
    width > 0
      ? `${linePath} L${xAt(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${xAt(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`
      : '';

  // 3 lignes de grille horizontales
  const gridVals = [0.25, 0.5, 0.75, 1].map((f) => f * max);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (width === 0 || n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - padL;
    const i = Math.round((x / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const gid = `area-grad-${stroke.replace('#', '')}`;

  return (
    <div ref={ref} className="relative w-full select-none">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Évolution dans le temps"
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>

          {gridVals.map((v, i) => (
            <line
              key={i}
              x1={padL}
              x2={width - padR}
              y1={yAt(v)}
              y2={yAt(v)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          ))}

          <path d={areaPath} fill={`url(#${gid})`} />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* étiquettes x — premières / dernières + hover */}
          {n > 0 && (
            <>
              <text x={padL} y={height - 8} className="fill-white/35" style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>
                {data[0].label}
              </text>
              <text
                x={width - padR}
                y={height - 8}
                textAnchor="end"
                className="fill-white/35"
                style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
              >
                {data[n - 1].label}
              </text>
            </>
          )}

          {hover != null && (
            <>
              <line x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={padT + innerH} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
              <circle cx={xAt(hover)} cy={yAt(data[hover].value)} r={4} fill={stroke} stroke="#000" strokeWidth={2} />
            </>
          )}
        </svg>
      )}

      {hover != null && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-white/15 bg-black/90 px-2.5 py-1.5 text-center shadow-xl"
          style={{ left: xAt(hover), top: yAt(data[hover].value) - 8 }}
        >
          <div className="text-sm font-black tabular-nums text-white">
            {fmt(data[hover].value)}
            {valueSuffix}
          </div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">{data[hover].label}</div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== *
 * BarBreakdown — barres horizontales labellisées, 1 teinte.           *
 * Job = magnitude ⇒ pas de couleur par catégorie (labels portent      *
 * l'identité). Tooltip au survol.                                     *
 * ================================================================== */
export function BarBreakdown({
  data,
  fill = '#fbbf24',
  valueSuffix = '',
}: {
  data: Array<{ label: string; value: number; hint?: string }>;
  fill?: string;
  valueSuffix?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="group">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-[12px] font-medium text-white/80">{d.label}</span>
              <span className="shrink-0 font-mono text-[12px] font-bold tabular-nums text-white/60">
                {fmt(d.value)}
                {valueSuffix}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                style={{ width: `${Math.max(2, pct)}%`, background: fill, opacity: 0.85 }}
                title={d.hint ?? `${fmt(d.value)}${valueSuffix}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Bloc-carte pour héberger un chart avec titre (le titre nomme la série). */
export function ChartCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-white">{title}</h3>
          {subtitle && <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.2em] text-white/40">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
