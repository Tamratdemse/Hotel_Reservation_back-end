// File: utility/auth.js

require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to authenticate admin token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Token not provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Failed to authenticate token" });
    }

    req.admin = {
      admin_id: decoded.admin_id,
      name: decoded.name,
      admin_type: decoded.admin_type,
      ...(decoded.admin_type !== "superadmin" && {
        hotel_id: decoded.hotel_id,
      }),
    };

    next();
  });
};

// Middleware to authenticate user token (if applicable)
const userAuthenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  // Check if the authorization header exists and starts with "Bearer"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Token not provided or improperly formatted" });
  }

  // Extract the token from the "Bearer" scheme
  const token = authHeader.split(" ")[1];

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Failed to authenticate token" });
    }

    // Attach the decoded token data to the request object
    req.user = {
      user_id: decoded.id,
      name: decoded.name,
      user_type: decoded.user_type,
    };

    // Proceed to the next middleware or route handler
    next();
  });
};

// Function to generate JWT token for admin
const generateToken = (admin) => {
  return jwt.sign(
    {
      admin_id: admin.admin_id,
      name: admin.name,
      admin_type: admin.admin_type,
      hotel_id: admin.hotel_id,
    },
    JWT_SECRET,
    { expiresIn: "1h" } // Set expiration time as needed
  );
};

module.exports = { authenticateToken, userAuthenticate, generateToken };
