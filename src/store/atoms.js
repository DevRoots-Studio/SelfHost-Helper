import { atom } from "jotai";

// List of all projects
export const projectsAtom = atom([]);

// List of all categories
export const categoriesAtom = atom([]);

// Logs stored by project ID
export const logsAtom = atom({});

// Performance stats for the current project (pushed from native monitor)
// Shape: { projectId, cpu, memory, uptime, mainPid, pids, processCount,
//          activeProcesses, timestamp, startTime?, supervisorType? } | null
export const statsAtom = atom(null);

// Per-project bounded history for timeline charts
// Shape: { [projectId: number]: { samples: Array<{ t, cpu, memory, processCount }> } }
export const resourceHistoryAtom = atom({});

// File tree and its loading state
export const fileTreeAtom = atom([]);
export const isFileTreeLoadingAtom = atom(false);

// Editor file states per project
export const projectEditorStatesAtom = atom({});

// Modal states
export const isAddProjectModalOpenAtom = atom(false);
export const isProjectSettingsOpenAtom = atom(false);

// Unsaved changes in projects (filePath -> content)
export const unsavedChangesAtom = atom({});

// Cloudflare Tunnel State (projectId -> { status, url, logs })
export const tunnelStateAtom = atom({});

// Window control buttons position: "left" | "right" (used for RTL / dev testing)
export const windowButtonsSideAtom = atom("right");
