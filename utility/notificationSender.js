require("dotenv").config();
const webPush = require("web-push");
const pool = require("../configration/db");

const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webPush.setVapidDetails(
  "mailto:test@example.com",
  publicVapidKey,
  privateVapidKey
);

const subscribe = async (userId, subscription) => {
  if (!userId || !subscription) {
    return { status: 400, message: "userId and subscription required" };
  }

  try {
    const connection = await pool.getConnection();

    // Check if the subscription already exists
    const [rows] = await connection.query(
      "SELECT * FROM subscriptions WHERE user_id = ? AND endpoint = ?",
      [userId, subscription.endpoint]
    );

    if (rows.length > 0) {
      connection.release();
      console.log("Subscription already exists.");

      return { status: 200, message: "Subscription already exists." };
    }

    // Insert subscription into the database
    await connection.query(
      "INSERT INTO subscriptions (user_id, endpoint, keyss) VALUES (?, ?, ?)",
      [userId, subscription.endpoint, JSON.stringify(subscription.keys)]
    );
    connection.release();
    return { status: 201, message: "Subscription saved successfully." };
  } catch (error) {
    console.error("Error saving subscription:", error);
    return { status: 500, message: "Failed to save subscription." };
  }
};

const sendNotificationn = async (
  user,
  userType = "user",
  title,
  message,
  url
) => {
  if (!user || !message) {
    return { status: 400, message: "Id and message required" };
  }

  let userId;

  const connection = await pool.getConnection();

  if (userType === "admin") {
    const [admins] = await connection.query(
      "SELECT email FROM Admins WHERE Admin_id = ?",
      [user]
    );
    userId = admins[0].email;
  }

  if (userType === "user") {
    const [users] = await connection.query(
      "SELECT email FROM users WHERE User_id = ?",
      [user]
    );
    userId = users[0].email;
  }

  try {
    const [rows] = await connection.query(
      "SELECT * FROM subscriptions WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return { status: 404, message: "Subscription not found for user." };
    }

    const payload = JSON.stringify({
      title: title || "Notification",
      body: message,
      url: url || "/",
    });

    for (const row of rows) {
      const subscription = {
        endpoint: row.endpoint,
        keys: JSON.parse(row.keyss),
      };

      try {
        await webPush.sendNotification(subscription, payload);
        console.log("Notification sent successfully to user:", userId);
      } catch (error) {
        if (error.statusCode === 410) {
          console.error(
            "Subscription has expired or unsubscribed:",
            subscription.endpoint
          );

          await connection.query(
            "DELETE FROM subscriptions WHERE user_id = ? AND endpoint = ?",
            [userId, subscription.endpoint]
          );
          console.log("Removed expired subscription for user:", userId);
        } else {
          console.error("Error sending notification:", error);
        }
      }
    }

    return { status: 200, message: "Notification processing complete." };
  } catch (error) {
    console.error("Error processing notification:", error);
    return { status: 500, message: "Failed to process notification." };
  } finally {
    connection.release();
  }
};

module.exports = { sendNotificationn, subscribe };
