const express = require("express");
const { body } = require("express-validator");
const adminController = require("../controllers/adminController");
const { verifyToken, isAdmin } = require("../middleware/auth");

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(isAdmin);

// Validation rules
const clientValidation = [
  body("name").trim().isLength({ min: 1, max: 255 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
];

const clientUpdateValidation = [
  body("name").trim().isLength({ min: 1, max: 255 }),
  body("email").isEmail().normalizeEmail(),
  body("password").optional().isLength({ min: 6 }),
];

const transactionValidation = [
  body("clientId").isInt({ min: 1 }),
  body("smsQuantity").isInt({ min: 1 }),
  body("totalAmount").isFloat({ min: 0 }),
  body("description").optional().trim(),
];

const clientUserValidation = [
  body("clientId").isInt({ min: 1 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").optional().trim(),
];

// Client management routes
router.get("/clients", adminController.getClients);
router.get("/clients/:id", adminController.getClient);
router.post("/clients", clientValidation, adminController.createClient);
router.put(
  "/clients/:id",
  clientUpdateValidation,
  adminController.updateClient
);
router.delete("/clients/:id", adminController.deleteClient);

// Transaction management routes
router.get("/transactions", adminController.getTransactions);
router.post(
  "/transactions",
  transactionValidation,
  adminController.createTransaction
);

// Client user management routes
router.post(
  "/client-users",
  clientUserValidation,
  adminController.createClientUser
);

module.exports = router;
