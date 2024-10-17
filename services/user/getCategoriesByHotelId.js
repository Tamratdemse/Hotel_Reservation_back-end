const pool = require("../../config/db");

const getCategoriesByHotelId = async (req, res) => {
  const hotelId = req.params.id;
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.query(
      `SELECT 
          c.category_id, 
          c.photo,
          c.category_name, 
          c.price,
          COUNT(r.room_number) AS total_rooms,
          SUM(r.availability) AS available_rooms
      FROM Category c
      JOIN Rooms r ON c.category_id = r.category_id
      WHERE c.hotel_id = ?
      GROUP BY c.category_id`,
      [hotelId]
    );
    connection.release();
    res.json(results);
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = getCategoriesByHotelId;
