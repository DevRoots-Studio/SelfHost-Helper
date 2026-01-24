import { Sequelize } from "sequelize";
import path from "path";
import { app } from "electron";
import crypto from "crypto";
import logger from "./logger.js";

// Ensure userData path is used for the DB file so it persists
// Only available after app is ready, but we call initializeDatabase after app ready.
let sequelize;

export const initializeDatabase = async () => {
  const userDataPath = app.getPath("userData");
  const dbPath =
    process.env.NODE_ENV === "development"
      ? path.join(userDataPath, "projects-dev.sqlite")
      : path.join(userDataPath, "projects.sqlite");

  logger.info("Database path:", dbPath);

  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: dbPath,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    logger.info("Database connection has been established successfully.");

    // Import models manually or via a loader
    // We will import and init them here
    const { initProjectModel, Project } = await import(
      "../../database/models/Project.js"
    );
    const { initCategoryModel, Category } = await import(
      "../../database/models/Category.js"
    );

    initProjectModel(sequelize);
    initCategoryModel(sequelize);

    // Associations
    Category.hasMany(Project, { foreignKey: "categoryId", as: "projects" });
    Project.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

    // Migration logic for tunnelToken -> encryptedTunnelToken
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable("Projects");
    if (tableInfo.tunnelToken && !tableInfo.encryptedTunnelToken) {
      logger.info("Migrating Projects table: renaming tunnelToken to encryptedTunnelToken");
      await queryInterface.renameColumn("Projects", "tunnelToken", "encryptedTunnelToken");
      
      // Re-encryption pass for legacy plaintext tokens
      const projects = await Project.findAll();
      for (const project of projects) {
        if (project.encryptedTunnelToken) {
          // Explicitly mark as changed to trigger beforeSave encryption hook
          project.changed("encryptedTunnelToken", true);
          await project.save();
        }
      }
      logger.info("Migration complete: re-encrypted legacy tunnel tokens.");
    }

    // For SQLite, disable foreign key checks during sync to allow table recreation
    await sequelize.query("PRAGMA foreign_keys = OFF");
    try {
      // Clear any potential stale backup tables left from previous failed syncs
      await sequelize.query("DROP TABLE IF EXISTS `Categories_backup`").catch(() => {});
      await sequelize.query("DROP TABLE IF EXISTS `Projects_backup`").catch(() => {});
      
      await sequelize.sync({ alter: true });
      logger.info("Database synced");
    } catch (syncError) {
      logger.error("Database sync failed, attempting plain sync:", syncError);
      await sequelize.sync().catch(e => logger.error("Plain sync also failed:", e));
    } finally {
      await sequelize.query("PRAGMA foreign_keys = ON");
    }

    // Post-sync fix for SQLite: Ensure all projects have a UUID and an Order
    const projects = await Project.findAll();
    for (const project of projects) {
      let needsSave = false;
      if (!project.uuid) {
        project.uuid = crypto.randomUUID();
        needsSave = true;
      }
      if (project.order === null || project.order === undefined) {
        project.order = 0;
        needsSave = true;
      }
      if (needsSave) {
        await project.save();
      }
    }
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
  }
};

export const getSequelize = () => sequelize;
