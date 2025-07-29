const {
  Client,
  Transaction,
  SmsBalance,
  Contact,
  ClientUser,
} = require("../models");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");

// Get all clients with their balances
const getClients = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: clients } = await Client.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: SmsBalance,
          as: "smsBalance",
          attributes: ["totalSmsAvailable"],
        },
        {
          model: Contact,
          as: "contacts",
          attributes: ["id"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    // Add contact count to each client
    const clientsWithStats = clients.map((client) => ({
      ...client.toJSON(),
      contactCount: client.contacts.length,
      contacts: undefined, // Remove the contacts array from response
    }));

    res.json({
      success: true,
      message: "Clients retrieved successfully",
      data: {
        clients: clientsWithStats,
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
      message: "Error retrieving clients",
      error: error.message,
    });
  }
};

// Get single client with details
const getClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findByPk(id, {
      include: [
        {
          model: SmsBalance,
          as: "smsBalance",
        },
        {
          model: Transaction,
          as: "transactions",
          limit: 10,
          order: [["createdAt", "DESC"]],
        },
        {
          model: Contact,
          as: "contacts",
          attributes: ["id", "name", "phone"],
          limit: 10,
        },
        {
          model: ClientUser,
          as: "users",
          attributes: ["id", "email", "name", "createdAt"],
        },
      ],
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.json({
      success: true,
      message: "Client retrieved successfully",
      data: { client },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving client",
      error: error.message,
    });
  }
};

// Create new client
const createClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;

    // Check if client already exists
    const existingClient = await Client.findOne({ where: { email } });
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: "Client with this email already exists",
      });
    }

    const client = await Client.create({
      name,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: { client },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating client",
      error: error.message,
    });
  }
};

// Update client
const updateClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, email, password } = req.body;

    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Check email uniqueness if email is being changed
    if (email !== client.email) {
      const existingClient = await Client.findOne({
        where: { email, id: { [Op.ne]: id } },
      });

      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: "Client with this email already exists",
        });
      }
    }

    const updateData = { name, email };
    if (password) {
      updateData.password = password;
    }

    await client.update(updateData);

    res.json({
      success: true,
      message: "Client updated successfully",
      data: { client },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating client",
      error: error.message,
    });
  }
};

// Delete client
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    await client.destroy();

    res.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting client",
      error: error.message,
    });
  }
};

// Create transaction for client
const createTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { clientId, smsQuantity, totalAmount, description } = req.body;

    // Verify client exists
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const transaction = await Transaction.create({
      clientId,
      adminId: req.admin.id,
      smsQuantity,
      totalAmount,
      description,
    });

    // Get updated client with balance
    const updatedClient = await Client.findByPk(clientId, {
      include: [
        {
          model: SmsBalance,
          as: "smsBalance",
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: {
        transaction,
        client: updatedClient,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating transaction",
      error: error.message,
    });
  }
};

// Get all transactions
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, clientId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (clientId) {
      whereClause.clientId = clientId;
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["id", "name", "email"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      message: "Transactions retrieved successfully",
      data: {
        transactions,
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
      message: "Error retrieving transactions",
      error: error.message,
    });
  }
};

// Create client user
const createClientUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { clientId, email, password, name } = req.body;

    // Verify client exists
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Check if user already exists
    const existingUser = await ClientUser.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const clientUser = await ClientUser.create({
      clientId,
      email,
      password,
      name,
    });

    res.status(201).json({
      success: true,
      message: "Client user created successfully",
      data: { clientUser },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating client user",
      error: error.message,
    });
  }
};

module.exports = {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  createTransaction,
  getTransactions,
  createClientUser,
};
