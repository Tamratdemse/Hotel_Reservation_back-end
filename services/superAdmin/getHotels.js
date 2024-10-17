const pool = require("../../config/db");

const getHotels = async (req, res) => {
  try {
    const query = "SELECT hotel_id, hotel_name, rating FROM hotel";
    const [results] = await pool.query(query);

    res.status(200).json({ hotels: results });
  } catch (error) {
    console.error("Error fetching hotels:", error);
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
};

module.exports = getHotels;
