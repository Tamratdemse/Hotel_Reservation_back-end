require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

require("./configration/db");
const users = require("./routes/user");
const admins = require("./routes/admin");
const superadmin = require("./routes/super_admin");

const scheduleCronJobs = require("./utility/cronJobs"); // Import the cron jobs

const app = express();
const port = process.env.PORT || 5000; // Default port to 5000 if not specified in .env

app.use(bodyParser.json());
app.use(cors());

// Serve static files from the 'images' directory
app.use("/hotel_image", express.static("hotel_image"));

// Start the cron jobs
scheduleCronJobs();

app.use("/user", users);
app.use("/admin", admins);
app.use("/superadmin", superadmin);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
