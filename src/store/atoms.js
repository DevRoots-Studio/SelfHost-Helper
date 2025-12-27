import { atom } from "jotai";

// List of all projects
export const projectsAtom = atom([]);

// The ID of the currently selected project
export const selectedProjectIdAtom = atom(null);

// Derived atom to get the full project object
export const selectedProjectAtom = atom((get) => {
  const projects = get(projectsAtom);
  const selectedId = get(selectedProjectIdAtom);
  return projects.find((p) => p.id === selectedId) || null;
});

// Logs stored by project ID
export const logsAtom = atom({});

// Performance stats for the current project
export const statsAtom = atom(null);

// View mode (logs or editor)
export const viewModeAtom = atom("logs");

// File tree and its loading state
export const fileTreeAtom = atom([]);
export const isFileTreeLoadingAtom = atom(false);

// Editor file states per project
export const projectEditorStatesAtom = atom({});

// Modal states
export const isAddProjectModalOpenAtom = atom(false);
