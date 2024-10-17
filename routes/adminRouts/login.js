// File: routes/adminRouts/login.js

require("dotenv").config();
const express = require("express");
const {
  getAdminByEmail,
  comparePassword,
} = require("../../services/admin/loginService");
const { generateToken } = require("../../utility/auth");

const loginRouter = express.Router();

// Admin Login
loginRouter.post("/", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await getAdminByEmail(email);
    if (!admin) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatch = await comparePassword(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = generateToken(admin); // Use your token generation logic
    res.json({ token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = loginRouter;
