const pool = require("../../config/db");

const getNotifications = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [user] = await connection.query(
      "SELECT email FROM users WHERE user_id = ?",
      [req.user.user_id]
    );
    const [notifications] = await connection.query(
      "SELECT * FROM Notifications WHERE user_id = ?",
      [user[0].email]
    );
    connection.release();
    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = getNotifications;
