import React, { useState, useEffect, useRef } from "react";
import {
  Cloud,
  Play,
  Square,
  Save,
  Copy,
  ExternalLink,
  HelpCircle,
  Settings2,
  Terminal,
  ChevronDown,
  ChevronUp,
  Globe,
  ShieldCheck,
  Zap,
} from "lucide-react";
import TunnelLogViewer from "./TunnelLogViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "react-toastify";
import { useAtom } from "jotai";
import { tunnelStateAtom } from "@/store/atoms";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function TunnelView(props) {
  const context = useOutletContext();
  const selectedProject = context?.project ?? null;
  const onUpdateProject = context?.handleUpdateProject ?? (() => {});
  const [tunnelState, setTunnelState] = useAtom(tunnelStateAtom);
  const projectTunnelState = selectedProject
    ? tunnelState[selectedProject.id] || { status: "stopped", url: null, logs: [] }
    : { status: "stopped", url: null, logs: [] };

  const [mode, setMode] = useState(selectedProject?.tunnelMode || "quick");
  const [port, setPort] = useState(selectedProject?.tunnelPort ?? 3000);
  const [token, setToken] = useState(selectedProject?.encryptedTunnelToken || "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [autoStart, setAutoStart] = useState(selectedProject?.autoStartTunnel || false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [config, setConfig] = useState({
    protocol: selectedProject?.tunnelConfig?.protocol || "http2",
    loglevel: selectedProject?.tunnelConfig?.loglevel || "info",
    noTLSVerify: selectedProject?.tunnelConfig?.noTLSVerify || false,
    connectTimeout: selectedProject?.tunnelConfig?.connectTimeout || "30s",
    httpHostHeader: selectedProject?.tunnelConfig?.httpHostHeader || "",
  });

  const prevStatusRef = useRef(projectTunnelState.status);

  // Reset state on project change
  useEffect(() => {
    if (!selectedProject) return;
    setMode(selectedProject.tunnelMode || "quick");
    setPort(selectedProject.tunnelPort || 3000);
    setToken(selectedProject.encryptedTunnelToken || "");
    setShowAdvanced(false);
    setShowHelp(false);
    setAutoStart(selectedProject.autoStartTunnel || false);
    setConfig({
      protocol: selectedProject.tunnelConfig?.protocol || "http2",
      loglevel: selectedProject.tunnelConfig?.loglevel || "info",
      noTLSVerify: selectedProject.tunnelConfig?.noTLSVerify || false,
      connectTimeout: selectedProject.tunnelConfig?.connectTimeout || "30s",
      httpHostHeader: selectedProject.tunnelConfig?.httpHostHeader || "",
    });
    prevStatusRef.current = projectTunnelState.status;
  }, [selectedProject?.id]);
  useEffect(() => {
    if (prevStatusRef.current !== "running" && projectTunnelState.status === "running") {
      toast.success("Tunnel established successfully!");
    } else if (prevStatusRef.current === "running" && projectTunnelState.status === "stopped") {
      toast.info("Tunnel stopped.");
    }
    prevStatusRef.current = projectTunnelState.status;
  }, [projectTunnelState.status]);

  if (!selectedProject) return null;

  const handleSave = async (silent = false) => {
    const updatedProject = {
      ...selectedProject,
      tunnelMode: mode,
      tunnelPort: port === "" ? 3000 : port,
      encryptedTunnelToken: token,
      tunnelConfig: config,
      autoStartTunnel: autoStart,
    };
    return await onUpdateProject(updatedProject, silent);
  };

  const handleStart = async () => {
    // Port validation
    const portToCheck = port === "" ? 3000 : port;
    const portNum = parseInt(portToCheck);

    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast.error("Please enter a valid port number (1-65535)");
      return;
    }

    if (mode === "authenticated" && !token.trim()) {
      toast.error("Cloudflare Tunnel Token is required for authenticated mode");
      return;
    }

    setIsProcessing(true);
    try {
      // Save settings silently before starting
      await handleSave(true);

      const res = await window.api.startTunnel(selectedProject.id, {
        mode,
        port: portNum,
        token,
        config,
      });

      if (!res.success) {
        toast.error(`Failed to start tunnel: ${res.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    setIsProcessing(true);
    try {
      const res = await window.api.stopTunnel(selectedProject.id);
      if (!res.success) {
        toast.error(`Failed to stop tunnel: ${res.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("URL copied to clipboard"))
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
        toast.error("Failed to copy URL");
      });
  };

  const openUrl = (url) => {
    window.api.openExternal(url);
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 overflow-y-auto bg-transparent custom-scrollbar">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Card */}
        <Card className="bg-muted/30 border-white/5 backdrop-blur-md shadow-xl overflow-hidden flex flex-col h-full">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tunnel Configuration</CardTitle>
                  <CardDescription>Configure how your project is exposed</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSave(false)}
                  className="gap-2 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelp(!showHelp)}
                  className={cn("gap-2 cursor-pointer", showHelp && "bg-primary/20 text-primary")}
                >
                  <HelpCircle className="h-4 w-4" />
                  Help
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6 flex-1">
            {/* Mode selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Tunnel Mode
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                  <div className="absolute left-full ml-2 top-0 w-64 p-2 bg-popover text-popover-foreground rounded-md shadow-lg border border-border text-[10px] hidden group-hover:block z-50">
                    Quick: Free, random URL, no account needed. <br />
                    Authenticated: Fixed URL (custom domain), requires Cloudflare Zero Trust token.
                  </div>
                </div>
              </Label>
              <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                <button
                  onClick={() => setMode("quick")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm transition-all cursor-pointer",
                    mode === "quick"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap className="h-4 w-4" /> Quick
                </button>
                <button
                  onClick={() => setMode("authenticated")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm transition-all cursor-pointer",
                    mode === "authenticated"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ShieldCheck className="h-4 w-4" /> Authenticated
                </button>
              </div>
            </div>

            {/* Port input */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Local Port
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                  <div className="absolute left-full ml-2 top-0 w-64 p-2 bg-popover text-popover-foreground rounded-md shadow-lg border border-border text-[10px] hidden group-hover:block z-50">
                    The port your local service is running on (e.g., 3000, 8080).
                  </div>
                </div>
              </Label>
              <Input
                type="number"
                value={port}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setPort("");
                  } else {
                    const parsed = parseInt(val);
                    if (!isNaN(parsed)) {
                      setPort(parsed);
                    }
                  }
                }}
                className="bg-black/20 border-white/5 h-11"
                placeholder="3000"
              />
            </div>

            {/* Token input (Authenticated mode only) */}
            {mode === "authenticated" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Tunnel Token
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                    <div className="absolute left-full ml-2 top-0 w-64 p-2 bg-popover text-popover-foreground rounded-md shadow-lg border border-border text-[10px] hidden group-hover:block z-50">
                      Copy the token from Cloudflare Zero Trust dashboard (Networks {"->"} Tunnels).
                    </div>
                  </div>
                </Label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-black/20 border-white/5 h-11"
                  placeholder="Paste your Cloudflare Tunnel token here"
                />
              </div>
            )}

            {/* Auto-start Toggle */}
            <div className="flex items-center justify-between py-2 border-t border-white/5 pt-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Auto-start Tunnel
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                    <div className="absolute left-full ml-2 top-0 w-64 p-2 bg-popover text-popover-foreground rounded-md shadow-lg border border-border text-[10px] hidden group-hover:block z-50">
                      Automatically start this tunnel whenever the project starts.
                    </div>
                  </div>
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Launch tunnel automatically with project startup.
                </p>
              </div>
              <Switch checked={autoStart} onCheckedChange={(v) => setAutoStart(v)} />
            </div>

            {/* Advanced Settings Toggle (Authenticated mode only) */}
            {mode === "authenticated" && (
              <div className="pt-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-medium text-primary hover:underline transition-all cursor-pointer"
                >
                  {showAdvanced ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Protocol</Label>
                        <Select
                          value={config.protocol}
                          onValueChange={(v) => setConfig({ ...config, protocol: v })}
                        >
                          <SelectTrigger className="bg-black/20 border-white/5 text-xs h-9">
                            <SelectValue placeholder="Select Protocol" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-white/10">
                            <SelectItem value="http2">HTTP/2</SelectItem>
                            <SelectItem value="quic">QUIC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Log Level</Label>
                        <Select
                          value={config.loglevel}
                          onValueChange={(v) => setConfig({ ...config, loglevel: v })}
                        >
                          <SelectTrigger className="bg-black/20 border-white/5 text-xs h-9">
                            <SelectValue placeholder="Select Log Level" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-white/10">
                            <SelectItem value="debug">Debug</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warn">Warn</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div className="space-y-0.5">
                        <Label className="text-xs">No TLS Verification</Label>
                        <p className="text-[10px] text-muted-foreground">
                          Skip certificate validation for local origin.
                        </p>
                      </div>
                      <Switch
                        checked={config.noTLSVerify}
                        onCheckedChange={(v) => setConfig({ ...config, noTLSVerify: v })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                          Connect Timeout
                          <div className="group relative">
                            <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                            <div className="absolute left-full ml-2 bottom-0 w-48 p-2 bg-popover text-popover-foreground rounded-md shadow-lg border border-border text-[9px] hidden group-hover:block z-50">
                              Timeout for establishing a new connection to the local service (e.g.,
                              30s).
                            </div>
                          </div>
                        </Label>
                        <Input
                          value={config.connectTimeout}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              connectTimeout: e.target.value,
                            })
                          }
                          className="bg-black/20 border-white/5 text-xs h-9"
                          placeholder="30s"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-2">
                          HTTP Host Header
                          <div className="group relative">
                            <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                            <div className="absolute left-full ml-2 bottom-0 w-48 p-2 bg-popover text-popover-foreground rounded-md shadow-lg border border-border text-[9px] hidden group-hover:block z-50">
                              Sets the HTTP Host header for requests sent to the local service.
                            </div>
                          </div>
                        </Label>
                        <Input
                          value={config.httpHostHeader}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              httpHostHeader: e.target.value,
                            })
                          }
                          className="bg-black/20 border-white/5 text-xs h-9"
                          placeholder="example.com"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 mt-auto">
              {projectTunnelState.status === "stopped" || projectTunnelState.status === "error" ? (
                <Button
                  onClick={handleStart}
                  disabled={isProcessing}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-lg active:scale-95 gap-2"
                >
                  <Play className="h-4 w-4" /> Start Tunnel
                </Button>
              ) : (
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  disabled={isProcessing}
                  className="w-full h-11 font-semibold rounded-xl transition-all shadow-lg active:scale-95 gap-2 cursor-pointer"
                >
                  <Square className="h-4 w-4" />{" "}
                  {projectTunnelState.status === "connecting" ? "Stop Connecting" : "Stop Tunnel"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Card and Help */}
        <div className="flex flex-col gap-6 h-full">
          <Card className="bg-muted/30 border-white/5 backdrop-blur-md shadow-xl overflow-hidden flex flex-col flex-1">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-500" />
                Live Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center justify-center flex-1">
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-center w-full">
                {projectTunnelState.status === "stopped" ? (
                  <>
                    <div className="p-4 bg-muted rounded-full relative">
                      <Cloud className="h-12 w-12 text-muted-foreground/30" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-gray-500 border-2 border-background" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Tunnel is Offline</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Configure and start the tunnel to expose your project.
                      </p>
                    </div>
                  </>
                ) : projectTunnelState.status === "connecting" ? (
                  <>
                    <div className="p-4 bg-primary/10 rounded-full relative">
                      <Cloud className="h-12 w-12 text-primary animate-pulse" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-yellow-500 border-2 border-background animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Connecting...</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Establishing secure connection to Cloudflare edge.
                      </p>
                      <Button
                        onClick={handleStop}
                        variant="outline"
                        size="sm"
                        className="mt-4 h-8 text-xs border-primary/20 hover:bg-primary/10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : projectTunnelState.status === "running" ? (
                  <>
                    <div className="p-4 bg-green-500/10 rounded-full relative">
                      <Cloud className="h-12 w-12 text-green-500" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-background shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </div>
                    <div className="w-full px-4">
                      <h3 className="text-xl font-bold text-green-500">Tunnel Running</h3>
                      <div className="mt-6 p-4 bg-black/40 rounded-xl border border-white/10 group relative flex flex-col gap-3 max-w-md mx-auto">
                        <div className="flex items-center justify-between gap-3">
                          <code className="text-sm font-mono text-primary break-all truncate">
                            {projectTunnelState.url}
                          </code>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary transition-all rounded-md"
                              onClick={() => copyToClipboard(projectTunnelState.url)}
                              disabled={!projectTunnelState.url}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary transition-all rounded-md"
                              onClick={() => openUrl(projectTunnelState.url)}
                              disabled={!projectTunnelState.url}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Exposing localhost:
                          {projectTunnelState.port || port} to the world
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-destructive/10 rounded-full relative">
                      <Cloud className="h-12 w-12 text-destructive" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-destructive border-2 border-background" />
                    </div>
                    <div className="w-full">
                      <h3 className="text-xl font-bold text-destructive">Tunnel Error</h3>
                      <p className="text-muted-foreground text-sm mt-1 mb-4">
                        {projectTunnelState.error}
                      </p>
                      <Button onClick={handleStart} variant="outline" className="h-9 text-xs">
                        Try Again
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Help Card (Conditional) */}
          {showHelp && (
            <Card className="bg-primary/5 border-primary/20 backdrop-blur-md animate-in zoom-in-95 duration-300">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                    <HelpCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm">How to get a Tunnel Token?</h3>
                    <ol className="text-xs text-muted-foreground space-y-3 list-decimal list-inside">
                      <li>
                        Go to{" "}
                        <span
                          className="text-primary cursor-pointer hover:underline"
                          onClick={() => openUrl("https://dash.cloudflare.com")}
                        >
                          dash.cloudflare.com
                        </span>{" "}
                        and sign in.
                      </li>
                      <li>
                        Navigate to <b>Zero Trust</b> → <b>Networks</b> → <b>Tunnels</b>.
                      </li>
                      <li>
                        Click <b>"Create a tunnel"</b> and select <b>"Cloudflared"</b>.
                      </li>
                      <li>Give your tunnel a name and save it.</li>
                      <li>
                        In the installation step, find <b>"Choose your environment"</b> and select{" "}
                        <b>"Windows"</b>.
                      </li>
                      <li>
                        You will see a command, copy ONLY the long alphanumeric string after{" "}
                        <code>--token</code>.
                      </li>
                      <li>Paste it into the Token input field in this app.</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Logs Card */}
      <Card className="bg-[#0a0a0c] border-white/5 shadow-xl flex-1 flex flex-col overflow-hidden min-h-[400px]">
        <CardHeader className="py-3 px-4 border-b border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-mono flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
            <Terminal className="h-3.5 w-3.5" />
            Tunnel Logs
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={async () => {
              try {
                await window.api.clearTunnelLogs(selectedProject.id);
                setTunnelState((prev) => ({
                  ...prev,
                  [selectedProject.id]: {
                    ...projectTunnelState,
                    logs: [],
                  },
                }));
              } catch (err) {
                console.error("Failed to clear logs:", err);
                toast.error("Failed to clear logs");
              }
            }}
          >
            Clear
          </Button>
        </CardHeader>
        <TunnelLogViewer logs={projectTunnelState.logs} />
      </Card>
    </div>
  );
}
