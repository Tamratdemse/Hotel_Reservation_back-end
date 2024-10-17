const pool = require("../../config/db");

const getAllHotels = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.query("SELECT * FROM Hotel");
    connection.release();
    res.json(results);
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = getAllHotels;
