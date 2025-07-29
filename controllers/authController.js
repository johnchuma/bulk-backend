const jwt = require("jsonwebtoken");
const { Admin, Client, ClientUser } = require("../models");
const { validationResult } = require("express-validator");

// Generate JWT token
const generateToken = (user, userType) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      userType: userType,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Admin login
const adminLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find admin
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isValidPassword = await admin.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(admin, "admin");

    res.json({
      success: true,
      message: "Admin login successful",
      data: {
        user: admin,
        token,
        userType: "admin",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// Client login
const clientLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find client
    const client = await Client.findOne({ where: { email } });
    if (!client) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isValidPassword = await client.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(client, "client");

    res.json({
      success: true,
      message: "Client login successful",
      data: {
        user: client,
        token,
        userType: "client",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// Client User login
const clientUserLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find client user
    const clientUser = await ClientUser.findOne({
      where: { email },
      include: [{ model: Client, as: "client" }],
    });

    if (!clientUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isValidPassword = await clientUser.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(clientUser, "client_user");

    res.json({
      success: true,
      message: "Client user login successful",
      data: {
        user: clientUser,
        token,
        userType: "client_user",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// Verify token endpoint
const verifyToken = async (req, res) => {
  try {
    // Token is already verified by middleware
    res.json({
      success: true,
      message: "Token is valid",
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during token verification",
      error: error.message,
    });
  }
};

module.exports = {
  adminLogin,
  clientLogin,
  clientUserLogin,
  verifyToken,
};
