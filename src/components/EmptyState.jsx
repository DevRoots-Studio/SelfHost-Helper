import React from "react";
import { Plus, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyState({ onAddProject }) {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col bg-transparent relative z-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="p-8 mb-8  shadow-primary/10 animate-in fade-in zoom-in duration-700">
        <Terminal className="h-20 w-20 opacity-80 text-primary drop-shadow-[0_0_15px_rgba(124,58,237,0.3)]" />
      </div>
      <h3 className="text-3xl font-bold mb-3 text-foreground tracking-tight">
        No Project Selected
      </h3>
      <p className="max-w-md text-center text-muted-foreground text-lg mb-8 leading-relaxed">
        Select a project from the sidebar to manage it, or verify your
        deployment status.
      </p>
      <Button
        className="cursor-pointer btn-primary h-12 px-8 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
        onClick={onAddProject}
      >
        <Plus className="mr-2 h-5 w-5" /> Create New Project
      </Button>
    </div>
  );
}
