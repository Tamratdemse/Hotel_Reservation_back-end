const pool = require("../../config/db");

// Get all rooms
async function getAllRooms(req, res) {
  try {
    const connection = await pool.getConnection();

    const [rooms] = await connection.query(
      `SELECT r.room_id, r.room_number, r.availability, 
              c.category_name, c.price 
       FROM Rooms r
       JOIN Category c ON r.category_id = c.category_id
       WHERE r.hotel_id = ?`,
      [req.admin.hotel_id]
    );

    connection.release();
    res.json(rooms);
  } catch (error) {
    console.error("Error retrieving rooms:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Get room details
async function getRoomDetails(req, res) {
  const roomId = req.params.id;
  try {
    const connection = await pool.getConnection();

    const [roomDetails] = await connection.query(
      `SELECT r.*, c.category_name, c.price 
       FROM Rooms r
       JOIN Category c ON r.category_id = c.category_id
       WHERE r.room_id = ?`,
      [roomId]
    );

    connection.release();
    if (roomDetails.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(roomDetails[0]);
  } catch (error) {
    console.error("Error retrieving room details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Add a new room
async function addRoom(req, res) {
  const { room_number, availability, category_id } = req.body;
  if (!room_number || availability === undefined || !category_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const connection = await pool.getConnection();

    await connection.query(
      `INSERT INTO Rooms (room_number, availability, category_id, hotel_id)
       VALUES (?, ?, ?, ?)`,
      [room_number, availability, category_id, req.admin.hotel_id]
    );

    connection.release();
    res.status(201).json({ message: "Room added successfully" });
  } catch (error) {
    console.error("Error adding room:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Update a room
async function updateRoom(req, res) {
  const roomId = req.params.id;
  const { room_number, availability, category_id } = req.body;

  if (!room_number && availability === undefined && !category_id) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const connection = await pool.getConnection();

    const updateFields = [];
    const updateValues = [];

    if (room_number) {
      updateFields.push("room_number = ?");
      updateValues.push(room_number);
    }
    if (availability !== undefined) {
      updateFields.push("availability = ?");
      updateValues.push(availability);
    }
    if (category_id) {
      updateFields.push("category_id = ?");
      updateValues.push(category_id);
    }

    updateValues.push(roomId);

    await connection.query(
      `UPDATE Rooms SET ${updateFields.join(", ")} WHERE room_id = ?`,
      updateValues
    );

    connection.release();
    res.status(200).json({ message: "Room updated successfully" });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Delete a room
async function deleteRoom(req, res) {
  const roomId = req.params.id;
  try {
    const connection = await pool.getConnection();

    await connection.query("DELETE FROM Rooms WHERE room_id = ?", [roomId]);

    connection.release();
    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = {
  getAllRooms,
  getRoomDetails,
  addRoom,
  updateRoom,
  deleteRoom,
};
