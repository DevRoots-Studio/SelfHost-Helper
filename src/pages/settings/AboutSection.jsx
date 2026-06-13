import React from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Terminal,
  Globe,
  GithubIcon,
  MessageCircle,
  Users,
  Mail,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "react-toastify";

const TECH_STACK = [
  "Electron",
  "React",
  "Tailwind CSS",
  "Node.js",
  "Jotai",
  "React Router",
  "Framer Motion",
];

const LINKS = [
  {
    label: "Website",
    value: "devroot.abomeezo.com",
    href: "https://devroot.abomeezo.com/",
    Icon: Globe,
    accent: "bg-sky-500/15 text-sky-400",
  },
  {
    label: "GitHub",
    value: "DevRoots-Studio / SelfHost-Helper",
    href: "https://github.com/DevRoots-Studio/SelfHost-Helper",
    Icon: GithubIcon,
    accent: "bg-white/8 text-foreground/80",
    badge: "Open Source",
  },
  {
    label: "Discord — Community",
    value: "discord.gg/C62mj58Q2D",
    href: "https://discord.gg/C62mj58Q2D",
    Icon: MessageCircle,
    accent: "bg-indigo-500/15 text-indigo-400",
    badge: "Support & Chat",
  },
];

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${text}`);
  } catch {
    toast.error("Failed to copy");
  }
}

function openExternal(url) {
  window.api?.openExternal?.(url);
}

export default function AboutSection() {
  const { appVersion } = useOutletContext();

  return (
    <div className="p-8 max-w-2xl space-y-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">About</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SelfHost Helper — built by DevRoot Studio.
        </p>
      </div>

      {/* App identity card */}
      <div className="relative rounded-2xl border border-white/[0.07] bg-white/2.5 shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden px-8 py-8">
        {/* Animated blobs */}
        <motion.div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/20 blur-[80px] pointer-events-none"
          animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-violet-600/15 blur-[60px] pointer-events-none"
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1.5 }}
        />

        <div className="relative z-10">
          {/* Logo + name */}
          <div className="flex items-center gap-5 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-violet-700 flex items-center justify-center shadow-xl shadow-primary/25 shrink-0">
              <Terminal className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">SelfHost Helper</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={() => copyToClipboard(`v${appVersion}`)}
                  title="Click to copy version"
                  className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
                >
                  v{appVersion || "…"}
                  <Copy className="h-3 w-3 opacity-60" />
                </button>
                <span className="text-xs text-muted-foreground/50">by DevRoot Studio</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed text-sm max-w-md mb-6">
            Manage and monitor your self-hosted applications with ease. Built for developers who run
            their own infrastructure and need a reliable, beautiful control center. Free and open
            source, forever.
          </p>

          {/* Tech stack */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2.5">
              Built with
            </p>
            <div className="flex flex-wrap gap-2">
              {TECH_STACK.map((tech) => (
                <span
                  key={tech}
                  className="text-[11px] font-medium text-muted-foreground/70 bg-white/4 border border-white/[0.07] rounded-full px-3 py-1"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DevRoot links */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-1 mb-3">
          DevRoot Studio
        </p>
        <div className="space-y-2">
          {LINKS.map(({ label, value, href, Icon, accent, badge }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/2.5 px-5 py-3.5 hover:bg-white/4 transition-colors group"
            >
              <div className={`rounded-lg p-2 shrink-0 ${accent}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  {badge && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 bg-primary/10 border border-primary/15 rounded-full px-2 py-0.5">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground/60 truncate mt-0.5 font-mono">
                  {value}
                </p>
              </div>
              <button
                onClick={() => openExternal(href)}
                title={`Open ${label}`}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Developer credit */}
      <div className="rounded-xl border border-white/5 bg-white/1.5 px-5 py-4 flex items-center gap-3">
        <div className="rounded-lg bg-white/5 p-2 shrink-0">
          <Users className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Developed by DevRoot Studio</p>
          <p className="text-[12px] text-muted-foreground/50 mt-0.5">
            Have a question, bug report, or feature request? Join the Discord server — we're happy
            to help.
          </p>
        </div>
        <button
          onClick={() => openExternal("https://discord.gg/C62mj58Q2D")}
          className="shrink-0 text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1.5 cursor-pointer hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
        >
          Join Discord
        </button>
      </div>
    </div>
  );
}
