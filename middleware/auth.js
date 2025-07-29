const jwt = require("jsonwebtoken");
const { Admin, Client, ClientUser } = require("../models");

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin rights required.",
      });
    }

    // Verify admin exists
    const admin = await Admin.findByPk(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying admin status.",
    });
  }
};

// Check if user is client or client user
const isClient = async (req, res, next) => {
  try {
    if (!["client", "client_user"].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Client rights required.",
      });
    }

    let client;

    if (req.user.userType === "client") {
      client = await Client.findByPk(req.user.id);
      req.client = client;
      req.clientId = client.id;
    } else if (req.user.userType === "client_user") {
      const clientUser = await ClientUser.findByPk(req.user.id, {
        include: [{ model: Client, as: "client" }],
      });

      if (!clientUser) {
        return res.status(404).json({
          success: false,
          message: "Client user not found.",
        });
      }

      req.clientUser = clientUser;
      req.client = clientUser.client;
      req.clientId = clientUser.clientId;
    }

    if (!req.client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying client status.",
    });
  }
};

// Check if user is admin or belongs to the specified client
const isAdminOrClient = async (req, res, next) => {
  try {
    const clientId = req.params.clientId || req.body.clientId;

    if (req.user.userType === "admin") {
      const admin = await Admin.findByPk(req.user.id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found.",
        });
      }
      req.admin = admin;
      return next();
    }

    if (["client", "client_user"].includes(req.user.userType)) {
      let userClientId;

      if (req.user.userType === "client") {
        userClientId = req.user.id;
      } else {
        const clientUser = await ClientUser.findByPk(req.user.id);
        userClientId = clientUser.clientId;
      }

      if (parseInt(clientId) !== parseInt(userClientId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only access your own data.",
        });
      }

      req.clientId = userClientId;
      return next();
    }

    res.status(403).json({
      success: false,
      message: "Access denied.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying permissions.",
    });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isClient,
  isAdminOrClient,
};
