const express = require("express");
const mysql = require("mysql2/promise");
const router = express.Router();
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");

// MySQL connection pool setup
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "HOTEL_RESERVE",
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../hotel_image"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.get("/statistics", async (req, res) => {
  try {
    // Fetch hotel count
    const countQuery = "SELECT COUNT(*) AS hotelCount FROM hotel";
    const [countResults] = await pool.query(countQuery);
    const hotelCount = countResults[0].hotelCount;

    // Fetch number of admins
    const adminQuery = "SELECT COUNT(*) AS adminCount FROM admins";
    const [adminResults] = await pool.query(adminQuery);
    const adminCount = adminResults[0].adminCount;

    // Fetch number of rooms
    const roomQuery = "SELECT COUNT(*) AS roomCount FROM rooms";
    const [roomResults] = await pool.query(roomQuery);
    const roomCount = roomResults[0].roomCount;

    // Fetch number of users
    const userQuery = "SELECT COUNT(*) AS userCount FROM users";
    const [userResults] = await pool.query(userQuery);
    const userCount = userResults[0].userCount;

    // Fetch all hotels
    const hotelsQuery = "SELECT * FROM hotel";
    const [hotelsResults] = await pool.query(hotelsQuery);

    // Return all counts and list of hotels
    res.status(200).json({
      hotelCount,
      adminCount,
      roomCount,
      userCount,
      hotels: hotelsResults,
    });
  } catch (error) {
    console.error("Database query failed:", error);
    return res.status(500).json({ error: "Database query failed" });
  }
});

// Endpoint to add a hotel
router.post("/add_hotels", upload.single("photo"), async (req, res) => {
  const { hotel_name, location, rating, subaccount_id } = req.body;
  const photo = req.file ? req.file.filename : null; // Get the uploaded file's filename

  const query = `
        INSERT INTO hotel (hotel_name, location, photo, rating, subaccount_id)
        VALUES (?, ?, ?, ?, ?)
    `;

  try {
    const [result] = await pool.query(query, [
      hotel_name,
      location,
      photo,
      rating,
      subaccount_id,
    ]);

    // Fetch the newly added hotel details
    const hotelId = result.insertId;
    const [hotelDetails] = await pool.query(
      "SELECT * FROM hotel WHERE hotel_id = ?",
      [hotelId]
    );

    res.status(201).json({
      message: "Hotel added successfully",
      hotel: hotelDetails[0].hotel_id,
    });
  } catch (error) {
    console.error("Error adding hotel:", error);
    return res.status(500).json({ error: "Failed to add hotel" });
  }
});

// Endpoint to add an admin
router.post("/add_admin", async (req, res) => {
  const { name, email, password, admin_type, hotel_id } = req.body;

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `
        INSERT INTO admins (name, email, password, admin_type, hotel_id)
        VALUES (?, ?, ?, ?, ?)
    `;

  try {
    const [result] = await pool.query(query, [
      name,
      email,
      hashedPassword, // Use hashed password
      admin_type,
      hotel_id,
    ]);

    res.status(201).json({
      message: "Admin added successfully",
      adminId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding admin:", error);
    return res.status(500).json({ error: "Failed to add admin" });
  }
});

// Delete hotel endpoint
router.delete("/delete_hotel/:hotel_id", async (req, res) => {
  const { hotel_id } = req.params;

  try {
    const connection = await pool.getConnection();

    // Check if all rooms are available for the hotel
    const [rooms] = await connection.query(
      "SELECT COUNT(*) AS count FROM rooms WHERE hotel_id = ? AND availability = FALSE",
      [hotel_id]
    );

    if (rooms[0].count > 0) {
      connection.release();
      return res
        .status(400)
        .json({ error: "Hotel cannot be deleted as it has reserved rooms" });
    }

    // Proceed to delete the hotel
    await connection.query("DELETE FROM hotel WHERE hotel_id = ?", [hotel_id]);

    connection.release();
    res.status(200).json({ message: "Hotel deleted successfully" });
  } catch (error) {
    console.error("Error deleting hotel:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
