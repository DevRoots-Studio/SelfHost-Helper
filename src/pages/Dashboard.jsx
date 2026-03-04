import { useEffect, useRef } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import * as atoms from "@/store/atoms";
import { toast } from "react-toastify";
import LogViewer from "@/components/LogViewer";
import Sidebar from "@/components/Sidebar";
import ProjectHeader from "@/components/ProjectHeader";
import ViewTabs from "@/components/ViewTabs";
import EditorView from "@/components/EditorView";
import TunnelView from "@/components/TunnelView";
import EmptyState from "@/components/EmptyState";

const API = window.api;
const isDev = import.meta.env.DEV;

const warnedInvalidProjectIds = new Set();
const warnedInvalidCategoryIds = new Set();

const toNullableNumber = (value) => {
  if (value === null || value === undefined) return null;
  const normalizedValue = typeof value === "string" ? value.trim() : value;
  if (normalizedValue === "") return null;
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const toOrderNumber = (value) => {
  const normalizedValue = typeof value === "string" ? value.trim() : value;
  if (normalizedValue === "") return 0;
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : 0;
};

const warnInvalidIdOnce = (kind, rawId) => {
  if (!isDev) return;
  const key = String(rawId);
  const registry = kind === "project" ? warnedInvalidProjectIds : warnedInvalidCategoryIds;
  if (registry.has(key)) return;
  registry.add(key);
  console.warn(`[Dashboard] Dropping ${kind} with non-numeric id:`, rawId);
};

const normalizeProject = (project) => {
  const normalizedId = toNullableNumber(project.id);
  if (normalizedId === null) {
    warnInvalidIdOnce("project", project.id);
    return null;
  }
  return {
    ...project,
    id: normalizedId,
    categoryId: toNullableNumber(project.categoryId),
    order: toOrderNumber(project.order),
  };
};

const normalizeCategory = (category) => {
  const normalizedId = toNullableNumber(category.id);
  if (normalizedId === null) {
    warnInvalidIdOnce("category", category.id);
    return null;
  }
  return {
    ...category,
    id: normalizedId,
    order: toOrderNumber(category.order),
  };
};

const normalizeProjectList = (projectList = []) =>
  projectList.map(normalizeProject).filter(Boolean);
const normalizeCategoryList = (categoryList = []) =>
  categoryList.map(normalizeCategory).filter(Boolean);

export default function Dashboard() {
  const [projects, setProjects] = useAtom(atoms.projectsAtom);
  const [selectedProjectId, setSelectedProjectId] = useAtom(atoms.selectedProjectIdAtom);
  const selectedProject = useAtomValue(atoms.selectedProjectAtom);
  const setLogs = useSetAtom(atoms.logsAtom);
  const [viewMode, setViewMode] = useAtom(atoms.viewModeAtom);
  const [fileTree, setFileTree] = useAtom(atoms.fileTreeAtom);
  const [isFileTreeLoading, setIsFileTreeLoading] = useAtom(atoms.isFileTreeLoadingAtom);
  const setStats = useSetAtom(atoms.statsAtom);
  const [projectEditorStates, setProjectEditorStates] = useAtom(atoms.projectEditorStatesAtom);
  const setTunnelState = useSetAtom(atoms.tunnelStateAtom);

  const setCategories = useSetAtom(atoms.categoriesAtom);
  const lastWatchedPathRef = useRef(null);
  const selectedProjectPathRef = useRef(null);

  selectedProjectPathRef.current = selectedProject?.path ?? null;

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

  useEffect(() => {
    loadData();
    const cleanupStatus = API.onStatusChange(({ projectId, status, startTime }) => {
      const normalizedProjectId = toNullableNumber(projectId);
      if (normalizedProjectId === null) return;
      setProjects((prev) => {
        const project = prev.find((p) => p.id === normalizedProjectId);
        if (project && project.status !== status) {
          if (status === "running") {
            toast.success(`${project.name} is now running`);
          } else if (status === "stopped") {
            toast.info(`${project.name} has stopped`);
          } else if (status === "error") {
            toast.error(`${project.name} encountered an error`);
          }
        }
        return prev.map((p) => (p.id === normalizedProjectId ? { ...p, status, startTime } : p));
      });
    });
    const cleanupList = API.onProjectsChange(() => {
      loadData();
    });
    const appendLogs = (projectId, logEntries) => {
      setLogs((prev) => {
        const currentLogs = prev[projectId] || [];
        const newLogs = [...currentLogs, ...logEntries];
        // Enforce 1000 line limit in UI as well
        if (newLogs.length > 1000) {
          return {
            ...prev,
            [projectId]: newLogs.slice(newLogs.length - 1000),
          };
        }
        return {
          ...prev,
          [projectId]: newLogs,
        };
      });
    };

    const cleanupLogs = API.onLog(({ projectId, data, type, timestamp }) => {
      appendLogs(projectId, [{ data, type, timestamp }]);
    });

    const cleanupLogsBatch = API.onLogsBatch(({ projectId, logs }) => {
      const formattedLogs = logs.map(({ data, type, timestamp }) => ({
        data,
        type,
        timestamp,
      }));
      appendLogs(projectId, formattedLogs);
    });

    const cleanupLogsCleared = API.onLogsCleared((projectId) => {
      setLogs((prev) => ({
        ...prev,
        [projectId]: [],
      }));
    });

    // Tunnel listeners
    const cleanupTunnelStatus = API.onTunnelStatus(({ projectId, status, url, error }) => {
      setTunnelState((prev) => ({
        ...prev,
        [projectId]: {
          ...(prev[projectId] || { logs: [] }),
          status,
          url,
          error,
        },
      }));
    });

    const cleanupTunnelLog = API.onTunnelLog(({ projectId, message, type, timestamp }) => {
      setTunnelState((prev) => {
        const projectState = prev[projectId] || {
          status: "stopped",
          url: null,
          logs: [],
        };
        const newLogs = [...(projectState.logs || []), { message, type, timestamp }];
        // Limit to 100 logs
        const trimmedLogs = newLogs.length > 100 ? newLogs.slice(newLogs.length - 100) : newLogs;

        return {
          ...prev,
          [projectId]: {
            ...projectState,
            logs: trimmedLogs,
          },
        };
      });
    });

    let fileChangeDebounceTimer = null;
    const cleanupFileChange = API.onFileChange(({ event, filePath }) => {
      const projectPath = selectedProjectPathRef.current;
      if (!projectPath || !filePath) return;
      const normalizedPath = filePath.replace(/\\/g, "/");
      const normalizedProject = projectPath.replace(/\\/g, "/");
      if (
        normalizedPath !== normalizedProject &&
        !normalizedPath.startsWith(normalizedProject + "/")
      )
        return;
      // Only reload tree when structure changes (add/remove), not on content "change" (e.g. save)
      if (event === "change") return;
      if (fileChangeDebounceTimer) clearTimeout(fileChangeDebounceTimer);
      fileChangeDebounceTimer = setTimeout(() => {
        const currentPath = selectedProjectPathRef.current;
        if (currentPath) loadFileTree(currentPath);
      }, 150);
    });

    return () => {
      if (fileChangeDebounceTimer) clearTimeout(fileChangeDebounceTimer);
      cleanupFileChange();
      cleanupStatus();
      cleanupList();
      cleanupLogs();
      cleanupLogsBatch();
      cleanupLogsCleared();
      cleanupTunnelStatus();
      cleanupTunnelLog();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (selectedProjectId) {
      setStats(null); // Immediately clear stats on project switch

      (async () => {
        const list = normalizeProjectList(await API.getProjects());
        if (cancelled) return;
        setProjects(list);

        // Use fresh list so we find the newly selected project (projects state was stale before)
        const currentProject = list.find((p) => p.id === selectedProjectId);
        if (currentProject) {
          loadFileTree(currentProject.path);
          if (lastWatchedPathRef.current) {
            await API.stopWatchingFolder(lastWatchedPathRef.current).catch(() => {});
          }
          API.watchFolder(currentProject.path);
          lastWatchedPathRef.current = currentProject.path;
        } else {
          if (lastWatchedPathRef.current) {
            await API.stopWatchingFolder(lastWatchedPathRef.current).catch(() => {});
            lastWatchedPathRef.current = null;
          }
        }
      })();

      API.getLogHistory(selectedProjectId).then((history) => {
        if (history && history.length > 0) {
          setLogs((prev) => ({
            ...prev,
            [selectedProjectId]: history,
          }));
        }
      });

      API.getTunnelStatus(selectedProjectId).then((status) => {
        if (status) {
          setTunnelState((prev) => ({
            ...prev,
            [selectedProjectId]: {
              ...(prev[selectedProjectId] || { logs: [] }),
              ...status,
            },
          }));
        }
      });

      API.getTunnelLogs(selectedProjectId).then((logs) => {
        if (logs && logs.length > 0) {
          setTunnelState((prev) => ({
            ...prev,
            [selectedProjectId]: {
              ...(prev[selectedProjectId] || { status: "stopped", url: null }),
              logs,
            },
          }));
        }
      });
    } else {
      setStats(null);
      if (lastWatchedPathRef.current) {
        await API.stopWatchingFolder(lastWatchedPathRef.current).catch(() => {});
        lastWatchedPathRef.current = null;
      }
    }

    return () => {
      cancelled = true;
      if (lastWatchedPathRef.current) {
        API.stopWatchingFolder(lastWatchedPathRef.current).catch(() => {});
        lastWatchedPathRef.current = null;
      }
    };
  }, [selectedProjectId]);

  useEffect(() => {
    let interval;
    let isCancelled = false;

    if (selectedProject?.status === "running") {
      const fetchStats = async () => {
        const data = await API.getProjectStats(selectedProject.id);
        if (!isCancelled) {
          setStats(data);
        }
      };
      fetchStats();
      interval = setInterval(fetchStats, 1000);
    } else {
      setStats(null);
    }

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [selectedProject?.id, selectedProject?.status]);

  const handleStart = async (id) => {
    const res = await API.startProject(id);
    if (!res?.success) {
      toast.error(`Failed to start project: ${res?.message || "Unknown error"}`);
    }
  };

  const handleStop = async (id) => {
    const res = await API.stopProject(id);
    if (!res?.success) {
      toast.error("Failed to stop project");
    }
  };

  const handleRestart = async (id) => {
    const res = await API.restartProject(id);
    if (!res?.success) {
      toast.error("Failed to restart project");
    }
  };

  const handleSendInput = async (id, data) => {
    return await API.sendInput(id, data);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to remove this project?")) {
      const success = await API.deleteProject(id);
      if (success) {
        toast.warning("Project removed");
        loadData();
        if (selectedProjectId === id) setSelectedProjectId(null);
        setLogs((prev) => {
          const newLogs = { ...prev };
          delete newLogs[id];
          return newLogs;
        });
        setProjectEditorStates((prev) => {
          const newStates = { ...prev };
          delete newStates[id];
          return newStates;
        });
        setTunnelState((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      } else {
        toast.error("Failed to remove project");
      }
    }
  };

  const handleUpdateProject = async (projectData, silent = false) => {
    const updated = await API.updateProject(projectData);
    if (updated) {
      const normalizedUpdated = normalizeProject(updated);
      if (!normalizedUpdated) {
        if (!silent) {
          toast.error("Failed to normalize updated project");
        }
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
    setProjectEditorStates((prev) => ({
      ...prev,
      [projectId]: filePath,
    }));
  };

  const selectedProjectEditorFile = selectedProject
    ? projectEditorStates[selectedProject.id]
    : null;

  const setIsAddProjectModalOpen = useSetAtom(atoms.isAddProjectModalOpenAtom);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar onProjectsChange={loadData} />

      <main className="flex-1 flex flex-col min-w-0 bg-background/50 relative overflow-hidden">
        {selectedProject ? (
          <>
            <ProjectHeader
              selectedProject={selectedProject}
              onStart={handleStart}
              onStop={handleStop}
              onRestart={handleRestart}
              onDelete={handleDelete}
              onUpdate={handleUpdateProject}
            />

            <div className="flex-1 flex flex-col min-h-0">
              <ViewTabs viewMode={viewMode} onViewModeChange={setViewMode} />

              <div className="flex-1 min-h-0 overflow-hidden relative bg-muted/40 backdrop-blur-md">
                {viewMode === "logs" ? (
                  <div className="h-full p-0">
                    <LogViewer
                      projectId={selectedProject.id}
                      status={selectedProject.status}
                      onSendInput={handleSendInput}
                    />
                  </div>
                ) : viewMode === "tunnel" ? (
                  <TunnelView
                    selectedProject={selectedProject}
                    onUpdateProject={handleUpdateProject}
                  />
                ) : (
                  <EditorView
                    projectId={selectedProject.id}
                    projectPath={selectedProject.path}
                    fileTree={fileTree}
                    isFileTreeLoading={isFileTreeLoading}
                    initialFile={selectedProjectEditorFile}
                    onFileSelect={(path) => handleEditorFileChange(selectedProject.id, path)}
                    onRefreshFileTree={() => loadFileTree(selectedProject.path)}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <EmptyState onAddProject={() => setIsAddProjectModalOpen(true)} />
        )}
      </main>
    </div>
  );
}
