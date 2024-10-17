const express = require("express");

const router = express.Router();

require("../utility/auth");
require("lodash");

const loginRouter = require("./adminRouts/login");
const reservationRouter = require("./adminRouts/reservation");
const dashboardRouter = require("./adminRouts/dashboard");
const changepasswordRouter = require("./adminRouts/changePassword");
const categoryRouter = require("./adminRouts/categories");
const manualreservationRouter = require("./adminRouts/manualReservation");
const roomsRouter = require("./adminRouts/room");
const notificationRouter = require("./adminRouts/notification");

router.use("/login", loginRouter);

router.use("/reservation", reservationRouter);

router.use("/manualreservation", manualreservationRouter);

router.use("/dashboard", dashboardRouter);

router.use("/category", categoryRouter);

router.use("/room", roomsRouter);

router.use("/changepassword", changepasswordRouter);

router.use("/notification", notificationRouter);

module.exports = router;
