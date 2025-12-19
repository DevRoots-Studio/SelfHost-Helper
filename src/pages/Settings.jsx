import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Terminal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const API = window.api;

export default function Settings() {
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    loadAutoLaunchStatus();
    loadAppVersion();
  }, []);

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
      } else {
        await API.disableAutoLaunch();
      }
      setAutoLaunchEnabled(enabled);
    } catch (e) {
      console.error("Failed to toggle auto-launch", e);
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

          <div className="p-6 bg-secondary/30 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label
                  htmlFor="auto-launch"
                  className="text-base font-semibold cursor-pointer"
                >
                  Launch on Startup
                </Label>
                <p className="text-sm text-white/60">
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
          </div>
        </section>

        {/* About Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-white/10 pb-2">
            About
          </h2>

          <div className="p-6 bg-secondary/30 rounded-lg border border-white/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Terminal className="text-white h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-lg">SelfHost Helper</h3>
                <p className="text-sm text-white/60">
                  Version {appVersion || "Loading..."}
                </p>
              </div>
            </div>
            <p className="text-white/80">
              Manage and monitor your self-hosted Node.js applications with
              ease.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
