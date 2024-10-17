const pool = require("../../config/db");

const getUserStatus = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [reservations] = await connection.query(
      "SELECT * FROM Reservation WHERE user_id = ?",
      [req.user.user_id]
    );
    connection.release();
    res.json(reservations);
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = getUserStatus;
