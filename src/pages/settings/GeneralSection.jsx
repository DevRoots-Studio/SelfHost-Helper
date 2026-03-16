import React from "react";
import { useOutletContext } from "react-router-dom";
import { Rocket, Terminal, Maximize2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function ToggleCard({ icon: Icon, accentColor, title, description, checked, onCheckedChange, id }) {
  return (
    <div
      className="flex items-center gap-5 rounded-2xl border border-white/[0.07] bg-white/2.5 px-6 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.4)] cursor-pointer hover:bg-white/4 transition-colors group"
      onClick={() => onCheckedChange(!checked)}
    >
      <div className={cn("rounded-xl p-3 shrink-0", accentColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />
    </div>
  );
}

export default function GeneralSection() {
  const {
    autoLaunchEnabled, handleAutoLaunchToggle,
    clearLogsBeforeStart, handleClearLogsToggle,
    startMaximized, handleStartMaximizedToggle,
  } = useOutletContext();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">General</h1>
        <p className="text-sm text-muted-foreground mt-1">App behavior and window preferences.</p>
      </div>

      <div className="space-y-3">
        <ToggleCard
          id="auto-launch"
          icon={Rocket}
          accentColor="bg-primary/15 text-primary"
          title="Launch on Startup"
          description="Automatically start SelfHost Helper when your computer boots up."
          checked={autoLaunchEnabled}
          onCheckedChange={handleAutoLaunchToggle}
        />
        <ToggleCard
          id="clear-logs"
          icon={Terminal}
          accentColor="bg-amber-500/15 text-amber-400"
          title="Clear Logs Before Start"
          description="Automatically clear the terminal output of any project before it starts."
          checked={clearLogsBeforeStart}
          onCheckedChange={handleClearLogsToggle}
        />
        <ToggleCard
          id="start-maximized"
          icon={Maximize2}
          accentColor="bg-sky-500/15 text-sky-400"
          title="Start Maximized"
          description="Open the app window maximized (full screen) on startup."
          checked={startMaximized}
          onCheckedChange={handleStartMaximizedToggle}
        />
      </div>
    </div>
  );
}
