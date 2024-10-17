const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
const { subscribe } = require("../../utility/notificationSender");

const JWT_SECRET = process.env.JWT_SECRET;

const loginUser = async (req, res) => {
  const { email, password, subscription } = req.body;
  let parsedSubscription = null;
  if (subscription) {
    try {
      parsedSubscription = JSON.parse(subscription);
    } catch (error) {
      console.error("Failed to parse subscription:", error);
    }
  }

  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      connection.release();
      return res.status(400).json({ error: "Invalid email or password" });
    }

    subscribe(email, parsedSubscription);
    const token = jwt.sign(
      { id: user.user_id, name: user.name, user_type: user.user_type },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    connection.release();
    res.json({ token });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = loginUser;
