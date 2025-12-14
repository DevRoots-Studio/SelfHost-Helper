import { useEffect, useState } from "react";

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const cleanupMaximize = window.api.onMaximize(() => setMaximized(true));
    const cleanupUnmaximize = window.api.onUnmaximize(() =>
      setMaximized(false)
    );

    return () => {
      cleanupMaximize();
      cleanupUnmaximize();
    };
  }, []);

  return (
    <div className="h-8 flex items-center justify-between bg-zinc-900 text-white select-none [-webkit-app-region:drag]">
      <div className="flex items-center gap-2 pl-3">
        <img src="/icon.png" className="w-4 h-4" />
        <span className="text-sm font-medium">SelfHost Helper</span>
      </div>

      <div className="flex h-full">
        <button
          className="w-11 h-full flex items-center justify-center hover:bg-zinc-700 [-webkit-app-region:no-drag]"
          onClick={() => window.api.minimizeWindow()}
        >
          —
        </button>

        <button
          className="w-11 h-full flex items-center justify-center hover:bg-zinc-700 [-webkit-app-region:no-drag]"
          onClick={() => window.api.toggleMaximize()}
        >
          {maximized ? "🗗" : "🗖"}
        </button>

        <button
          className="w-11 h-full flex items-center justify-center hover:bg-red-600 [-webkit-app-region:no-drag]"
          onClick={() => window.api.closeWindow()}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
