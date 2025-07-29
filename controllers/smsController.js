const { Contact, SmsBalance, SmsHistory } = require("../models");
const { validationResult } = require("express-validator");
const sendSMS = require("../send_sms");

// Send SMS to contacts
const sendSms = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { message, contactIds, sendToAll } = req.body;

    // Get client's SMS balance
    const smsBalance = await SmsBalance.findOne({
      where: { clientId: req.clientId },
    });

    if (!smsBalance) {
      return res.status(404).json({
        success: false,
        message: "SMS balance not found",
      });
    }

    let contacts = [];

    if (sendToAll) {
      // Get all contacts for the client
      contacts = await Contact.findAll({
        where: { clientId: req.clientId },
      });
    } else {
      // Get specific contacts
      if (
        !contactIds ||
        !Array.isArray(contactIds) ||
        contactIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Contact IDs are required when not sending to all",
        });
      }

      contacts = await Contact.findAll({
        where: {
          id: contactIds,
          clientId: req.clientId,
        },
      });

      if (contacts.length !== contactIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some contacts not found or do not belong to this client",
        });
      }
    }

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No contacts found to send SMS to",
      });
    }

    // Calculate SMS count (simple logic: 1 message = 1 SMS unit per contact)
    const smsCount = contacts.length;

    // Check if client has enough balance
    if (!smsBalance.hasEnoughBalance(smsCount)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient SMS balance. Required: ${smsCount}, Available: ${smsBalance.totalSmsAvailable}`,
      });
    }

    // Simulate SMS sending (replace with actual SMS gateway integration)
    const sentMessages = [];
    const failedMessages = [];

    for (const contact of contacts) {
      try {
        // Here you would integrate with your SMS gateway
        // For now, we'll simulate successful sending
        const smsResult = await sendSMS(contact.phone, message);

        if (smsResult == 200) {
          sentMessages.push({
            contactId: contact.id,
            name: contact.name,
            phone: contact.phone,
            status: "sent",
          });
        } else {
          failedMessages.push({
            contactId: contact.id,
            name: contact.name,
            phone: contact.phone,
            status: "failed",
            error: smsResult.error,
          });
        }
      } catch (error) {
        failedMessages.push({
          contactId: contact.id,
          name: contact.name,
          phone: contact.phone,
          status: "failed",
          error: error.message,
        });
      }
    }

    // Deduct SMS count from balance (only for successful sends)
    const successfulSends = sentMessages.length;
    if (successfulSends > 0) {
      await smsBalance.deductSms(successfulSends);

      // Create SMS history record
      await SmsHistory.create({
        clientId: req.clientId,
        message: message,
        recipientCount: successfulSends,
        smsUsed: successfulSends,
        status: "sent",
      });
    }

    res.json({
      success: true,
      message: "SMS sending completed",
      data: {
        totalContacts: contacts.length,
        sentCount: sentMessages.length,
        failedCount: failedMessages.length,
        smsUsed: successfulSends,
        remainingBalance: smsBalance.totalSmsAvailable,
        sentMessages,
        failedMessages,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending SMS",
      error: error.message,
    });
  }
};

// Get SMS balance
const getSmsBalance = async (req, res) => {
  try {
    const smsBalance = await SmsBalance.findOne({
      where: { clientId: req.clientId },
    });

    if (!smsBalance) {
      return res.status(404).json({
        success: false,
        message: "SMS balance not found",
      });
    }

    res.json({
      success: true,
      message: "SMS balance retrieved successfully",
      data: { smsBalance },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving SMS balance",
      error: error.message,
    });
  }
};

// Get SMS history for client
const getSmsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: smsHistory } = await SmsHistory.findAndCountAll({
      where: { clientId: req.clientId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      message: "SMS history retrieved successfully",
      data: {
        smsHistory,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving SMS history",
      error: error.message,
    });
  }
};

// Simulate SMS sending function (replace with actual SMS gateway integration)
async function sendSmsToNumber(phoneNumber, message) {
  // This is a placeholder function
  // Replace with actual SMS gateway integration (e.g., Twilio, AfricasTalking, etc.)

  try {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate success (you can add logic to simulate some failures)
    const random = Math.random();
    if (random < 0.95) {
      // 95% success rate
      return {
        success: true,
        messageId: `msg_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        status: "sent",
      };
    } else {
      return {
        success: false,
        error: "Network error or invalid number",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendSms,
  getSmsBalance,
  getSmsHistory,
};
