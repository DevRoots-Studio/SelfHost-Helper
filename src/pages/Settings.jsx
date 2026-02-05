import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { ArrowLeft, Terminal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const API = window.api;

export default function Settings() {
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [clearLogsBeforeStart, setClearLogsBeforeStart] = useState(false);
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    loadSettings();
    loadAutoLaunchStatus();
    loadAppVersion();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await API.getSettings();
      setClearLogsBeforeStart(settings.clearLogsBeforeStart);
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  };

  const loadAutoLaunchStatus = async () => {
    try {
      const enabled = await API.isAutoLaunchEnabled();
      setAutoLaunchEnabled(enabled);
    } catch (e) {
      console.error("Failed to load auto-launch status", e);
    }
  };

  const loadAppVersion = async () => {
    try {
      const version = await API.getVersion();
      setAppVersion(version);
    } catch (e) {
      console.error("Failed to load app version", e);
    }
  };

  const handleAutoLaunchToggle = async (enabled) => {
    try {
      if (enabled) {
        await API.enableAutoLaunch();
        toast.success("Auto-launch enabled");
      } else {
        await API.disableAutoLaunch();
        toast.info("Auto-launch disabled");
      }
      setAutoLaunchEnabled(enabled);
    } catch (e) {
      console.error("Failed to toggle auto-launch", e);
      toast.error("Failed to change auto-launch setting");
    }
  };

  const handleClearLogsToggle = async (enabled) => {
    try {
      await API.updateSettings({ clearLogsBeforeStart: enabled });
      setClearLogsBeforeStart(enabled);
      toast.success(
        `Clear Logs Before Start ${enabled ? "enabled" : "disabled"} globally`,
      );
    } catch (e) {
      console.error("Failed to toggle clear logs setting", e);
      toast.error("Failed to update setting");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-screen overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/"
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-bold">App Settings</h1>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-white/10 pb-2">
            General
          </h2>

          <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label
                  htmlFor="auto-launch"
                  className="text-base font-semibold cursor-pointer"
                >
                  Launch on Startup
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically start SelfHost Helper when your computer boots
                  up.
                </p>
              </div>
              <Switch
                id="auto-launch"
                checked={autoLaunchEnabled}
                onCheckedChange={handleAutoLaunchToggle}
              />
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="space-y-1">
                <Label
                  htmlFor="clear-logs"
                  className="text-base font-semibold cursor-pointer"
                >
                  Clear Terminal Logs Before Start (Global)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically clear the logs of any project before it starts.
                </p>
              </div>
              <Switch
                id="clear-logs"
                checked={clearLogsBeforeStart}
                onCheckedChange={handleClearLogsToggle}
              />
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-white/10 pb-2">
            About
          </h2>

          <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-primary/20 blur-[100px] rounded-full pointer-events-none -mr-16 -mt-16 opacity-50 group-hover:opacity-70 transition-opacity" />

            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                <Terminal className="text-white h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-xl tracking-tight">
                  SelfHost Helper
                </h3>
                <p className="text-sm text-muted-foreground">
                  Version {appVersion || "Loading..."}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground relative z-10 max-w-lg leading-relaxed">
              Manage and monitor your self-hosted Node.js applications with
              ease. Built with Electron, React, and passion.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
