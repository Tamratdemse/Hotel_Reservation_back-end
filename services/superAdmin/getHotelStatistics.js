const pool = require("../../config/db");

const getHotelStatistics = async (req, res) => {
  try {
    const hotelCountQuery = "SELECT COUNT(*) AS hotelCount FROM hotel";
    const [hotelCountResults] = await pool.query(hotelCountQuery);
    const hotelCount = hotelCountResults[0].hotelCount;

    const adminCountQuery = "SELECT COUNT(*) AS adminCount FROM admins";
    const [adminCountResults] = await pool.query(adminCountQuery);
    const adminCount = adminCountResults[0].adminCount;

    const roomCountQuery = "SELECT COUNT(*) AS roomCount FROM rooms";
    const [roomCountResults] = await pool.query(roomCountQuery);
    const roomCount = roomCountResults[0].roomCount;

    const userCountQuery = "SELECT COUNT(*) AS userCount FROM users";
    const [userCountResults] = await pool.query(userCountQuery);
    const userCount = userCountResults[0].userCount;

    res.status(200).json({ hotelCount, adminCount, roomCount, userCount });
  } catch (error) {
    console.error("Database query failed:", error);
    return res.status(500).json({ error: "Database query failed" });
  }
};

module.exports = getHotelStatistics;
