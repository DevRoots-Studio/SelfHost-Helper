import React, { useState, useEffect } from "react";
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
    const cleanupStatus = API.onStatusChange(({ projectId, status }) => {
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === projectId ? { ...p, status } : p
        );
        return updated;
      });
      setSelectedProject((prevSelected) => {
        if (prevSelected?.id === projectId) {
          return { ...prevSelected, status };
        }
        return prevSelected;
      });
    });
    const cleanupLogs = API.onLog(({ projectId, data, type, timestamp }) => {
      setLogs((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), { data, type, timestamp }],
      }));
    });

    return () => {
      cleanupStatus();
      cleanupLogs();
      API.removeAllListeners("project:status");
      API.removeAllListeners("project:log");
    };
  }, [selectedProject?.id]);

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

  const handleSendInput = (id, data) => {
    API.sendInput(id, data);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to remove this project?")) {
      await API.deleteProject(id);
      loadProjects();
      if (selectedProject?.id === id) setSelectedProject(null);
    }
  };

  const activeLogs = selectedProject ? logs[selectedProject.id] || [] : [];

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
            />

            <div className="flex-1 flex flex-col min-h-0">
              <ViewTabs viewMode={viewMode} onViewModeChange={setViewMode} />

              <div className="flex-1 overflow-hidden relative">
                {viewMode === "logs" ? (
                  <div className="h-full p-0">
                    <LogViewer
                      logs={activeLogs}
                      projectId={selectedProject.id}
                      onSendInput={handleSendInput}
                    />
                  </div>
                ) : (
                  <EditorView
                    projectPath={selectedProject.path}
                    fileTree={fileTree}
                    isFileTreeLoading={isFileTreeLoading}
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
