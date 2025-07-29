"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  class Client extends Model {
    static associate(models) {
      // Client has many contacts
      Client.hasMany(models.Contact, {
        foreignKey: "clientId",
        as: "contacts",
      });

      // Client has many transactions
      Client.hasMany(models.Transaction, {
        foreignKey: "clientId",
        as: "transactions",
      });

      // Client has one SMS balance
      Client.hasOne(models.SmsBalance, {
        foreignKey: "clientId",
        as: "smsBalance",
      });

      // Client has many users
      Client.hasMany(models.ClientUser, {
        foreignKey: "clientId",
        as: "users",
      });
    }

    // Instance method to check password
    async validatePassword(password) {
      return await bcrypt.compare(password, this.password);
    }

    // Instance method to get client info without password
    toJSON() {
      const values = { ...this.get() };
      delete values.password;
      return values;
    }
  }

  Client.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
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
    },
    {
      sequelize,
      modelName: "Client",
      tableName: "clients",
      hooks: {
        beforeCreate: async (client) => {
          if (client.password) {
            client.password = await bcrypt.hash(client.password, 10);
          }
        },
        beforeUpdate: async (client) => {
          if (client.changed("password")) {
            client.password = await bcrypt.hash(client.password, 10);
          }
        },
        afterCreate: async (client) => {
          // Create SMS balance record for new client
          await sequelize.models.SmsBalance.create({
            clientId: client.id,
            totalSmsAvailable: 0,
          });
        },
      },
    }
  );

  return Client;
};
