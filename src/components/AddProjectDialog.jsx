import React, { useState } from "react";
import { Folder as FolderIcon } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAtom } from "jotai";
import { isAddProjectModalOpenAtom } from "@/store/atoms";

const API = window.api;

const PROJECT_TYPES = [
  { value: "nodejs", label: "Node.js", script: "npm install && npm start" },
  { value: "react", label: "React", script: "npm install && npm run dev" },
  {
    value: "python",
    label: "Python",
    script: "pip install -r requirements.txt && python main.py",
  },
  { value: "go", label: "Go", script: "go mod download && go run ." },
  {
    value: "minecraft",
    label: "Minecraft Server",
    script: "java -Xms2G -Xmx2G -jar server.jar nogui",
  },
  { value: "other", label: "", script: "" },
];

export default function AddProjectDialog({ onProjectsChange }) {
  const [isOpen, setIsOpen] = useAtom(isAddProjectModalOpenAtom);
  const [newProject, setNewProject] = useState({
    name: "",
    path: "",
    type: "nodejs",
    script: "npm install && npm start",
  });

  const handleAddProject = async () => {
    if (newProject.name.trim() && newProject.path && newProject.script.trim()) {
      try {
        await API.addProject(newProject);
        toast.success("Project added successfully!");
        onProjectsChange?.();
        setIsOpen(false);
        setNewProject({
          name: "",
          path: "",
          type: "nodejs",
          script: "npm install && npm start",
        });
      } catch (error) {
        toast.error(`Failed to add project: ${error.message}`);
      }
    }
  };

  const handleBrowseValues = async () => {
    const path = await API.selectDirectory();
    if (path) {
      setNewProject((prev) => ({ ...prev, path }));
      const name = path.split("\\").pop().split("/").pop();
      if (!newProject.name) setNewProject((prev) => ({ ...prev, name }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-125 bg-card border-border">
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
          <DialogDescription>
            Select a Node.js project directory to manage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="path">
              Project Path <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="path"
                value={newProject.path}
                readOnly
                placeholder="Select a directory..."
                className="bg-muted/50 focus-visible:ring-1"
              />
              <Button
                variant="secondary"
                onClick={handleBrowseValues}
                className="cursor-pointer"
              >
                <FolderIcon className="mr-2 h-4 w-4" /> Browse
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={newProject.name}
              onChange={(e) =>
                setNewProject({ ...newProject, name: e.target.value })
              }
              placeholder="My Server"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Project Type</Label>
            <Select
              value={newProject.type}
              onValueChange={(value) => {
                const typeInfo = PROJECT_TYPES.find((t) => t.value === value);
                setNewProject((prev) => ({
                  ...prev,
                  type: value,
                  script: typeInfo ? typeInfo.script : prev.script,
                }));
              }}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="script">
              Start Script <span className="text-destructive">*</span>
            </Label>
            <Input
              id="script"
              value={newProject.script}
              onChange={(e) =>
                setNewProject({ ...newProject, script: e.target.value })
              }
              placeholder="npm start"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleAddProject}
            disabled={
              !newProject.path ||
              !newProject.name.trim() ||
              !newProject.script.trim()
            }
            className="cursor-pointer"
          >
            Add Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
