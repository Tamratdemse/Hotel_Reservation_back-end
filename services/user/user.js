const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { Chapa } = require("chapa-nodejs");
const pool = require("../../config/db");
const {
  calculateCheckoutDate,
  GenerateRoomNumber,
} = require("../../utility/utils");
const {
  sendNotificationn,
  subscribe,
} = require("../../utility/notificationSender");

const JWT_SECRET = process.env.JWT_SECRET;
const chapa = new Chapa({ secretKey: process.env.secretKey });

const getCounts = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [[{ userCount }]] = await connection.query(
      "SELECT COUNT(*) AS userCount FROM users"
    );
    const [[{ hotelCount }]] = await connection.query(
      "SELECT COUNT(*) AS hotelCount FROM Hotel"
    );
    const [[{ roomCount }]] = await connection.query(
      "SELECT COUNT(*) AS roomCount FROM Rooms"
    );
    connection.release();
    res.json({ userCount, hotelCount, roomCount });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

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

const registerUser = async (req, res) => {
  const { name, email, phone_number, password } = req.body;
  const id_card_front = req.files["id_card_front"]
    ? req.files["id_card_front"][0].filename
    : null;
  const id_card_back = req.files["id_card_back"]
    ? req.files["id_card_back"][0].filename
    : null;

  try {
    const [existingUser] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      if (id_card_front)
        fs.unlinkSync(path.resolve(__dirname, "../../uploads", id_card_front));
      if (id_card_back)
        fs.unlinkSync(path.resolve(__dirname, "../../uploads", id_card_back));
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (name, email, phone_number, password, id_card_photo_front, id_card_photo_back) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, phone_number, hashedPassword, id_card_front, id_card_back]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error:", error);
    if (id_card_front)
      fs.unlinkSync(path.resolve(__dirname, "../../uploads", id_card_front));
    if (id_card_back)
      fs.unlinkSync(path.resolve(__dirname, "../../uploads", id_card_back));
    res.status(500).json({ message: "Internal Server Error" });
  }
};

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

const updateAccount = async (req, res) => {
  const userId = req.user.user_id;
  const { name, email, phone_number, password } = req.body;
  let id_card_front = req.files["id_card_front"]
    ? req.files["id_card_front"][0].path
    : null;
  let id_card_back = req.files["id_card_back"]
    ? req.files["id_card_back"][0].path
    : null;

  try {
    const connection = await pool.getConnection();

    const [currentUser] = await connection.query(
      "SELECT id_card_photo_front, id_card_photo_back FROM users WHERE user_id = ?",
      [userId]
    );

    if (id_card_front && currentUser[0].id_card_photo_front) {
      fs.unlink(path.join("", currentUser[0].id_card_photo_front), (err) => {
        if (err) console.error("Error deleting old front photo:", err);
      });
    }

    if (id_card_back && currentUser[0].id_card_photo_back) {
      fs.unlink(path.join("", currentUser[0].id_card_photo_back), (err) => {
        if (err) console.error("Error deleting old back photo:", err);
      });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.query(
        "UPDATE users SET password = ? WHERE user_id = ?",
        [hashedPassword, userId]
      );
    }

    const [result] = await connection.query(
      "UPDATE users SET name = ?, email = ?, phone_number = ?, id_card_photo_front = ?, id_card_photo_back = ? WHERE user_id = ?",
      [
        name,
        email,
        phone_number,
        id_card_front || currentUser[0].id_card_photo_front,
        id_card_back || currentUser[0].id_card_photo_back,
        userId,
      ]
    );

    connection.release();

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "User not found or no changes made" });
    }

    res.json({ message: "Account updated successfully" });
  } catch (error) {
    console.error("Error updating database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

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

const makeReservation = async (req, res) => {
  const { hotel_id, category_id, duration } = req.body;

  try {
    const connection = await pool.getConnection();
    const [rooms] = await connection.query(
      "SELECT room_number FROM Rooms WHERE hotel_id = ? AND category_id = ? AND availability = 0 LIMIT 1",
      [hotel_id, category_id]
    );

    if (rooms.length === 0) {
      connection.release();
      return res.status(400).json({ error: "No available rooms" });
    }

    const room_number = rooms[0].room_number;
    const [categories] = await connection.query(
      "SELECT * FROM Category WHERE category_id = ?",
      [category_id]
    );

    if (categories.length === 0) {
      connection.release();
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const price = categories[0].price;
    const total_price = price * duration;
    const reservation_date = new Date();
    const checkoutDate = calculateCheckoutDate(reservation_date, duration);

    const [result] = await connection.query(
      "INSERT INTO Reservation (user_id, hotel_id, category_id, room_number, reservation_date, duration, total_price, checkout_date, reservation_status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')",
      [
        req.user.user_id,
        hotel_id,
        category_id,
        room_number,
        reservation_date,
        duration,
        total_price,
        checkoutDate,
      ]
    );

    const reservationId = result.insertId;
    const roomId = GenerateRoomNumber(room_number, category_id, hotel_id);
    await connection.query(
      "UPDATE Rooms SET availability = 1 WHERE room_id = ?",
      [roomId]
    );
    const [admins] = await connection.query(
      "SELECT Admin_id FROM Admins WHERE hotel_id = ?",
      [hotel_id]
    );
    const admin = admins[0].Admin_id;
    sendNotificationn(
      admin,
      "admin",
      "Reservation Request",
      "You have a new reservation request. Please check the information and accept it."
    );
    res.status(201).json({ message: "Reservation created successfully" });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getUserStatus = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [reservations] = await connection.query(
      "SELECT * FROM Reservation WHERE user_id = ?",
      [req.user.user_id]
    );
    connection.release();
    res.json(reservations);
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getTopHotels = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [hotels] = await connection.query(
      "SELECT * FROM Hotel ORDER BY rating DESC LIMIT 3"
    );
    connection.release();
    res.json(hotels);
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

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

const initializePayment = async (req, res) => {
  const first_name = req.user.name;
  const { total_price, hotel_id } = req.query;

  try {
    const connection = await pool.getConnection();
    const [hotel] = await connection.query(
      "SELECT subaccount_id FROM hotel WHERE hotel_id = ?",
      [hotel_id]
    );
    connection.release();

    if (hotel.length === 0) {
      return res
        .status(404)
        .json({ error: "Hotel not found or no subaccount_id associated." });
    }

    const subaccount_id = hotel[0].subaccount_id;
    const tx_ref = await chapa.generateTransactionReference();

    const payload = {
      amount: total_price,
      currency: "ETB",
      email: "",
      first_name: first_name,
      last_name: "",
      tx_ref: tx_ref,
      callback_url: "http://www.google.com",
      return_url: "http://www.chelsea.com",
      customization: {
        title: "Test Title",
        description: "Test Description",
      },
      subaccounts: {
        id: subaccount_id,
      },
    };

    const options = {
      method: "POST",
      url: "https://api.chapa.co/v1/transaction/initialize",
      headers: {
        Authorization: `Bearer ${process.env.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    };

    request(options, (error, response) => {
      if (error) {
        console.error("Request Error:", error.message);
        return res.status(500).json({ error: error.message });
      }

      const data = JSON.parse(response.body);
      if (data.status === "failed" || !data.data || !data.data.checkout_url) {
        return res.status(400).json({
          error: data.message?.["subaccounts.id"]
            ? data.message["subaccounts.id"][0]
            : "Failed to initialize transaction.",
          response: data,
        });
      }

      res.status(200).json({ checkout_url: data.data.checkout_url });
    });
  } catch (error) {
    console.error("Error:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
};

const handlePaymentComplete = async (req, res) => {
  const { tx_ref, status } = req.query;

  try {
    const response = await chapa.verify({ tx_ref });
    res.send(
      `Payment complete! Transaction reference: ${tx_ref}, Status: ${status}, Verification: ${JSON.stringify(
        response.data,
        null,
        2
      )}`
    );
  } catch (error) {
    console.error("Verification Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

const handleCallback = (req, res) => {
  const { tx_ref, status } = req.query;
  res.status(200).send("OK");
};

module.exports = {
  getCounts,
  getAllHotels,
  getCategoriesByHotelId,
  registerUser,
  loginUser,
  getAccountData,
  updateAccount,
  rateHotel,
  makeReservation,
  getUserStatus,
  getTopHotels,
  getNotifications,
  initializePayment,
  handlePaymentComplete,
  handleCallback,
};
