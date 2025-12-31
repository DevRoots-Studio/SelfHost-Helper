import React, { useState } from "react";
import { Folder as FolderIcon, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  {
    value: "nodejs",
    label: "Node.js",
    script: "npm install && npm start",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg",
  },
  {
    value: "react",
    label: "React",
    script: "npm install && npm run dev",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg",
  },
  {
    value: "python",
    label: "Python",
    script: "pip install -r requirements.txt && python main.py",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg",
  },
  {
    value: "go",
    label: "Go",
    script: "go mod download && go run .",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/go/go-original.svg",
  },
  {
    value: "minecraft",
    label: "Minecraft Server",
    script: "java -Xms2G -Xmx2G -jar server.jar nogui",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg",
  },
  { value: "other", label: "Other", script: "", icon: "" },
];

export default function AddProjectDialog({ onProjectsChange }) {
  const [isOpen, setIsOpen] = useAtom(isAddProjectModalOpenAtom);
  const [newProject, setNewProject] = useState({
    name: "",
    path: "",
    type: "nodejs",
    script: "npm install && npm start",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg",
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
          icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg",
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
      <DialogContent className="sm:max-w-125">
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
                  icon: typeInfo?.icon || prev.icon,
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
          <div className="grid gap-2">
            <Label htmlFor="icon">Icon URL or Path</Label>
            <motion.div className="flex gap-2 items-center">
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="flex-1 min-w-0"
              >
                <Input
                  id="icon"
                  value={newProject.icon || ""}
                  onChange={(e) =>
                    setNewProject({ ...newProject, icon: e.target.value })
                  }
                  className="bg-muted/50 focus-visible:ring-1 w-full"
                  placeholder="https://... or C:\..."
                />
              </motion.div>
              <AnimatePresence initial={false} mode="sync">
                {newProject.icon && (
                  <motion.div
                    layout
                    className="w-10 h-10 bg-black/20 rounded-md overflow-hidden border border-border flex items-center justify-center relative shrink-0"
                    role="img"
                    aria-label="Icon preview"
                    initial={{ opacity: 0, width: 0, x: -6 }}
                    animate={{ opacity: 1, width: 40, x: 0 }}
                    exit={{ opacity: 0, width: 0, x: 6 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 28,
                      duration: 0.28,
                    }}
                  >
                    <AnimatePresence initial={false} mode="sync">
                      <motion.img
                        src={
                          newProject.icon.match(/^(https?:\/\/|data:)/)
                            ? newProject.icon
                            : `media:///${newProject.icon.replace(/\\/g, "/")}`
                        }
                        className="absolute inset-0 w-full h-full object-cover"
                        alt="Preview"
                        key={newProject.icon}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ imageRendering: "auto" }}
                      />
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                variant="secondary"
                size="icon"
                onClick={async () => {
                  try {
                    const file = await API.selectFile();
                    if (file) {
                      setNewProject((prev) => ({ ...prev, icon: file }));
                    }
                  } catch (e) {
                    console.error("Failed to select file:", e);
                  }
                }}
                className="w-10 h-10 p-0 flex items-center justify-center shrink-0 cursor-pointer"
                title="Select Icon"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </motion.div>
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
