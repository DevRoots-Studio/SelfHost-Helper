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
            console.warn(`Project.env contains invalid JSON for project id=${this.id}:`, e);
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
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Categories",
          key: "id",
        },
      },
      tunnelMode: {
        type: DataTypes.STRING,
        defaultValue: "quick",
      },
      tunnelPort: {
        type: DataTypes.INTEGER,
        defaultValue: 3000,
      },
      encryptedTunnelToken: {
        type: DataTypes.STRING,
        defaultValue: "",
      },
      tunnelConfig: {
        type: DataTypes.TEXT,
        defaultValue: "{}",
        get() {
          const rawValue = this.getDataValue("tunnelConfig");
          if (!rawValue) return {};
          try {
            return JSON.parse(rawValue);
          } catch (e) {
            console.warn(
              `Project.tunnelConfig contains invalid JSON for project id=${this.id}:`,
              e
            );
            return {};
          }
        },
        set(value) {
          this.setDataValue("tunnelConfig", JSON.stringify(value));
        },
      },
      autoStartTunnel: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      clearLogsBeforeStart: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Project",
      hooks: {
        beforeSave: async (project) => {
          if (project.changed("encryptedTunnelToken")) {
            const { encryptSecret } = await import("../../electron/services/secretStore.js");
            project.encryptedTunnelToken = encryptSecret(project.encryptedTunnelToken);
          }
        },
        afterFind: async (results) => {
          if (!results) return;
          const { decryptSecret } = await import("../../electron/services/secretStore.js");
          const decrypt = (project) => {
            if (project.encryptedTunnelToken) {
              project.setDataValue(
                "encryptedTunnelToken",
                decryptSecret(project.encryptedTunnelToken)
              );
            }
          };

          if (Array.isArray(results)) {
            results.forEach(decrypt);
          } else {
            decrypt(results);
          }
        },
        afterSave: async (project) => {
          if (project.encryptedTunnelToken) {
            const { decryptSecret } = await import("../../electron/services/secretStore.js");
            const decrypted = decryptSecret(project.encryptedTunnelToken);
            project.setDataValue("encryptedTunnelToken", decrypted);
            project.changed("encryptedTunnelToken", false);
          }
        },
      },
    }
  );
};
