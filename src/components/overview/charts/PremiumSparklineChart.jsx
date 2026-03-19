import React from "react";

export default function PremiumSparklineChart({
  samples,
  valueKey,
  maxValue,
  accentColor,
  label,
  unit = "",
  variant = "compact",
}) {
  const size = variant === "compact" ? { W: 320, H: 86 } : { W: 600, H: 160 };
  const W = size.W;
  const H = size.H;

  const PADDING = variant === "compact" ? { top: 10, right: 14, bottom: 20, left: 34 } : { top: 14, right: 16, bottom: 28, left: 44 };
  const chartW = W - PADDING.left - PADDING.right;
  const chartH = H - PADDING.top - PADDING.bottom;

  if (!samples || samples.length < 2) {
    return (
      <div
        className="rounded-xl border border-white/5 bg-black/20 text-muted-foreground/30 text-xs flex items-center justify-center"
        style={{ height: H }}
      >
        Collecting data…
      </div>
    );
  }

  const values = samples.map((s) => s[valueKey] ?? 0);
  const effectiveMax = maxValue > 0 ? maxValue : Math.max(...values, 1);

  const toX = (i) => PADDING.left + (i / (samples.length - 1)) * chartW;
  const toY = (v) => PADDING.top + chartH - (Math.min(v, effectiveMax) / effectiveMax) * chartH;

  const points = samples.map((s, i) => `${toX(i)},${toY(s[valueKey] ?? 0)}`).join(" ");
  const fillPoints = `${PADDING.left},${PADDING.top + chartH} ${points} ${toX(samples.length - 1)},${PADDING.top + chartH}`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: PADDING.top + (1 - frac) * chartH,
    label:
      maxValue > 0
        ? (frac * effectiveMax).toFixed(0) + unit
        : (frac * effectiveMax).toFixed(1) + unit,
  }));

  const gradId = `overview-grad-${label.replace(/\s/g, "")}-${variant}`;

  return (
    <div className="rounded-xl border border-white/5 bg-black/20 overflow-hidden">
      <div className="px-4 pt-3 pb-0 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
        {label}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map(({ y, label: gl }, i) => (
          <g key={i}>
            <line x1={PADDING.left} y1={y} x2={W - PADDING.right} y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1" />
            <text x={PADDING.left - 6} y={y + 3.5} fill="white" fillOpacity="0.3" fontSize="9" textAnchor="end">
              {gl}
            </text>
          </g>
        ))}

        <polygon points={fillPoints} fill={`url(#${gradId})`} />

        <polyline points={points} fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {samples.length > 0 && (() => {
          const last = samples[samples.length - 1];
          const lx = toX(samples.length - 1);
          const ly = toY(last[valueKey] ?? 0);
          return <circle cx={lx} cy={ly} r="3" fill={accentColor} />;
        })()}
      </svg>
    </div>
  );
}

