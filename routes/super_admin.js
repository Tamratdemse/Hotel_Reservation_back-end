const express = require("express");
const mysql = require("mysql2/promise");
const router = express.Router();
const bcrypt = require("bcrypt");
const { authenticateToken } = require("../utility/auth");
// MySQL connection pool setup
const pool = require("../configration/db");
router.use(authenticateToken);
// Endpoint to get hotel statistics and all hotels
router.get("/statistics", async (req, res) => {
  try {
    // Fetch hotel count
    const hotelCountQuery = "SELECT COUNT(*) AS hotelCount FROM hotel";
    const [hotelCountResults] = await pool.query(hotelCountQuery);
    const hotelCount = hotelCountResults[0].hotelCount;

    // Fetch admin count
    const adminCountQuery = "SELECT COUNT(*) AS adminCount FROM admins";
    const [adminCountResults] = await pool.query(adminCountQuery);
    const adminCount = adminCountResults[0].adminCount;

    // Fetch room count
    const roomCountQuery = "SELECT COUNT(*) AS roomCount FROM rooms";
    const [roomCountResults] = await pool.query(roomCountQuery);
    const roomCount = roomCountResults[0].roomCount;

    // Fetch user count
    const userCountQuery = "SELECT COUNT(*) AS userCount FROM users";
    const [userCountResults] = await pool.query(userCountQuery);
    const userCount = userCountResults[0].userCount;
    const hotelsQuery = "SELECT * FROM HOTEL";
    const [hotels] = await pool.query(hotelsQuery);

    // Fetch number of registered users by year and month
    const userRegistrationByMonthQuery = `
      SELECT 
        DATE_FORMAT(created_at, '%Y') AS year,
        DATE_FORMAT(created_at, '%m') AS month,
        COUNT(*) AS userCount
      FROM users
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `;
    const [userRegistrationByMonthResults] = await pool.query(
      userRegistrationByMonthQuery
    );

    // Create a list of month names
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Initialize an empty object to hold formatted data
    const formattedUserRegistrationData = {};

    // Populate the formatted data
    userRegistrationByMonthResults.forEach((row) => {
      const year = row.year;
      const monthName = monthNames[parseInt(row.month) - 1];
      const monthData = { month: monthName, userCount: row.userCount };

      if (!formattedUserRegistrationData[year]) {
        formattedUserRegistrationData[year] = monthNames.map((month) => ({
          month,
          userCount: 0,
        }));
      }

      const monthIndex = monthNames.indexOf(monthName);
      formattedUserRegistrationData[year][monthIndex] = monthData;
    });

    // Ensure that every year contains all months
    for (const year in formattedUserRegistrationData) {
      formattedUserRegistrationData[year] = monthNames.map((month) => {
        const monthData = formattedUserRegistrationData[year].find(
          (data) => data.month === month
        );
        return monthData || { month, userCount: 0 };
      });
    }

    // Return all statistics
    res.status(200).json({
      hotelCount,
      adminCount,
      roomCount,
      userCount,
      userRegistrationByMonth: formattedUserRegistrationData,
    });
  } catch (error) {
    console.error("Database query failed:", error);
    return res.status(500).json({ error: "Database query failed" });
  }
});
router.get("/hotels", async (req, res) => {
  console.log("comes");
  try {
    const hotelsQuery = "SELECT * FROM HOTEL";
    const [hotels] = await pool.query(hotelsQuery);
    console.log(hotels);
    res.status(200).json({ hotels });
  } catch (error) {
    console.error("Database query failed:", error);
    return res.status(500).json({ error: "Database query failed" });
  }
});

// Endpoint to add a hotel
router.post("/add_hotels", async (req, res) => {
  const { hotel_name, location, photo, rating, subaccount_id } = req.body;
  console.log(req.body);

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

    // Fetch the newly added hotel details or we can update id and name of the hotel
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
        INSERT INTO admins (name, email, password ,admin_type,hotel_id)
        VALUES (?, ?, ?, ?, ?)
    `;

  try {
    const [result] = await pool.query(query, [
      name,
      email,
      password,
      admin_type,
      hotel_id,
    ]);

    res.status(201).json({
      message: "Admin added successfully",
      adminId: result.insertId, // Return the new admin ID or  we can eliminate this part 😁
    });
  } catch (error) {
    console.error("Error adding admin:", error);
    return res.status(500).json({ error: "Failed to add admin" });
  }
});

// Delete hotel endpoint
router.delete("/delete_hotel/:hotel_id", async (req, res) => {
  const { hotel_id } = req.params;
  console.log(hotel_id);

  try {
    const connection = await pool.getConnection();

    // Check if all rooms are available for the hotel
    const [rooms] = await connection.query(
      "SELECT COUNT(*) AS count FROM Rooms WHERE hotel_id = ? AND availability = FALSE",
      [hotel_id]
    );

    if (rooms[0].count > 0) {
      connection.release();
      return res
        .status(400)
        .json({ error: "Hotel cannot be deleted as it has reserved rooms" });
    }

    // Proceed to delete the hotel
    await connection.query("DELETE FROM Hotel WHERE hotel_id = ?", [hotel_id]);

    connection.release();
    res.status(200).json({ message: "Hotel deleted successfully" });
  } catch (error) {
    console.error("Error deleting hotel:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
