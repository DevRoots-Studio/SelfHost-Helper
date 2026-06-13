import { useCallback, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useAtom, useSetAtom } from "jotai";
import * as atoms from "@/store/atoms";
import { toast } from "react-toastify";
import { toNullableNumber } from "@/lib/normalizeProject";
import { normalizeProjectList, normalizeCategoryList } from "@/lib/normalizeProject";
import Sidebar from "@/components/Sidebar";

const API = window.api;

export default function Dashboard() {
  const [projects, setProjects] = useAtom(atoms.projectsAtom);
  const setCategories = useSetAtom(atoms.categoriesAtom);
  const setLogs = useSetAtom(atoms.logsAtom);
  const setTunnelState = useSetAtom(atoms.tunnelStateAtom);
  const setResourceHistory = useSetAtom(atoms.resourceHistoryAtom);

  const loadData = useCallback(async () => {
    const [projectList, categoryList] = await Promise.all([API.getProjects(), API.getCategories()]);
    setProjects(normalizeProjectList(projectList));
    setCategories(normalizeCategoryList(categoryList));
  }, [setCategories, setProjects]);

  useEffect(() => {
    loadData();
    const cleanupStats = API.onProjectStats((payload) => {
      const pid = toNullableNumber(payload.projectId);
      if (pid === null) return;

      // Update global resource history
      setResourceHistory((prev) => {
        const existing = prev[pid]?.samples ?? [];
        const next = [
          ...existing,
          {
            t: payload.timestamp,
            cpu: payload.cpu ?? 0,
            memory: payload.memory ?? 0,
            processCount: payload.processCount ?? 0,
          },
        ].slice(-120);
        return { ...prev, [pid]: { samples: next } };
      });
    });

    const cleanupStatus = API.onStatusChange(({ projectId, status, startTime }) => {
      const normalizedProjectId = toNullableNumber(projectId);
      if (normalizedProjectId === null) return;
      setProjects((prev) => {
        const project = prev.find((p) => p.id === normalizedProjectId);
        if (project && project.status !== status) {
          if (status === "running") toast.success(`${project.name} is now running`);
          else if (status === "stopped") toast.info(`${project.name} has stopped`);
          else if (status === "error") toast.error(`${project.name} encountered an error`);
        }
        return prev.map((p) => (p.id === normalizedProjectId ? { ...p, status, startTime } : p));
      });
    });
    const cleanupStatusSync = API.onProjectStatusSync(({ running }) => {
      if (!Array.isArray(running) || running.length === 0) return;
      const runningById = new Map(
        running
          .map((r) => {
            const id = toNullableNumber(r.id);
            return id != null ? [id, r] : null;
          })
          .filter(Boolean)
      );
      setProjects((prev) =>
        prev.map((p) => {
          const r = runningById.get(p.id);
          if (!r) return p;
          const startTime = r.startTime != null ? new Date(r.startTime) : null;
          return { ...p, status: "running", startTime };
        })
      );
    });
    const cleanupList = API.onProjectsChange(() => loadData());
    const appendLogs = (projectId, logEntries) => {
      setLogs((prev) => {
        const currentLogs = prev[projectId] || [];
        const newLogs = [...currentLogs, ...logEntries];
        if (newLogs.length > 1000) {
          return { ...prev, [projectId]: newLogs.slice(newLogs.length - 1000) };
        }
        return { ...prev, [projectId]: newLogs };
      });
    };
    const cleanupLogs = API.onLog(({ projectId, data, type, timestamp }) => {
      appendLogs(projectId, [{ data, type, timestamp }]);
    });
    const cleanupLogsBatch = API.onLogsBatch(({ projectId, logs }) => {
      appendLogs(
        projectId,
        logs.map(({ data, type, timestamp }) => ({ data, type, timestamp }))
      );
    });
    const cleanupLogsCleared = API.onLogsCleared((projectId) => {
      setLogs((prev) => ({ ...prev, [projectId]: [] }));
    });
    const cleanupTunnelStatus = API.onTunnelStatus(({ projectId, status, url, error }) => {
      setTunnelState((prev) => ({
        ...prev,
        [projectId]: { ...(prev[projectId] || { logs: [] }), status, url, error },
      }));
    });
    const cleanupTunnelLog = API.onTunnelLog(({ projectId, message, type, timestamp }) => {
      setTunnelState((prev) => {
        const projectState = prev[projectId] || { status: "stopped", url: null, logs: [] };
        const newLogs = [...(projectState.logs || []), { message, type, timestamp }];
        const trimmedLogs = newLogs.length > 100 ? newLogs.slice(-100) : newLogs;
        return { ...prev, [projectId]: { ...projectState, logs: trimmedLogs } };
      });
    });
    return () => {
      cleanupStats();
      cleanupStatus();
      cleanupStatusSync();
      cleanupList();
      cleanupLogs();
      cleanupLogsBatch();
      cleanupLogsCleared();
      cleanupTunnelStatus();
      cleanupTunnelLog();
    };
  }, [loadData, setLogs, setProjects, setResourceHistory, setTunnelState]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar onProjectsChange={loadData} />
      <main className="flex-1 flex flex-col min-w-0 bg-background/50 relative overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
