// auth.js
require("dotenv").config();

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader;

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
      hotel_id: decoded.hotel_id,
    };

    next();
  });
};

const userAuthenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  // Check if the Authorization header is provided
  if (!authHeader) {
    return res.status(401).json({ error: "Token not provided" });
  }

  // Extract the token from the header (removing the "Bearer " prefix)
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token not provided" });
  }

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

module.exports = { authenticateToken, userAuthenticate };
