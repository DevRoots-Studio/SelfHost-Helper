import { useState, useEffect } from "react";
import LogViewer from "@/components/LogViewer";
import Sidebar from "@/components/Sidebar";
import ProjectHeader from "@/components/ProjectHeader";
import ViewTabs from "@/components/ViewTabs";
import EditorView from "@/components/EditorView";
import EmptyState from "@/components/EmptyState";

const API = window.api;

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [logs, setLogs] = useState({});
  const [viewMode, setViewMode] = useState("logs");
  const [fileTree, setFileTree] = useState([]);
  const [isFileTreeLoading, setIsFileTreeLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    loadProjects();
    const cleanupStatus = API.onStatusChange(
      ({ projectId, status, startTime }) => {
        setProjects((prev) => {
          const updated = prev.map((p) =>
            p.id === projectId ? { ...p, status, startTime } : p
          );
          return updated;
        });
        setSelectedProject((prevSelected) => {
          if (prevSelected?.id === projectId) {
            return { ...prevSelected, status, startTime };
          }
          return prevSelected;
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
    if (selectedProject) {
      const syncProjectStatus = async () => {
        const list = await API.getProjects();
        setProjects(list);
        // Update selectedProject with the latest data from projects array
        const updatedProject = list.find((p) => p.id === selectedProject.id);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      };
      syncProjectStatus();

      API.getLogHistory(selectedProject.id).then((history) => {
        if (history && history.length > 0) {
          setLogs((prev) => ({
            ...prev,
            [selectedProject.id]: history,
          }));
        }
      });

      // Load File Tree
      loadFileTree(selectedProject.path);
    }
  }, [selectedProject?.id]);

  const loadFileTree = async (path) => {
    setIsFileTreeLoading(true);
    const tree = await API.readDirectory(path);
    setFileTree(tree);
    setIsFileTreeLoading(false);
  };

  const loadProjects = async () => {
    const list = await API.getProjects();
    setProjects(list);
  };

  const handleStart = (id) => API.startProject(id);
  const handleStop = (id) => API.stopProject(id);
  const handleRestart = (id) => API.restartProject(id);

  const handleSendInput = async (id, data) => {
    const res = await API.sendInput(id, data);
    return res;
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to remove this project?")) {
      await API.deleteProject(id);
      loadProjects();
      if (selectedProject?.id === id) setSelectedProject(null);
    }
  };

  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Poll stats if project is running
    let interval;
    if (selectedProject?.status === "running") {
      const fetchStats = async () => {
        const data = await API.getProjectStats(selectedProject.id);
        setStats(data);
      };
      fetchStats();
      interval = setInterval(fetchStats, 1000);
    } else {
      setStats(null);
    }

    return () => clearInterval(interval);
  }, [selectedProject?.id, selectedProject?.status]);

  const [projectEditorStates, setProjectEditorStates] = useState({});

  const handleUpdateProject = async (projectData) => {
    const updated = await API.updateProject(projectData);
    if (updated) {
      loadProjects();
      if (selectedProject?.id === updated.id) {
        setSelectedProject((prev) => ({ ...prev, ...updated }));
      }
    }
  };

  const handleEditorFileChange = (projectId, filePath) => {
    setProjectEditorStates((prev) => ({
      ...prev,
      [projectId]: filePath,
    }));
  };

  const activeLogs = selectedProject ? logs[selectedProject.id] || [] : [];
  const selectedProjectEditorFile = selectedProject
    ? projectEditorStates[selectedProject.id]
    : null;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        onProjectSelect={setSelectedProject}
        onProjectsChange={loadProjects}
        isAddOpen={isAddOpen}
        onAddOpenChange={setIsAddOpen}
      />

      {/* Main Content */}
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
              <ViewTabs
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                stats={stats}
              />

              <div className="flex-1 overflow-hidden relative">
                {viewMode === "logs" ? (
                  <div className="h-full p-0">
                    <LogViewer
                      logs={activeLogs}
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
          <EmptyState onAddProject={() => setIsAddOpen(true)} />
        )}
      </main>
    </div>
  );
}
