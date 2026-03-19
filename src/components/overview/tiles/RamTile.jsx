import React, { useMemo } from "react";
import { formatMemory } from "@/lib/formatMemory";
import CompactStatCard from "../charts/CompactStatCard";
import PremiumSparklineChart from "../charts/PremiumSparklineChart";

export default function RamTile({ stats, historySamples }) {
  const mem = stats?.memory ?? 0;

  const historyForMem = useMemo(
    () => (historySamples ?? []).map((s) => ({ memoryMB: s.memory / (1024 * 1024) })),
    [historySamples]
  );

  const maxMemMB = useMemo(() => {
    if (historyForMem.length === 0) return 1;
    return Math.max(...historyForMem.map((s) => s.memoryMB ?? 0), 1);
  }, [historyForMem]);

  return (
    <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
      <CompactStatCard
        label="Memory"
        value={formatMemory(mem)}
        subtitle="Working set"
        accent="bg-sky-400"
      />

      <div className="flex-1 min-h-0">
        <PremiumSparklineChart
          samples={historyForMem}
          valueKey="memoryMB"
          maxValue={Math.ceil(maxMemMB)}
          accentColor="#38bdf8"
          label="Memory Usage"
          unit=" MB"
          variant="compact"
        />
      </div>
    </div>
  );
}
