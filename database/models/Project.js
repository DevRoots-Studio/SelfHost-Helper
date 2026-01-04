import { DataTypes, Model } from "sequelize";

export class Project extends Model {}

export const initProjectModel = (sequelize) => {
  Project.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      path: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      script: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "npm start",
      },
      autoStart: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      env: {
        type: DataTypes.TEXT, // JSON string or text
        get() {
          const rawValue = this.getDataValue("env");
          if (!rawValue) return {};
          try {
            return JSON.parse(rawValue);
          } catch (e) {
            // If the stored value is corrupted, return an empty object and log a warning
            // This prevents the app from throwing when reading malformed env data
            // during runtime while preserving the raw value in the DB.
            console.warn(
              `Project.env contains invalid JSON for project id=${this.id}:`,
              e
            );
            return {};
          }
        },
        set(value) {
          this.setDataValue("env", JSON.stringify(value));
        },
      },
      pid: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "node",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
    },
    {
      sequelize,
      modelName: "Project",
    }
  );
};
