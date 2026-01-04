import { Sequelize } from "sequelize";
import path from "path";
import { app } from "electron";
import crypto from "crypto";

// Ensure userData path is used for the DB file so it persists
// Only available after app is ready, but we call initializeDatabase after app ready.
let sequelize;

export const initializeDatabase = async () => {
  const userDataPath = app.getPath("userData");
  const dbPath =
    process.env.NODE_ENV === "development"
      ? path.join(userDataPath, "projects-dev.sqlite")
      : path.join(userDataPath, "projects.sqlite");

  console.log("Database path:", dbPath);

  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: dbPath,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    // Import models manually or via a loader
    // We will import and init them here
    const { initProjectModel } = await import(
      "../../database/models/Project.js"
    );
    initProjectModel(sequelize);

    await sequelize.sync({ alter: true });
    console.log("Database synced");

    // Post-sync fix for SQLite: Ensure all projects have a UUID and an Order
    const { Project } = await import("../../database/models/Project.js");
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
    console.error("Unable to connect to the database:", error);
  }
};

export const getSequelize = () => sequelize;
