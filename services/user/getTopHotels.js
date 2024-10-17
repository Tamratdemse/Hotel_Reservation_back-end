const pool = require("../../config/db");

const getTopHotels = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [hotels] = await connection.query(
      "SELECT * FROM Hotel ORDER BY rating DESC LIMIT 3"
    );
    connection.release();
    res.json(hotels);
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = getTopHotels;
