const { Contact, SmsBalance, SmsHistory } = require("../models");
const { validationResult } = require("express-validator");
const sendSMS = require("../send_sms");
const addPrefixToPhoneNumber = require("../add_number_prefix");

const MAX_SMS_PER_REQUEST = 100000;

const sendSms = async (req, res) => {
  const transaction = await SmsBalance.sequelize.transaction();

  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { message, contactIds, sendToAll } = req.body;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Message is required and cannot be empty",
      });
    }

    // Get contacts
    let contacts = [];
    if (sendToAll) {
      contacts = await Contact.findAll({
        where: { clientId: req.clientId },
        transaction,
      });
    } else if (contactIds && Array.isArray(contactIds)) {
      contacts = await Contact.findAll({
        where: { id: contactIds, clientId: req.clientId },
        transaction,
      });
      if (contacts.length !== contactIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Some contacts not found or do not belong to this client",
        });
      }
    } else {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Contact IDs are required when not sending to all",
      });
    }

    if (contacts.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No contacts found to send SMS to",
      });
    }

    if (contacts.length > MAX_SMS_PER_REQUEST) {
      await transaction.rollback();
      return res.status(429).json({
        success: false,
        message: `Maximum ${MAX_SMS_PER_REQUEST} SMS per request exceeded`,
      });
    }

    // Check balance
    const smsBalance = await SmsBalance.findOne({
      where: { clientId: req.clientId },
      transaction,
    });

    if (!smsBalance || !smsBalance.hasEnoughBalance(contacts.length)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient SMS balance. Required: ${
          contacts.length
        }, Available: ${smsBalance?.totalSmsAvailable || 0}`,
      });
    }

    // Prepare phone numbers
    const numbers = contacts
      .map((c) => addPrefixToPhoneNumber(c.phone))
      .join(",");

    // Send all messages in one request
    const sendResponse = await sendSMS(numbers, message);

    // Deduct balance & record history
    await smsBalance.deductSms(contacts.length, { transaction });
    await SmsHistory.create(
      {
        clientId: req.clientId,
        message,
        recipientCount: contacts.length,
        smsUsed: contacts.length,
        status: sendResponse.success ? "sent" : "failed",
        createdAt: new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: "SMS sending completed",
      data: {
        totalContacts: contacts.length,
        status: sendResponse.success ? "sent" : "failed",
        gatewayResponse: sendResponse,
        remainingBalance: smsBalance.totalSmsAvailable,
      },
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Error sending SMS",
      error: error.message,
    });
  }
};

module.exports = { sendSms };
