const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../utility/auth");
const upload = require("../utility/fileUpload");

const getHotelStatistics = require("../services/superAdmin/getHotelStatistics");
const addHotel = require("../services/superAdmin/addHotel");
const addAdmin = require("../services/superAdmin/addAdmin");
const deleteHotel = require("../services/superAdmin/deleteHotel");
const getHotels = require("../services/superAdmin/getHotels");

// Use authentication middleware
router.use(authenticateToken);

// Endpoint to get hotel statistics
router.get("/statistics", getHotelStatistics);

// Endpoint to get all hotels
router.get("/hotels", getHotels);

// Endpoint to add a hotel
router.post("/add_hotels", upload.single("photo"), addHotel);

// Endpoint to add an admin
router.post("/add_admin", addAdmin);

// Endpoint to delete a hotel
router.delete("/delete_hotel/:hotel_id", deleteHotel);

module.exports = router;
