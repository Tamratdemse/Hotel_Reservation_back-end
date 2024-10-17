const pool = require("../../config/db");

const addHotel = async (req, res) => {
  const { hotel_name, location, rating, subaccount_id } = req.body;
  const photo = req.file ? req.file.filename : null;

  const query = `
    INSERT INTO hotel (hotel_name, location, photo, rating, subaccount_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await pool.query(query, [
      hotel_name,
      location,
      photo,
      rating,
      subaccount_id,
    ]);

    const hotelId = result.insertId;

    res.status(201).json({ message: "Hotel added successfully", hotelId });
  } catch (error) {
    console.error("Error adding hotel:", error);
    res.status(500).json({ error: "Failed to add hotel" });
  }
};

module.exports = addHotel;
