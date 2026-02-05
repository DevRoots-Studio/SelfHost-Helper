import { Database, JSONDriver } from "st.db";
import path from "path";
import { app } from "electron";
import logger from "./logger.js";

class SettingsService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      const userDataPath = app.getPath("userData");
      const settingsFile = path.join(userDataPath, "settings.json");

      this.db = new Database({
        driver: new JSONDriver(settingsFile),
      });

      // Use .has() utility to check for existing keys
      if (!(await this.db.has("clearLogsBeforeStart"))) {
        await this.db.set("clearLogsBeforeStart", false);
      }

      logger.info("[SettingsService] Settings initialized with st.db.");
      this.initialized = true;
    } catch (err) {
      logger.error(
        "[SettingsService] Failed to initialize settings with st.db:",
        err,
      );
    }
  }

  /**
   * Get a setting by key using st.db's .get() method
   */
  async get(key) {
    if (!this.db) return null;
    return await this.db.get(key);
  }

  /**
   * Get all settings. st.db returns entries as {ID, data}.
   */
  async getAll() {
    if (!this.db) return {};
    const entries = await this.db.all();
    return entries.reduce((acc, entry) => {
      acc[entry.ID] = entry.data;
      return acc;
    }, {});
  }

  /**
   * Set a setting using st.db's .set() method
   */
  async set(key, value) {
    if (this.db) {
      await this.db.set(key, value);
      logger.debug(`[SettingsService] Setting ${key} updated.`);
    }
  }

  /**
   * Update multiple settings
   */
  async update(newSettings) {
    if (!this.db) return;
    for (const [key, value] of Object.entries(newSettings)) {
      await this.db.set(key, value);
    }
    logger.debug("[SettingsService] Settings updated.");
  }
}

const settingsService = new SettingsService();
export default settingsService;
