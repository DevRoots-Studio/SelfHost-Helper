import { useEffect } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import * as atoms from "@/store/atoms";
import { toast } from "react-toastify";
import LogViewer from "@/components/LogViewer";
import Sidebar from "@/components/Sidebar";
import ProjectHeader from "@/components/ProjectHeader";
import ViewTabs from "@/components/ViewTabs";
import EditorView from "@/components/EditorView";
import EmptyState from "@/components/EmptyState";

const API = window.api;

export default function Dashboard() {
  const [projects, setProjects] = useAtom(atoms.projectsAtom);
  const [selectedProjectId, setSelectedProjectId] = useAtom(
    atoms.selectedProjectIdAtom
  );
  const selectedProject = useAtomValue(atoms.selectedProjectAtom);
  const setLogs = useSetAtom(atoms.logsAtom);
  const [viewMode, setViewMode] = useAtom(atoms.viewModeAtom);
  const [fileTree, setFileTree] = useAtom(atoms.fileTreeAtom);
  const [isFileTreeLoading, setIsFileTreeLoading] = useAtom(
    atoms.isFileTreeLoadingAtom
  );
  const setStats = useSetAtom(atoms.statsAtom);
  const [projectEditorStates, setProjectEditorStates] = useAtom(
    atoms.projectEditorStatesAtom
  );

  const loadProjects = async () => {
    const list = await API.getProjects();
    setProjects(list);
  };

  const loadFileTree = async (path) => {
    setIsFileTreeLoading(true);
    const tree = await API.readDirectory(path);
    setFileTree(tree);
    setIsFileTreeLoading(false);
  };

  useEffect(() => {
    loadProjects();
    const cleanupStatus = API.onStatusChange(
      ({ projectId, status, startTime }) => {
        setProjects((prev) => {
          const project = prev.find((p) => p.id === projectId);
          if (project && project.status !== status) {
            if (status === "running") {
              toast.success(`${project.name} is now running`);
            } else if (status === "stopped") {
              toast.info(`${project.name} has stopped`);
            } else if (status === "error") {
              toast.error(`${project.name} encountered an error`);
            }
          }
          return prev.map((p) =>
            p.id === projectId ? { ...p, status, startTime } : p
          );
        });
      }
    );
    const cleanupLogs = API.onLog(({ projectId, data, type, timestamp }) => {
      setLogs((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), { data, type, timestamp }],
      }));
    });

    return () => {
      cleanupStatus();
      cleanupLogs();
    };
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setStats(null); // Immediately clear stats on project switch
      const syncProjectStatus = async () => {
        const list = await API.getProjects();
        setProjects(list);
      };
      syncProjectStatus();

      API.getLogHistory(selectedProjectId).then((history) => {
        if (history && history.length > 0) {
          setLogs((prev) => ({
            ...prev,
            [selectedProjectId]: history,
          }));
        }
      });

      // Load File Tree
      const currentProject = projects.find((p) => p.id === selectedProjectId);
      if (currentProject) {
        loadFileTree(currentProject.path);
      }
    } else {
      setStats(null);
    }
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
      toast.error(
        `Failed to start project: ${res?.message || "Unknown error"}`
      );
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
        loadProjects();
        if (selectedProjectId === id) setSelectedProjectId(null);
      } else {
        toast.error("Failed to remove project");
      }
    }
  };

  const handleUpdateProject = async (projectData) => {
    const updated = await API.updateProject(projectData);
    if (updated) {
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
      toast.success("Settings saved");
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
      <Sidebar onProjectsChange={loadProjects} />

      <main className="flex-1 flex flex-col min-w-0 bg-background/50 relative">
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

              <div className="flex-1 overflow-hidden relative bg-muted/40 backdrop-blur-md">
                {viewMode === "logs" ? (
                  <div className="h-full p-0">
                    <LogViewer
                      projectId={selectedProject.id}
                      status={selectedProject.status}
                      onSendInput={handleSendInput}
                    />
                  </div>
                ) : (
                  <EditorView
                    projectId={selectedProject.id}
                    projectPath={selectedProject.path}
                    fileTree={fileTree}
                    isFileTreeLoading={isFileTreeLoading}
                    initialFile={selectedProjectEditorFile}
                    onFileSelect={(path) =>
                      handleEditorFileChange(selectedProject.id, path)
                    }
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
