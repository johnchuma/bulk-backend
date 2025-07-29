"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      // Transaction belongs to Client
      Transaction.belongsTo(models.Client, {
        foreignKey: "clientId",
        as: "client",
      });

      // Transaction belongs to Admin (who created it)
      Transaction.belongsTo(models.Admin, {
        foreignKey: "adminId",
        as: "admin",
      });
    }
  }

  Transaction.init(
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
      adminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "admins",
          key: "id",
        },
      },
      smsQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Transaction",
      tableName: "transactions",
      hooks: {
        afterCreate: async (transaction) => {
          // Update client's SMS balance after transaction
          const smsBalance = await sequelize.models.SmsBalance.findOne({
            where: { clientId: transaction.clientId },
          });

          if (smsBalance) {
            await smsBalance.increment("totalSmsAvailable", {
              by: transaction.smsQuantity,
            });
          }
        },
      },
    }
  );

  return Transaction;
};
