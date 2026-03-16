import { useParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { projectsAtom } from "@/store/atoms";

/**
 * Returns the project object for the current route's projectId, or null.
 */
export function useSelectedProject() {
  const { projectId } = useParams();
  const projects = useAtomValue(projectsAtom);
  const id = projectId != null ? Number(projectId) : null;
  if (id == null || !Number.isFinite(id)) return null;
  return projects.find((p) => p.id === id) ?? null;
}
