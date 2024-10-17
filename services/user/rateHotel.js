const pool = require("../../config/db");

const rateHotel = async (req, res) => {
  const { hotel_id, rating, user_id } = req.body;

  try {
    const connection = await pool.getConnection();
    await connection.query(
      "INSERT INTO Ratings (hotel_id, rating, user_id) VALUES (?, ?, ?)",
      [hotel_id, rating, user_id]
    );
    connection.release();
    res.status(200).json({ message: "Rating submitted successfully" });
  } catch (err) {
    console.error("Error inserting rating:", err);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = rateHotel;
