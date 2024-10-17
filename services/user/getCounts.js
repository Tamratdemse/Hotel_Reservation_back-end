const pool = require("../../config/db");

const getCounts = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [[{ userCount }]] = await connection.query(
      "SELECT COUNT(*) AS userCount FROM users"
    );
    const [[{ hotelCount }]] = await connection.query(
      "SELECT COUNT(*) AS hotelCount FROM Hotel"
    );
    const [[{ roomCount }]] = await connection.query(
      "SELECT COUNT(*) AS roomCount FROM Rooms"
    );
    connection.release();
    res.json({ userCount, hotelCount, roomCount });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = getCounts;
