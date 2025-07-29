const express = require("express");
const { body } = require("express-validator");
const contactController = require("../controllers/contactController");
const smsController = require("../controllers/smsController");
const { verifyToken, isClient } = require("../middleware/auth");

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(isClient);

// Validation rules
const contactValidation = [
  body("name").trim().isLength({ min: 1, max: 255 }),
  body("phone").trim().isLength({ min: 10, max: 20 }),
];

const bulkImportValidation = [
  body("contacts").isArray({ min: 1 }),
  body("contacts.*.name").trim().isLength({ min: 1, max: 255 }),
  body("contacts.*.phone").trim().isLength({ min: 10, max: 20 }),
];

const smsValidation = [
  body("message").trim().isLength({ min: 1, max: 1000 }),
  body("sendToAll").optional().isBoolean(),
  body("contactIds").optional().isArray(),
];

// Contact routes
router.get("/contacts", contactController.getContacts);
router.get("/contacts/:id", contactController.getContact);
router.post("/contacts", contactValidation, contactController.createContact);
router.put("/contacts/:id", contactValidation, contactController.updateContact);
router.delete("/contacts/:id", contactController.deleteContact);
router.post("/contacts/import", contactController.importContacts);
router.get("/contacts/export", contactController.exportContacts);

// SMS routes
router.post("/send-sms", smsValidation, smsController.sendSms);
router.get("/balance", smsController.getSmsBalance);
router.get("/sms-history", smsController.getSmsHistory);

module.exports = router;
