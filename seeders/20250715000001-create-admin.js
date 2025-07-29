const bcrypt = require("bcryptjs");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    await queryInterface.bulkInsert("admins", [
      {
        email: "admin@bulksms.com",
        password: hashedPassword,
        name: "System Administrator",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("admins", {
      email: "admin@bulksms.com",
    });
  },
};
