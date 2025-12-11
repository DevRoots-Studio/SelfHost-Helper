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
          return rawValue ? JSON.parse(rawValue) : {};
        },
        set(value) {
          this.setDataValue("env", JSON.stringify(value));
        },
      },
    },
    {
      sequelize,
      modelName: "Project",
    }
  );
};
