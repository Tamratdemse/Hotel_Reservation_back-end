// File: services/admin/loginService.js

const bcrypt = require("bcrypt");
const pool = require("../../config/db");

async function getAdminByEmail(email) {
  const connection = await pool.getConnection();
  try {
    const [admins] = await connection.query(
      "SELECT * FROM admins WHERE email = ?",
      [email]
    );
    console.log(admins[0]);

    return admins[0]; // Return the first admin found
  } finally {
    connection.release();
  }
}

async function comparePassword(password, storedPassword) {
  return bcrypt.compare(password, storedPassword); // Compare the provided password with the stored hashed password
}

module.exports = {
  getAdminByEmail,
  comparePassword,
};
