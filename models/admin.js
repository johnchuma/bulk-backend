"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    static associate(models) {
      // Admins can create transactions for clients
      Admin.hasMany(models.Transaction, {
        foreignKey: "adminId",
        as: "transactions",
      });
    }

    // Instance method to check password
    async validatePassword(password) {
      return await bcrypt.compare(password, this.password);
    }

    // Instance method to get admin info without password
    toJSON() {
      const values = { ...this.get() };
      delete values.password;
      return values;
    }
  }

  Admin.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [6, 100],
        },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Admin",
      tableName: "admins",
      hooks: {
        beforeCreate: async (admin) => {
          if (admin.password) {
            admin.password = await bcrypt.hash(admin.password, 10);
          }
        },
        beforeUpdate: async (admin) => {
          if (admin.changed("password")) {
            admin.password = await bcrypt.hash(admin.password, 10);
          }
        },
      },
    }
  );

  return Admin;
};
