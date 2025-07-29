"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SmsBalance extends Model {
    static associate(models) {
      // SmsBalance belongs to Client
      SmsBalance.belongsTo(models.Client, {
        foreignKey: "clientId",
        as: "client",
      });
    }

    // Instance method to check if client has enough SMS balance
    hasEnoughBalance(smsCount) {
      return this.totalSmsAvailable >= smsCount;
    }

    // Instance method to deduct SMS from balance
    async deductSms(smsCount) {
      if (!this.hasEnoughBalance(smsCount)) {
        throw new Error("Insufficient SMS balance");
      }

      await this.decrement("totalSmsAvailable", { by: smsCount });
      await this.reload();
      return this;
    }
  }

  SmsBalance.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      clientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: "clients",
          key: "id",
        },
      },
      totalSmsAvailable: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
    },
    {
      sequelize,
      modelName: "SmsBalance",
      tableName: "sms_balances",
    }
  );

  return SmsBalance;
};
