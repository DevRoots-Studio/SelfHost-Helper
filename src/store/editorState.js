import { atom } from "jotai";
import { projectEditorStatesAtom } from "./atoms";

// Helpers for working with per-project editor state.

export const makeProjectEditorState = () => ({
  openTabs: [],
  activeTabId: null,
  explorerExpanded: {},
  lastActiveFile: null,
});

// Derived atom that exposes convenient read/write helpers. Components should
// generally prefer using these helpers via useAtom/useSetAtom rather than
// manipulating projectEditorStatesAtom directly.
export const editorStateFamilyAtom = atom(
  (get) => {
    const all = get(projectEditorStatesAtom) || {};
    return all;
  },
  (get, set, updater) => {
    const prev = get(projectEditorStatesAtom) || {};
    const next =
      typeof updater === "function"
        ? updater(prev)
        : updater;
    set(projectEditorStatesAtom, next || {});
  }
);

