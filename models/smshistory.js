"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SmsHistory extends Model {
    static associate(models) {
      SmsHistory.belongsTo(models.Client, {
        foreignKey: "clientId",
        as: "client",
      });
    }
  }

  SmsHistory.init(
    {
      clientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "clients",
          key: "id",
        },
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      recipientCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      smsUsed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      status: {
        type: DataTypes.ENUM("sent", "failed", "delivered", "pending"),
        allowNull: false,
        defaultValue: "sent",
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "SmsHistory",
      tableName: "sms_history",
      timestamps: true,
    }
  );

  return SmsHistory;
};
