const isDev = import.meta.env.DEV;
const warnedInvalidProjectIds = new Set();
const warnedInvalidCategoryIds = new Set();

export const toNullableNumber = (value) => {
  if (value === null || value === undefined) return null;
  const normalizedValue = typeof value === "string" ? value.trim() : value;
  if (normalizedValue === "") return null;
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toOrderNumber = (value) => {
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

export const normalizeProject = (project) => {
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

export const normalizeCategory = (category) => {
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

export const normalizeProjectList = (projectList = []) =>
  projectList.map(normalizeProject).filter(Boolean);
export const normalizeCategoryList = (categoryList = []) =>
  categoryList.map(normalizeCategory).filter(Boolean);
