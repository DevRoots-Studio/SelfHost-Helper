import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderOpen, Loader2 } from "lucide-react";

export default function ProjectSettingsDialog({
  project,
  isOpen,
  onClose,
  onSave,
}) {
  const [name, setName] = useState(project?.name || "");
  const [path, setPath] = useState(project?.path || "");
  const [script, setScript] = useState(project?.script || "");
  const [autoStart, setAutoStart] = useState(project?.autoStart || false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setPath(project.path);
      setScript(project.script || "npm start");
      setAutoStart(project.autoStart || false);
    }
  }, [project]);

  const handleBrowse = async () => {
    const selectedPath = await window.api.selectDirectory();
    if (selectedPath) {
      setPath(selectedPath);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave({
        ...project,
        name,
        path,
        script,
        autoStart,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update project", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Modify the configuration for {project?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3 bg-background/50"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="path" className="text-right">
              Path
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 bg-background/50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleBrowse}
                title="Browse Folder"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="script" className="text-right">
              Command
            </Label>
            <Input
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="col-span-3 bg-background/50"
              placeholder="npm start"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="autoStart" className="text-right">
              Auto Start
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch
                id="autoStart"
                checked={autoStart}
                onCheckedChange={setAutoStart}
              />
              <span className="text-xs text-muted-foreground">
                Start this project when app launches
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
