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
const port = process.env.port;

app.use(bodyParser.json());
app.use(cors());

// Serve static files
app.use("/uploads", express.static("uploads"));

// Start the cron jobs
// scheduleCronJobs();

app.use("/user", users);
app.use("/admin", admins);
app.use("/superadmin", superadmin);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});