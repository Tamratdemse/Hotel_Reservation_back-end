require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const request = require("request");
const fs = require("fs");
const path = require("path");
const { Chapa } = require("chapa-nodejs");

const { userAuthenticate } = require("../utility/auth");
const { calculateCheckoutDate } = require("../utility/utils");
const pool = require("../configration/db");
const { GenerateRoomNumber } = require("../utility/utils");
const {
  sendNotificationn,
  subscribe,
} = require("../utility/notificationSender");

const JWT_SECRET = process.env.JWT_SECRET;
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Folder where files will be saved
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Naming the file with a timestamp to avoid conflicts
  },
});

const upload = multer({ storage: storage });

const chapa = new Chapa({
  secretKey: "CHASECK_TEST-sv12zkwQ3MrWGvs6SsMUZRm8rV2ZPzRq",
});

// Endpoint to get number of users, hotels, and rooms
router.get("/", async (req, res) => {
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
});

// Endpoint to get all hotels
router.get("/hotel", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.query("SELECT * FROM Hotel");
    connection.release();
    res.json(results);
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to get categories by hotel ID
router.get("/hotel/:id", async (req, res) => {
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
});

// Endpoint for user registration with file uploads
router.post(
  "/register",
  upload.fields([
    { name: "id_card_front", maxCount: 1 },
    { name: "id_card_back", maxCount: 1 },
  ]),
  async (req, res) => {
    console.log(req.body);
    const { name, email, phone_number, password } = req.body;
    const id_card_front = req.files["id_card_front"]
      ? req.files["id_card_front"][0].path
      : null;
    const id_card_back = req.files["id_card_back"]
      ? req.files["id_card_back"][0].path
      : null;

    try {
      const [existingUser] = await pool.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      if (existingUser.length > 0) {
        // Delete the uploaded files if the user already exists
        if (id_card_front) fs.unlinkSync(path.resolve(id_card_front));
        if (id_card_back) fs.unlinkSync(path.resolve(id_card_back));

        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        "INSERT INTO users (name, email, phone_number, password, id_card_photo_front, id_card_photo_back) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, phone_number, hashedPassword, id_card_front, id_card_back]
      );

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      console.error("Error:", error);

      // Delete the uploaded files in case of any error
      if (id_card_front) fs.unlinkSync(path.resolve(id_card_front));
      if (id_card_back) fs.unlinkSync(path.resolve(id_card_back));

      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);


router.post("/login", async (req, res) => {
  const { email, password, subscription } = req.body;

  let parsedSubscription = null;
  if (subscription) {
    try {
      parsedSubscription = JSON.parse(subscription);
    } catch (error) {
      console.error("Failed to parse subscription:", error);
    }
  } else {
    console.log("No subscription provided");
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
});

//route to return all user data related to their account
router.get("/account_data", userAuthenticate, async (req, res) => {
  const userId = req.user.user_id;
  console.log(userId);

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

    res.json(user[0]); // Return the user data
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//update account info ,,, idialy update the specific data, but actually all datas

router.put("/account_update", userAuthenticate, async (req, res) => {
  const userId = req.user.user_id; // Get the user_id from the token payload
  const { name, email, phone_number, id_card_front, id_card_back, password } =
    req.body;

  try {
    const connection = await pool.getConnection();

    // Update the password if it's provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.query(
        "UPDATE users SET password = ? WHERE User_id = ?",
        [hashedPassword, userId]
      );
    }

    // Update other fields
    const [result] = await connection.query(
      "UPDATE users SET name = ?, email = ?, phone_number = ?, id_card_photo_front = ?, id_card_photo_back = ? WHERE User_id = ?",
      [name, email, phone_number, id_card_front, id_card_back, userId]
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
});

router.post("/rate-hotel", userAuthenticate, async (req, res) => {
  const { hotel_id, rating, user_id } = req.body;

  try {
    const connection = await pool.getConnection();

    // Insert the rating into the Ratings table
    const query =
      "INSERT INTO Ratings (hotel_id, rating, user_id) VALUES (?, ?, ?)";
    await connection.query(query, [hotel_id, rating, user_id]);

    // Release the connection back to the pool
    connection.release();

    res.status(200).json({ message: "Rating submitted successfully" });
  } catch (err) {
    console.error("Error inserting rating:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Protected Reservation Endpoint
router.post("/reservation", userAuthenticate, async (req, res) => {
  const { hotel_id, category_id, duration } = req.body;
  console.log(req.body);

  try {
    const connection = await pool.getConnection();

    // Fetch the first available room with the given hotel_id and category_id
    const [rooms] = await connection.query(
      "SELECT room_number FROM Rooms WHERE hotel_id = ? AND category_id = ? AND availability = 1 LIMIT 1",
      [hotel_id, category_id]
    );

    if (rooms.length === 0) {
      connection.release();
      return res.status(400).json({ error: "No available rooms" });
    }

    const room_number = rooms[0].room_number;

    // Fetch the price for the given category_id
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

    // Insert the reservation into the reservation table
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

    // Mark the room as unavailable
    const roomId = GenerateRoomNumber(room_number, category_id, hotel_id);
    await connection.query(
      "UPDATE Rooms SET availability = 0 WHERE room_id = ?",
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
      "You have new reservation request please check the information and accept it"
    );
    res.status(201).json({ message: "Reservation created successfully" });
  } catch (error) {
    console.error("Error querying database:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//user status end point
router.get("/status", userAuthenticate, async (req, res) => {
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
});

router.get("/top-hotels", async (req, res) => {
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
});

router.get("/notification", userAuthenticate, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [user] = await connection.query(
      "SELECT email FROM users WHERE user_id = ? ",
      [req.user.user_id]
    );
    const [notifications] = await connection.query(
      "SELECT * FROM Notifications WHERE user_id = ? ",
      [user[0].email]
    );

    connection.release();

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Endpoint to initialize a split payment
router.get("/initialize", async (req, res) => {
  try {
    const tx_ref = await chapa.generateTransactionReference();
    const payload = {
      amount: 10,
      currency: "ETB",
      email: req.query.email,
      first_name: req.query.first_name,
      last_name: req.query.last_name,
      tx_ref: tx_ref,
      callback_url: "http://www.google.com",
      return_url: "http://www.chelsea.com",
      customization: {
        title: "Test Title",
        description: "Test Description",
      },
      subaccounts: {
        id: "5e51f65b-9ea9-4a2c-96dc-e8298a074197",
      },
    };

    console.log("Request Payload:", payload);

    const options = {
      method: "POST",
      url: "https://api.chapa.co/v1/transaction/initialize",
      headers: {
        Authorization: "Bearer CHASECK_TEST-sv12zkwQ3MrWGvs6SsMUZRm8rV2ZPzRq",
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
      console.log("Response Data:", data);

      if (data.status === "failed" || !data.data || !data.data.checkout_url) {
        return res.status(400).json({
          error:
            data.message && data.message["subaccounts.id"]
              ? data.message["subaccounts.id"][0]
              : "Failed to initialize transaction.",
          response: data,
        });
      }

      res.redirect(data.data.checkout_url);
    });
  } catch (error) {
    console.error("Initialization Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});
/*-callback_url=
  Function that runs when payment is successful. This should
   ideally be a script that uses the verify endpoint
   on the Chapa API to check the status of the transaction.

 -return_url=
   Web address to redirect the user after payment is successful
   */

// Endpoint to handle the return from Chapa
router.get("/payment-complete", async (req, res) => {
  const { tx_ref, status } = req.query;
  console.log(
    `Payment complete. Transaction reference: ${tx_ref}, Status: ${status}`
  );

  // Verify the payment
  try {
    const response = await chapa.verify({ tx_ref });
    console.log(
      "Payment Verification Details:",
      JSON.stringify(response.data, null, 2)
    );
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
});

// Endpoint for callback from Chapa
router.get("/callback", (req, res) => {
  const { tx_ref, status } = req.query;
  res.status(200).send("OK");
});

module.exports = router;
