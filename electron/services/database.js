import { Sequelize } from "sequelize";
import path from "path";
import { app } from "electron";

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
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

export const getSequelize = () => sequelize;
