import React, { useEffect, useMemo, useRef } from "react";
import GridLayout, { WidthProvider } from "@eleung/react-grid-layout";
import { useAtomValue } from "jotai";

import TileShell from "./TileShell";
import useProjectLayout from "./useProjectLayout";

import { overviewLayoutResetSignalAtom } from "@/store/atoms";

import ConsoleMiniTile from "./tiles/ConsoleMiniTile";
import TunnelMiniTile from "./tiles/TunnelMiniTile";
import TunnelLogsMiniTile from "./tiles/TunnelLogsMiniTile";
import MiniFileExhibitorTile from "./tiles/MiniFileExhibitorTile";
import CpuTile from "./tiles/CpuTile";
import RamTile from "./tiles/RamTile";
import ProcessIdsTile from "./tiles/ProcessIdsTile";

const ReactGridLayout = WidthProvider(GridLayout);

export default function OverviewGrid({
  project,
  fileTree,
  isFileTreeLoading,
  stats,
  historySamples,
  tunnelState,
  onSendInput,
  onOpenFile,
}) {
  const projectTunnelState = project ? tunnelState?.[project.id] : null;

  const defaultLayout = useMemo(
    () => [
      // Balanced "first impression" layout.
      // Gives the PIDs tile enough height for internal scrolling.
      // Matches the saved "perfect" layout from localStorage for projectId=1.
      { i: "console", x: 0, y: 0, w: 8, h: 6, minW: 5, minH: 4 },
      { i: "tunnelLogs", x: 8, y: 0, w: 4, h: 10, minW: 3, minH: 3 },
      { i: "cpu", x: 0, y: 6, w: 4, h: 6, minW: 2, minH: 2 },
      { i: "ram", x: 4, y: 6, w: 4, h: 6, minW: 2, minH: 2 },
      { i: "tunnel", x: 8, y: 10, w: 4, h: 6, minW: 3, minH: 2 },
      { i: "pids", x: 0, y: 12, w: 5, h: 4, minW: 3, minH: 3 },
      { i: "files", x: 5, y: 12, w: 3, h: 4, minW: 3, minH: 3 },
    ],
    []
  );

  const { layout, onLayoutChange, resetLayout } = useProjectLayout({
    projectId: project?.id ?? null,
    defaultLayout,
  });

  const resetSignal = useAtomValue(overviewLayoutResetSignalAtom);
  const didMountRef = useRef(false);

  useEffect(() => {
    // Avoid resetting layout on initial mount.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    resetLayout();
  }, [resetSignal, resetLayout]);

  const tiles = [
    {
      i: "console",
      headerRight: (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            project.status === "running" ? "bg-green-500" : "bg-destructive"
          }`}
        />
      ),
      render: (
        <ConsoleMiniTile projectId={project.id} status={project.status} onSendInput={onSendInput} />
      ),
    },
    {
      i: "tunnel",
      headerRight: (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            projectTunnelState?.status === "running"
              ? "bg-green-500"
              : projectTunnelState?.status === "connecting"
                ? "bg-yellow-500"
                : "bg-destructive"
          }`}
        />
      ),
      render: <TunnelMiniTile project={project} tunnelState={tunnelState} />,
    },
    {
      i: "tunnelLogs",
      render: <TunnelLogsMiniTile logs={projectTunnelState?.logs ?? []} />,
    },
    {
      i: "files",
      render: (
        <MiniFileExhibitorTile
          fileTree={fileTree}
          isLoading={isFileTreeLoading}
          onOpenFile={onOpenFile}
        />
      ),
    },
    {
      i: "cpu",
      render: <CpuTile stats={stats} historySamples={historySamples} />,
    },
    {
      i: "ram",
      render: <RamTile stats={stats} historySamples={historySamples} />,
    },
    {
      i: "pids",
      render: <ProcessIdsTile stats={stats} />,
    },
  ];

  return (
    <div className="h-full min-h-0 p-3 bg-transparent overflow-x-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ReactGridLayout
          layout={layout}
          cols={12}
          rowHeight={40}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          isDraggable
          isResizable
          draggableHandle=".overview-tile-handle"
          draggableCancel=".xterm, input, textarea, button"
          autoSize={false}
          compactType="vertical"
          onDragStop={(nextLayout) => onLayoutChange(nextLayout)}
          onResizeStop={(nextLayout) => onLayoutChange(nextLayout)}
        >
          {tiles.map((t) => (
            <div key={t.i} className="h-full w-full">
              <TileShell
                title={
                  t.i === "console"
                    ? "Console"
                    : t.i === "tunnel"
                      ? "Tunnel"
                      : t.i === "tunnelLogs"
                        ? "Tunnel Logs"
                        : t.i === "files"
                          ? "Files"
                          : t.i === "cpu"
                            ? "CPU"
                            : t.i === "ram"
                              ? "RAM"
                              : "PIDs"
                }
                right={t.headerRight ?? null}
              >
                {t.render}
              </TileShell>
            </div>
          ))}
        </ReactGridLayout>
      </div>
    </div>
  );
}
