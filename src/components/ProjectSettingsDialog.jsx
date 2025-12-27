import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderOpen, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROJECT_TYPES = [
  { value: "node", label: "Node.js", script: "npm install && npm start" },
  { value: "react", label: "React", script: "npm install && npm run dev" },
  { value: "vue", label: "Vue", script: "npm install && npm run dev" },
  {
    value: "python",
    label: "Python",
    script: "pip install -r requirements.txt && python main.py",
  },
  {
    value: "static",
    label: "Static Site",
    script: "npm install && npm run build && serve -s build",
  },
  {
    value: "discord",
    label: "Discord Bot",
    script: "npm install && node index.js",
  },
  { value: "other", label: "Other", script: "" },
];

export default function ProjectSettingsDialog({
  project,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState({
    name: "",
    path: "",
    script: "",
    autoStart: false,
    type: "node",
    description: "",
    icon: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        path: project.path || "",
        script: project.script || "npm start",
        autoStart: project.autoStart || false,
        type: project.type || "node",
        description: project.description || "",
        icon: project.icon || "",
      });
    }
  }, [project]);

  const handleBrowsePath = async () => {
    const selectedPath = await window.api.selectDirectory();
    if (selectedPath) {
      setFormData((prev) => ({ ...prev, path: selectedPath }));
    }
  };

  const handleBrowseIcon = async () => {
    const selectedFile = await window.api.selectFile();
    if (selectedFile) {
      setFormData((prev) => ({ ...prev, icon: selectedFile }));
    }
  };

  const MIN_LOADING_TIME = 600;

  const handleSave = async () => {
    const start = Date.now();
    setIsLoading(true);

    try {
      await onSave({
        ...project,
        ...formData,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update project", error);
    } finally {
      const elapsed = Date.now() - start;
      const remaining = MIN_LOADING_TIME - elapsed;

      if (remaining > 0) {
        setTimeout(() => setIsLoading(false), remaining);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete "${formData.name}"? This cannot be undone.`
      )
    ) {
      onDelete(project.id);
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({
      name: project?.name || "",
      path: project?.path || "",
      script:
        project?.script ||
        (project?.type &&
          PROJECT_TYPES.find((t) => t.value === project.type)?.script) ||
        "npm start",
      autoStart: project?.autoStart || false,
      type: project?.type || "node",
      description: project?.description || "",
      icon: project?.icon || "",
    });
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleDialogOpenChange = (open) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  const MotionButton = motion.create(Button);
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card text-card-foreground border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Configure settings for {project?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border pb-2">
              General Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Project Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    const typeInfo = PROJECT_TYPES.find(
                      (t) => t.value === value
                    );
                    setFormData((prev) => ({
                      ...prev,
                      type: value,
                      script:
                        value !== "other" && typeInfo
                          ? typeInfo.script
                          : prev.script,
                    }));
                  }}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="bg-background/50 resize-none h-20"
                placeholder="Optional description..."
              />
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-border pb-2">
              Configuration
            </h3>

            <div className="space-y-2">
              <Label htmlFor="path">
                Project Path <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="path"
                  value={formData.path}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, path: e.target.value }))
                  }
                  className="bg-background/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBrowsePath}
                  title="Browse Folder"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="script">
                Startup Command <span className="text-destructive">*</span>
              </Label>
              <Input
                id="script"
                value={formData.script}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, script: e.target.value }))
                }
                className="bg-background/50 font-mono"
                placeholder="npm start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Custom Icon Path</Label>
              <motion.div className="flex gap-2 items-center">
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="flex-1 min-w-0"
                >
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, icon: e.target.value }))
                    }
                    className="bg-background/50 w-full"
                    placeholder="Path to .png, .jpg, .ico"
                  />
                </motion.div>
                <AnimatePresence initial={false} mode="sync">
                  {formData.icon && (
                    <motion.div
                      layout
                      className="w-9 h-9 bg-secondary rounded overflow-hidden border border-border flex items-center justify-center relative shrink-0"
                      role="img"
                      aria-label={`Icon preview for ${
                        formData.name || "project"
                      }`}
                      initial={{ opacity: 0, width: 0, x: -6 }}
                      animate={{ opacity: 1, width: 36, x: 0 }}
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
                          src={`media:///${formData.icon.replace(/\\/g, "/")}`}
                          className="absolute inset-0 w-full h-full object-contain object-center"
                          alt={`${formData.name || "Project"} icon preview`}
                          key={formData.icon}
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
                  variant="outline"
                  size="icon"
                  onClick={handleBrowseIcon}
                  title="Select Icon"
                  aria-label="Select Icon"
                  className="w-9 h-9 p-0 flex items-center justify-center rounded border border-border"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20">
              <div className="space-y-0.5">
                <Label htmlFor="autoStart" className="text-base cursor-pointer">
                  Auto Start
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically run on app startup
                </p>
              </div>
              <Switch
                id="autoStart"
                checked={formData.autoStart}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, autoStart: checked }))
                }
              />
            </div>
          </div>

          {/* Danger Zone */}
          {onDelete && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold border-b border-red-500/30 pb-2 text-red-500">
                Danger Zone
              </h3>
              <div className="flex items-center justify-between p-4 border border-red-500/20 bg-red-500/10 rounded-lg">
                <div>
                  <h4 className="font-medium text-red-100">Delete Project</h4>
                  <p className="text-xs text-red-200/60">
                    Permanently remove this project from the manager.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="shadow-lg shadow-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <MotionButton
            onClick={handleSave}
            disabled={
              isLoading ||
              !formData.name.trim() ||
              !formData.path.trim() ||
              !formData.script.trim()
            }
            whileTap={{ scale: 0.97 }}
            animate={{
              opacity: isLoading ? 0.8 : 1,
            }}
            transition={{
              duration: 0.25,
              ease: "easeInOut",
            }}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </motion.span>
              ) : (
                <motion.span
                  key="text"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  Save Changes
                </motion.span>
              )}
            </AnimatePresence>
          </MotionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
