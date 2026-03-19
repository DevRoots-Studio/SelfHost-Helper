import { useCallback, useEffect, useRef, useState } from "react";

export default function useProjectLayout({ projectId, defaultLayout }) {
  const [layout, setLayout] = useState(defaultLayout);
  const saveTimerRef = useRef(null);
  const defaultLayoutRef = useRef(defaultLayout);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    defaultLayoutRef.current = defaultLayout;
  }, [defaultLayout]);

  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (projectId == null) return;

    const key = `selfhost-overview-grid:${projectId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setLayout(defaultLayout);
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) setLayout(parsed);
      else setLayout(defaultLayout);
    } catch {
      setLayout(defaultLayout);
    }
  }, [projectId, defaultLayout]);

  const onLayoutChange = (nextLayout) => {
    setLayout(nextLayout);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (projectId == null) return;
      const key = `selfhost-overview-grid:${projectId}`;
      try {
        localStorage.setItem(key, JSON.stringify(nextLayout));
      } catch {
        // Ignore storage errors (private mode / quota).
      }
    }, 250);
  };

  const resetLayout = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;

    // Reset immediately in the UI.
    setLayout(defaultLayoutRef.current);

    // Clear persisted layout for the current project.
    const key = `selfhost-overview-grid:${projectIdRef.current}`;
    if (projectIdRef.current == null) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors (private mode / quota).
    }
  }, []);

  return { layout, onLayoutChange, resetLayout };
}
