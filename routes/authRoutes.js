const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// Validation rules
const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
];

// Admin login
router.post("/admin/login", loginValidation, authController.adminLogin);

// Client login
router.post("/client/login", loginValidation, authController.clientLogin);

// Client user login
router.post(
  "/client-user/login",
  loginValidation,
  authController.clientUserLogin
);

// Verify token
router.get("/verify", verifyToken, authController.verifyToken);

module.exports = router;
