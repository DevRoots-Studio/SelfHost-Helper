import { useEffect, useRef } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAtom, useSetAtom } from "jotai";
import { toast } from "react-toastify";
import * as atoms from "@/store/atoms";
import {
  normalizeProject,
  normalizeProjectList,
  normalizeCategoryList,
} from "@/lib/normalizeProject";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import ProjectHeader from "@/components/ProjectHeader";
import ViewTabs from "@/components/ViewTabs";

const API = window.api;

export default function ProjectLayout() {
  const navigate = useNavigate();
  const project = useSelectedProject();
  const [projects, setProjects] = useAtom(atoms.projectsAtom);
  const setCategories = useSetAtom(atoms.categoriesAtom);
  const setLogs = useSetAtom(atoms.logsAtom);
  const [fileTree, setFileTree] = useAtom(atoms.fileTreeAtom);
  const [isFileTreeLoading, setIsFileTreeLoading] = useAtom(atoms.isFileTreeLoadingAtom);
  const setStats = useSetAtom(atoms.statsAtom);
  const setResourceHistory = useSetAtom(atoms.resourceHistoryAtom);
  const [projectEditorStates, setProjectEditorStates] = useAtom(atoms.projectEditorStatesAtom);
  const setTunnelState = useSetAtom(atoms.tunnelStateAtom);
  const projectPathRef = useRef(null);
  projectPathRef.current = project?.path ?? null;

  // Redirect if project ID in URL doesn't exist (e.g. deleted)
  useEffect(() => {
    if (projects.length > 0 && project == null) {
      navigate("/", { replace: true });
    }
  }, [projects.length, project, navigate]);

  const loadData = async () => {
    const [projectList, categoryList] = await Promise.all([API.getProjects(), API.getCategories()]);
    setProjects(normalizeProjectList(projectList));
    setCategories(normalizeCategoryList(categoryList));
  };

  const loadFileTree = async (path) => {
    setIsFileTreeLoading(true);
    const tree = await API.readDirectory(path);
    setFileTree(tree);
    setIsFileTreeLoading(false);
  };

  // Per-project: file tree, watcher, log history, tunnel state
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    setStats(null);

    (async () => {
      const list = normalizeProjectList(await API.getProjects());
      if (cancelled) return;
      setProjects(list);
      const currentProject = list.find((p) => p.id === project.id);
      if (currentProject) {
        loadFileTree(currentProject.path);
        API.watchFolder(currentProject.path);
      }
    })();

    API.getLogHistory(project.id).then((history) => {
      if (history?.length > 0) {
        setLogs((prev) => ({
          ...prev,
          [project.id]: history,
        }));
      }
    });

    API.getTunnelStatus(project.id).then((status) => {
      if (status) {
        setTunnelState((prev) => ({
          ...prev,
          [project.id]: { ...(prev[project.id] || { logs: [] }), ...status },
        }));
      }
    });

    API.getTunnelLogs(project.id).then((logs) => {
      if (logs?.length > 0) {
        setTunnelState((prev) => ({
          ...prev,
          [project.id]: {
            ...(prev[project.id] || { status: "stopped", url: null }),
            logs,
          },
        }));
      }
    });

    return () => {
      cancelled = true;
      if (project?.path) {
        API.stopWatchingFolder(project.path).catch(() => {});
      }
    };
  }, [project?.id]);

  // File change listener (reload tree when structure changes under this project)
  useEffect(() => {
    if (!project?.path) return;
    let fileChangeDebounceTimer = null;
    const cleanupFileChange = API.onFileChange(({ event, filePath }) => {
      const projectPath = projectPathRef.current;
      if (!projectPath || !filePath) return;
      const normalizedPath = filePath.replace(/\\/g, "/");
      const normalizedProject = projectPath.replace(/\\/g, "/");
      if (
        normalizedPath !== normalizedProject &&
        !normalizedPath.startsWith(normalizedProject + "/")
      )
        return;
      if (event === "change") return;
      if (fileChangeDebounceTimer) clearTimeout(fileChangeDebounceTimer);
      fileChangeDebounceTimer = setTimeout(() => {
        if (projectPathRef.current) loadFileTree(projectPathRef.current);
      }, 150);
    });
    return () => {
      if (fileChangeDebounceTimer) clearTimeout(fileChangeDebounceTimer);
      cleanupFileChange();
    };
  }, [project?.path]);

  // Subscribe to native push-based stats events (no polling)
  useEffect(() => {
    if (!project?.id) return;
    // Clear stale stats when switching projects
    setStats(null);

    const unsub = API.onProjectStats((payload) => {
      if (payload.projectId !== project.id) return;
      setStats(payload);
      setResourceHistory((prev) => {
        const existing = prev[project.id]?.samples ?? [];
        const next = [
          ...existing,
          {
            t: payload.timestamp,
            cpu: payload.cpu ?? 0,
            memory: payload.memory ?? 0,
            processCount: payload.processCount ?? 0,
          },
        ].slice(-120);
        return { ...prev, [project.id]: { samples: next } };
      });
    });

    return () => {
      unsub?.();
      // Clear stats display when unmounting / switching away
      setStats(null);
    };
  }, [project?.id, setStats, setResourceHistory]);

  // Clear stats only when the current project is explicitly stopped or error
  // (avoids clearing on stale "stopped" before ResourcesTab verification or status-sync corrects it)
  useEffect(() => {
    if (!project?.id) return;
    if (project.status === "stopped" || project.status === "error") {
      setStats(null);
      setResourceHistory((prev) => {
        const next = { ...prev };
        delete next[project.id];
        return next;
      });
    }
  }, [project?.id, project?.status, setStats, setResourceHistory]);

  const handleStart = async (id) => {
    const res = await API.startProject(id);
    if (!res?.success) {
      toast.error(`Failed to start project: ${res?.message || "Unknown error"}`);
    }
  };

  const handleStop = async (id) => {
    const res = await API.stopProject(id);
    if (!res?.success) toast.error("Failed to stop project");
  };

  const handleRestart = async (id) => {
    const res = await API.restartProject(id);
    if (!res?.success) toast.error("Failed to restart project");
  };

  const handleSendInput = async (id, data) => API.sendInput(id, data);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this project?")) return;
    const success = await API.deleteProject(id);
    if (success) {
      toast.warning("Project removed");
      loadData();
      setLogs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setProjectEditorStates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setTunnelState((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      navigate("/", { replace: true });
    } else {
      toast.error("Failed to remove project");
    }
  };

  const handleUpdateProject = async (projectData, silent = false) => {
    const updated = await API.updateProject(projectData);
    if (updated) {
      const normalizedUpdated = normalizeProject(updated);
      if (!normalizedUpdated) {
        if (!silent) toast.error("Failed to normalize updated project");
        loadData();
        return;
      }
      setProjects((prev) =>
        prev.map((p) => (p.id === normalizedUpdated.id ? { ...p, ...normalizedUpdated } : p))
      );
      if (!silent) toast.success("Settings saved");
    } else {
      toast.error("Failed to save settings");
    }
  };

  const handleEditorFileChange = (projectId, filePath) => {
    setProjectEditorStates((prev) => ({ ...prev, [projectId]: filePath }));
  };

  if (project == null) return null;

  const outletContext = {
    project,
    handleStart,
    handleStop,
    handleRestart,
    handleDelete,
    handleUpdateProject,
    handleSendInput,
    handleEditorFileChange,
    loadFileTree,
    fileTree,
    isFileTreeLoading,
    projectEditorStates,
  };

  return (
    <>
      <ProjectHeader
        selectedProject={project}
        onStart={handleStart}
        onStop={handleStop}
        onRestart={handleRestart}
        onDelete={handleDelete}
        onUpdate={handleUpdateProject}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <ViewTabs />
        <div className="flex-1 min-h-0 overflow-hidden relative bg-muted/40 backdrop-blur-md">
          <Outlet context={outletContext} />
        </div>
      </div>
    </>
  );
}
