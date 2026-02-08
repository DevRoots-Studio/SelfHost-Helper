import { Database, JSONDriver, Table } from "st.db";
import path from "path";
import { app } from "electron";
import crypto from "crypto";
import logger from "./logger.js";
import { encryptSecret, decryptSecret } from "./secretStore.js";
import fs from "fs";

let db = null;
let projectTable = null;
let categoryTable = null;

/**
 * Initialize st.db and migrate data from SQLite if necessary.
 */
export const initializeDatabase = async () => {
  try {
    const userDataPath = app.getPath("userData");
    const dbFile = path.join(userDataPath, "data.json");

    logger.info(`[Database] Initializing st.db at: ${dbFile}`);

    // 1. Initialize main Database with JSON Driver
    db = new Database({
      driver: new JSONDriver(dbFile),
    });

    // 2. Initialize Tables
    projectTable = new Table("projects", db);
    categoryTable = new Table("categories", db);

    logger.info("[Database] st.db initialized and tables ready.");

    // 3. Migration logic (SQLite -> JSON)
    const sqlitePath =
      process.env.NODE_ENV === "development"
        ? path.join(userDataPath, "projects-dev.sqlite")
        : path.join(userDataPath, "projects.sqlite");

    if (fs.existsSync(sqlitePath)) {
      logger.info(
        `[Database] Found legacy SQLite database at ${sqlitePath}. Starting migration...`,
      );
      await migrateFromSQLite(sqlitePath);
    } else {
      logger.debug(
        "[Database] No legacy SQLite database found. Skipping migration.",
      );
    }
  } catch (err) {
    logger.error("[Database] Failed to initialize st.db:", err.message || err);
    throw err; // Re-throw to prevent app from starting in broken state
  }
};

/**
 * Migration helper
 */
async function migrateFromSQLite(sqlitePath) {
  try {
    const { Sequelize } = await import("sequelize");
    const tempSequelize = new Sequelize({
      dialect: "sqlite",
      storage: sqlitePath,
      logging: false,
    });

    const { initProjectModel, Project } =
      await import("../../database/models/Project.js");
    const { initCategoryModel, Category } =
      await import("../../database/models/Category.js");

    initProjectModel(tempSequelize);
    initCategoryModel(tempSequelize);

    const categories = await Category.findAll();
    const projects = await Project.findAll();

    if (categories.length > 0 || projects.length > 0) {
      logger.info(
        `[Migration] Found ${categories.length} categories and ${projects.length} projects in SQLite. Migrating...`,
      );

      for (const cat of categories) {
        const data = cat.toJSON();
        if (!(await categoryTable.has(data.id.toString()))) {
          await categoryTable.set(data.id.toString(), data);
        }
      }

      for (const proj of projects) {
        const data = proj.toJSON();
        if (!(await projectTable.has(data.id.toString()))) {
          await projectTable.set(data.id.toString(), data);
        }
      }

      logger.info("[Migration] Data migration to st.db complete.");

      // Close the connection before renaming to avoid EBUSY
      await tempSequelize.close();
      logger.info("[Migration] SQLite connection closed.");

      // Rename sqlite file to backup so we don't migrate again
      const backupPath = sqlitePath + ".backup_" + Date.now();
      await fs.promises.rename(sqlitePath, backupPath);
      logger.info(`[Migration] SQLite file backed up to ${backupPath}`);
    } else {
      // Even if no data, we should close and backup to avoid repeating empty checks
      await tempSequelize.close();
      const backupPath = sqlitePath + ".backup_empty_" + Date.now();
      await fs.promises.rename(sqlitePath, backupPath);
    }
  } catch (err) {
    logger.error("[Migration] Error during migration:", err);
  }
}

// ---------------- Helper Methods ----------------

export const getProjects = async () => {
  if (!projectTable) return [];
  const entries = await projectTable.all();
  return entries
    .map((e) => {
      const data = e.data;
      if (data.encryptedTunnelToken) {
        data.encryptedTunnelToken = decryptSecret(data.encryptedTunnelToken);
      }
      return data;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const getProjectById = async (id) => {
  if (!projectTable) return null;
  const data = await projectTable.get(id.toString());
  if (data && data.encryptedTunnelToken) {
    data.encryptedTunnelToken = decryptSecret(data.encryptedTunnelToken);
  }
  return data;
};

export const addProject = async (projectData) => {
  if (!projectTable) return null;
  const projects = await projectTable.all();
  const nextId =
    projects.length > 0
      ? Math.max(...projects.map((p) => parseInt(p.ID) || 0)) + 1
      : 1;
  const id = nextId.toString();

  const data = {
    ...projectData,
    id: nextId, // Keep numeric id for UI compatibility
    uuid: crypto.randomUUID(),
    order: projectData.order || 0,
    encryptedTunnelToken: encryptSecret(projectData.encryptedTunnelToken || ""),
  };

  await projectTable.set(id, data);
  return { ...data, encryptedTunnelToken: projectData.encryptedTunnelToken };
};

export const updateProject = async (projectData) => {
  if (!projectTable) return null;
  const id = projectData.id.toString();
  const existing = await projectTable.get(id);
  if (!existing) return null;

  const updatedData = { ...existing, ...projectData };
  if (projectData.encryptedTunnelToken !== undefined) {
    updatedData.encryptedTunnelToken = encryptSecret(
      projectData.encryptedTunnelToken,
    );
  }

  await projectTable.set(id, updatedData);
  return {
    ...updatedData,
    encryptedTunnelToken:
      projectData.encryptedTunnelToken ||
      decryptSecret(updatedData.encryptedTunnelToken),
  };
};

export const deleteProject = async (id) => {
  if (!projectTable) return false;
  await projectTable.delete(id.toString());
  return true;
};

export const getCategories = async () => {
  if (!categoryTable) return [];
  const entries = await categoryTable.all();
  return entries
    .map((e) => e.data)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const addCategory = async (categoryData) => {
  if (!categoryTable) return null;
  const categories = await categoryTable.all();
  const nextId =
    categories.length > 0
      ? Math.max(...categories.map((c) => parseInt(c.ID) || 0)) + 1
      : 1;
  const id = nextId.toString();

  const data = {
    ...categoryData,
    id: nextId,
    uuid: crypto.randomUUID(),
    order: categoryData.order || 0,
  };

  await categoryTable.set(id, data);
  return data;
};

export const deleteCategory = async (id) => {
  if (!categoryTable) return false;
  await categoryTable.delete(id.toString());
  return true;
};

export const updateCategory = async (categoryData) => {
  if (!categoryTable) return null;
  const id = categoryData.id.toString();
  const existing = await categoryTable.get(id);
  if (!existing) return null;

  const updatedData = { ...existing, ...categoryData };
  await categoryTable.set(id, updatedData);
  return updatedData;
};

export const reorderProjects = async (payload, categoryId = undefined) => {
  for (const { id, order } of payload) {
    const idStr = id.toString();
    const existing = await projectTable.get(idStr);
    if (existing) {
      const updated = { ...existing, order };
      if (categoryId !== undefined) {
        updated.categoryId = categoryId;
      }
      await projectTable.set(idStr, updated);
    }
  }
  return true;
};

export const reorderCategories = async (orders) => {
  // orders is expected to be an object: { id: order, ... }
  const entries = Object.entries(orders);
  for (const [id, order] of entries) {
    const idStr = id.toString();
    const existing = await categoryTable.get(idStr);
    if (existing) {
      const updated = { ...existing, order };
      await categoryTable.set(idStr, updated);
    }
  }
  return true;
};
