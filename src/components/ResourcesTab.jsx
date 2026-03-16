import React, { useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Activity } from "lucide-react";
import { statsAtom, resourceHistoryAtom } from "@/store/atoms";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatMemory(bytes) {
  if (!bytes || bytes === 0) return "0 MB";
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatUptime(ms) {
  if (!ms || ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    toast.success(`Copied PID ${text}`);
  } catch {
    toast.error("Failed to copy");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG sparkline chart
// ─────────────────────────────────────────────────────────────────────────────

function SparklineChart({ samples, valueKey, maxValue, accentColor, label, unit = "" }) {
  const W = 600;
  const H = 160;
  const PADDING = { top: 14, right: 16, bottom: 28, left: 44 };
  const chartW = W - PADDING.left - PADDING.right;
  const chartH = H - PADDING.top - PADDING.bottom;

  if (!samples || samples.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-white/5 bg-black/20 text-muted-foreground/30 text-xs"
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

  // Grid lines (4 horizontal)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: PADDING.top + (1 - frac) * chartH,
    label:
      maxValue > 0
        ? (frac * effectiveMax).toFixed(0) + unit
        : (frac * effectiveMax).toFixed(1) + unit,
  }));

  const gradId = `grad-${label.replace(/\s/g, "")}`;

  return (
    <div className="rounded-xl border border-white/5 bg-black/20 overflow-hidden">
      <div className="px-4 pt-3 pb-0 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
        {label}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: H }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map(({ y, label: gl }, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              y1={y}
              x2={W - PADDING.right}
              y2={y}
              stroke="white"
              strokeOpacity="0.05"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 6}
              y={y + 3.5}
              fill="white"
              fillOpacity="0.3"
              fontSize="9"
              textAnchor="end"
            >
              {gl}
            </text>
          </g>
        ))}

        {/* Fill area */}
        <polygon points={fillPoints} fill={`url(#${gradId})`} />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Latest value dot */}
        {samples.length > 0 &&
          (() => {
            const last = samples[samples.length - 1];
            const lx = toX(samples.length - 1);
            const ly = toY(last[valueKey] ?? 0);
            return <circle cx={lx} cy={ly} r="3" fill={accentColor} />;
          })()}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, subtitle, accent }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/3 px-5 py-4 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className={cn("w-2 h-2 rounded-full shrink-0", accent)} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-semibold">
          {label}
        </span>
      </div>
      <div className="text-2xl font-mono font-bold tracking-tight text-foreground truncate">
        {value}
      </div>
      {subtitle && <div className="text-[11px] text-muted-foreground/50 truncate">{subtitle}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PID table
// ─────────────────────────────────────────────────────────────────────────────

function PidTable({ stats }) {
  const mainPid = stats?.mainPid ?? null;
  const pids = Array.isArray(stats?.pids) ? stats.pids : [];

  if (pids.length === 0 && (stats?.activeProcesses ?? 0) > 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/3 p-5">
        <div className="text-xs text-muted-foreground/50">
          PID enumeration not available for this project (recovered Job Object). Active processes:{" "}
          <span className="text-foreground font-mono">{stats.activeProcesses}</span>
        </div>
      </div>
    );
  }

  if (pids.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/3 p-5">
        <div className="text-xs text-muted-foreground/40">No processes detected.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/3 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
              PID
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
              Role
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
              Copy
            </th>
          </tr>
        </thead>
        <tbody>
          {pids.map((pid) => {
            const isMain = pid === mainPid;
            return (
              <tr
                key={pid}
                className="border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "font-mono text-sm",
                      isMain ? "text-emerald-400 font-semibold" : "text-foreground/80"
                    )}
                  >
                    {pid}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {isMain ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                      Main
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/50">Child</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => copyToClipboard(pid)}
                    className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer"
                    title={`Copy PID ${pid}`}
                  >
                    Copy
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ResourcesTab() {
  const context = useOutletContext();
  const project = context?.project ?? null;
  const stats = useAtomValue(statsAtom);
  const allHistory = useAtomValue(resourceHistoryAtom);
  const history = project ? (allHistory[project.id]?.samples ?? []) : [];

  if (!project) return null;

  const isRunning = project.status === "running";

  if (!isRunning || !stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Activity className="h-12 w-12 opacity-20" />
        <div className="text-center space-y-1">
          <p className="font-semibold text-foreground/60">Project is not running</p>
          <p className="text-sm text-muted-foreground/50">
            Start the project to see live resource usage.
          </p>
        </div>
        {history.length > 0 && (
          <div className="w-full max-w-3xl mt-4 opacity-40 pointer-events-none px-6">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">
              Last session
            </div>
            <SparklineChart
              samples={history}
              valueKey="cpu"
              maxValue={100}
              accentColor="#34d399"
              label="CPU"
              unit="%"
            />
          </div>
        )}
      </div>
    );
  }

  const maxMemMB =
    history.length > 0
      ? Math.max(...history.map((s) => s.memory / (1024 * 1024)), 1)
      : (stats.memory / (1024 * 1024)) * 1.5 || 100;

  const historyForMem = history.map((s) => ({ ...s, memoryMB: s.memory / (1024 * 1024) }));

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-5 space-y-5">
      {/* Snapshot cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="CPU"
          value={`${(stats.cpu ?? 0).toFixed(1)}%`}
          subtitle="Job total"
          accent="bg-emerald-400"
        />
        <StatCard
          label="Memory"
          value={formatMemory(stats.memory)}
          subtitle="Working set"
          accent="bg-sky-400"
        />
        <StatCard
          label="Uptime"
          value={formatUptime(stats.uptime)}
          subtitle="Since last start"
          accent="bg-violet-400"
        />
        <StatCard
          label="Processes"
          value={String(stats.activeProcesses ?? stats.processCount ?? 0)}
          subtitle={`${stats.processCount ?? 0} in tree`}
          accent="bg-amber-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SparklineChart
          samples={history}
          valueKey="cpu"
          maxValue={100}
          accentColor="#34d399"
          label="CPU Usage"
          unit="%"
        />
        <SparklineChart
          samples={historyForMem}
          valueKey="memoryMB"
          maxValue={Math.ceil(maxMemMB)}
          accentColor="#38bdf8"
          label="Memory Usage"
          unit=" MB"
        />
      </div>

      {/* Process list */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold px-1">
          Process list
        </div>
        <PidTable stats={stats} />
      </div>
    </div>
  );
}
