const pool = require("../../config/db");

const deleteHotel = async (req, res) => {
  const { hotel_id } = req.params;

  try {
    const connection = await pool.getConnection();
    const [rooms] = await connection.query(
      "SELECT COUNT(*) AS count FROM Rooms WHERE hotel_id = ? AND availability = FALSE",
      [hotel_id]
    );

    if (rooms[0].count > 0) {
      connection.release();
      return res
        .status(400)
        .json({ error: "Hotel cannot be deleted as it has reserved rooms" });
    }

    await connection.query("DELETE FROM Hotel WHERE hotel_id = ?", [hotel_id]);
    connection.release();
    res.status(200).json({ message: "Hotel deleted successfully" });
  } catch (error) {
    console.error("Error deleting hotel:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = deleteHotel;
