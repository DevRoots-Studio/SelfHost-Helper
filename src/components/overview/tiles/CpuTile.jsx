import React, { useMemo } from "react";
import CompactStatCard from "../charts/CompactStatCard";
import PremiumSparklineChart from "../charts/PremiumSparklineChart";

export default function CpuTile({ stats, historySamples }) {
  const cpu = stats?.cpu ?? 0;
  const samples = historySamples || [];

  const cpuValue = useMemo(() => Number(cpu).toFixed(1), [cpu]);

  return (
    <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
      <CompactStatCard
        label="CPU"
        value={`${cpuValue}%`}
        subtitle="Job total"
        accent="bg-emerald-400"
      />

      <div className="flex-1 min-h-0">
        <PremiumSparklineChart
          samples={samples}
          valueKey="cpu"
          maxValue={100}
          accentColor="#34d399"
          label="CPU Usage"
          unit="%"
          variant="compact"
        />
      </div>
    </div>
  );
}

