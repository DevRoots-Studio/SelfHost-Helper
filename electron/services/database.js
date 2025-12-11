import { Sequelize, DataTypes } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { app } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure userData path is used for the DB file so it persists
// Only available after app is ready, but we call initializeDatabase after app ready.
let sequelize;

export const initializeDatabase = async () => {
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "projects.sqlite");

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

    await sequelize.sync(); // or sync({ alter: true }) for dev
    console.log("Database synced");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

export const getSequelize = () => sequelize;
