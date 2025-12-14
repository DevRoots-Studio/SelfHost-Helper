import React from "react";
import { Plus, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyState({ onAddProject }) {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col bg-radial-gradient">
      <div className="p-8 bg-muted/20 rounded-full mb-6 ring-1 ring-border shadow-2xl animate-in fade-in zoom-in duration-500">
        <Terminal className="h-16 w-16 opacity-50 text-primary" />
      </div>
      <h3 className="text-2xl font-semibold mb-2 text-foreground">
        No Project Selected
      </h3>
      <p className="max-w-md text-center text-muted-foreground">
        Select a project from the sidebar or create a new one to get started
        handling your self-hosted apps.
      </p>
      <Button className="mt-8 cursor-pointer" onClick={onAddProject}>
        <Plus className="mr-2 h-4 w-4" /> Create New Project
      </Button>
    </div>
  );
}
