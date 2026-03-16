import { useEffect } from "react";
import { useAtom } from "jotai";
import { Minus, Square, X } from "lucide-react";
import { windowButtonsSideAtom } from "@/store/atoms";

const API = window.api;

const DEV_CAN_CONFIGURE_SIDE = import.meta.env.DEV;
const STORAGE_KEY = "windowButtonsSide"; // "left" | "right"

export default function TitleBar() {
  const [side, setSide] = useAtom(windowButtonsSideAtom);

  useEffect(() => {
    if (!DEV_CAN_CONFIGURE_SIDE) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "left" || stored === "right") setSide(stored);
  }, [setSide]);

  useEffect(() => {
    if (!DEV_CAN_CONFIGURE_SIDE) return;

    window.__setWindowButtonsSide = (nextSide) => {
      if (nextSide !== "left" && nextSide !== "right") return;
      window.localStorage.setItem(STORAGE_KEY, nextSide);
      setSide(nextSide);
    };

    return () => {
      if (window.__setWindowButtonsSide) {
        delete window.__setWindowButtonsSide;
      }
    };
  }, [setSide]);

  const containerClass =
    side === "left"
      ? "fixed top-0 left-0 z-[100] flex items-stretch"
      : "fixed top-0 right-0 z-[100] flex items-stretch";

  return (
    <div className={containerClass} style={{ WebkitAppRegion: "no-drag", direction: "ltr" }}>
      <button
        type="button"
        onClick={() => API.minimizeWindow()}
        className="w-10 h-9 flex items-center justify-center text-xs text-muted-foreground hover:bg-muted/60 focus-visible:outline-none"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        <Minus className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => API.toggleMaximize()}
        className="w-10 h-9 flex items-center justify-center text-xs text-muted-foreground hover:bg-muted/60 focus-visible:outline-none"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        <Square className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => API.closeWindow()}
        className="w-10 h-9 flex items-center justify-center text-xs text-red-400 hover:bg-red-600/80 hover:text-white focus-visible:outline-none"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
