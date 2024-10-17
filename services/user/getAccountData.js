const pool = require("../../config/db");

const getAccountData = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const connection = await pool.getConnection();
    const [user] = await connection.query(
      "SELECT * FROM users WHERE user_id = ?",
      [userId]
    );
    connection.release();

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user[0]);
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = getAccountData;
