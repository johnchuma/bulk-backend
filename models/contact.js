"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Contact extends Model {
    static associate(models) {
      // Contact belongs to Client
      Contact.belongsTo(models.Client, {
        foreignKey: "clientId",
        as: "client",
      });
    }
  }

  Contact.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      clientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "clients",
          key: "id",
        },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 255],
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [10, 20],
        },
      },
    },
    {
      sequelize,
      modelName: "Contact",
      tableName: "contacts",
      indexes: [
        {
          unique: true,
          fields: ["clientId", "phone"],
        },
      ],
    }
  );

  return Contact;
};
