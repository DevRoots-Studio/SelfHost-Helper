import React from "react";

export default function MiniSparkline({ samples, valueKey, maxValue, color }) {
  if (!samples || samples.length < 3) return null;

  const W = 72;
  const H = 20;
  const recent = samples.slice(-30);
  const effectiveMax = maxValue > 0 ? maxValue : Math.max(...recent.map((s) => s[valueKey] ?? 0), 1);

  const pts = recent
    .map((s, i) => {
      const x = (i / (recent.length - 1)) * W;
      const y = H - ((s[valueKey] ?? 0) / effectiveMax) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={W} height={H} className="opacity-50 shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

