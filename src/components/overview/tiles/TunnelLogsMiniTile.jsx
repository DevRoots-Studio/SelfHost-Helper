import React from "react";
import TunnelLogViewer from "@/components/TunnelLogViewer";

export default function TunnelLogsMiniTile({ logs }) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TunnelLogViewer logs={logs} />
    </div>
  );
}

