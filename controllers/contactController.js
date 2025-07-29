const { Contact, SmsBalance } = require("../models");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");

// Get all contacts for a client
const getContacts = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { clientId: req.clientId };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: contacts } = await Contact.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["name", "ASC"]],
    });

    res.json({
      success: true,
      message: "Contacts retrieved successfully",
      data: {
        contacts,
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
      message: "Error retrieving contacts",
      error: error.message,
    });
  }
};

// Get single contact
const getContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findOne({
      where: { id, clientId: req.clientId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.json({
      success: true,
      message: "Contact retrieved successfully",
      data: { contact },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving contact",
      error: error.message,
    });
  }
};

// Create new contact
const createContact = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { name, phone } = req.body;

    // Check if contact already exists for this client
    const existingContact = await Contact.findOne({
      where: { clientId: req.clientId, phone },
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: "Contact with this phone number already exists",
      });
    }

    const contact = await Contact.create({
      clientId: req.clientId,
      name,
      phone,
    });

    res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: { contact },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating contact",
      error: error.message,
    });
  }
};

// Update contact
const updateContact = async (req, res) => {
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
    const { name, phone } = req.body;

    const contact = await Contact.findOne({
      where: { id, clientId: req.clientId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    // Check if phone number is being changed and if it conflicts
    if (phone !== contact.phone) {
      const existingContact = await Contact.findOne({
        where: {
          clientId: req.clientId,
          phone,
          id: { [Op.ne]: id },
        },
      });

      if (existingContact) {
        return res.status(400).json({
          success: false,
          message: "Contact with this phone number already exists",
        });
      }
    }

    await contact.update({ name, phone });

    res.json({
      success: true,
      message: "Contact updated successfully",
      data: { contact },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating contact",
      error: error.message,
    });
  }
};

// Delete contact
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findOne({
      where: { id, clientId: req.clientId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    await contact.destroy();

    res.json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting contact",
      error: error.message,
    });
  }
};

// Bulk import contacts
const bulkImportContacts = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Contacts array is required and must not be empty",
      });
    }

    const createdContacts = [];
    const skippedContacts = [];

    for (const contactData of contacts) {
      try {
        // Check if contact already exists
        const existingContact = await Contact.findOne({
          where: { clientId: req.clientId, phone: contactData.phone },
        });

        if (existingContact) {
          skippedContacts.push({
            ...contactData,
            reason: "Phone number already exists",
          });
          continue;
        }

        const contact = await Contact.create({
          clientId: req.clientId,
          name: contactData.name,
          phone: contactData.phone,
        });

        createdContacts.push(contact);
      } catch (error) {
        skippedContacts.push({
          ...contactData,
          reason: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Bulk import completed",
      data: {
        created: createdContacts.length,
        skipped: skippedContacts.length,
        createdContacts,
        skippedContacts,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during bulk import",
      error: error.message,
    });
  }
};

// Import contacts from CSV format
const importContacts = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || typeof data !== "string") {
      return res.status(400).json({
        success: false,
        message: "CSV data is required",
      });
    }

    const lines = data.trim().split("\n");
    const createdContacts = [];
    const skippedContacts = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const [name, phone] = line.split(",").map((item) => item.trim());

      if (!name || !phone) {
        skippedContacts.push({
          line,
          reason: "Invalid format - name and phone required",
        });
        continue;
      }

      try {
        // Check if contact already exists
        const existingContact = await Contact.findOne({
          where: {
            clientId: req.clientId,
            phone: phone,
          },
        });

        if (existingContact) {
          skippedContacts.push({
            name,
            phone,
            reason: "Phone number already exists",
          });
          continue;
        }

        const contact = await Contact.create({
          clientId: req.clientId,
          name,
          phone,
        });

        createdContacts.push(contact);
      } catch (error) {
        skippedContacts.push({
          name,
          phone,
          reason: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Import completed",
      data: {
        created: createdContacts.length,
        skipped: skippedContacts.length,
        createdContacts,
        skippedContacts,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error importing contacts",
      error: error.message,
    });
  }
};

// Export contacts to CSV format
const exportContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      where: { clientId: req.clientId },
      order: [["name", "ASC"]],
    });

    let csvContent = "Name,Phone\n";
    contacts.forEach((contact) => {
      csvContent += `"${contact.name}","${contact.phone}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="contacts.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error exporting contacts",
      error: error.message,
    });
  }
};

module.exports = {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  bulkImportContacts,
  importContacts,
  exportContacts,
};
