require("dotenv").config();
const webPush = require("web-push");
const pool = require("../configration/db");

const publicVapidKey =
  "BN_lZ5Dh27rnQJimb9Khu1iwOTeUAlIzspp182iqKVeHPx52Sy76ib38qjHAhWfLp0Hin1UumpThG3PM0otCsU0";
const privateVapidKey = "y_AwFuBXhA7WFcYR2yP7k9kh2a0n68ggK3VqPmJfz6c";

webPush.setVapidDetails(
  "mailto:test@example.com",
  publicVapidKey,
  privateVapidKey
);
const subscribe = async (userId, subscription) => {
  if (!userId || !subscription)
    return { status: 400, message: "userId and subscription required" };

  try {
    const connection = await pool.getConnection();

    // Log keys to verify their structure
    console.log("Subscription Keys:", subscription.keys);

    // Check if the subscription already exists
    const [rows] = await connection.query(
      "SELECT * FROM subscriptions WHERE user_id = ? AND endpoint = ?",
      [userId, subscription.endpoint]
    );

    if (rows.length > 0) {
      connection.release();
      console.log("Subscription already exists for user:", userId);
      return { status: 200, message: "Subscription already exists." };
    }

    // If subscription does not exist, insert it into the database
    await connection.query(
      "INSERT INTO subscriptions (user_id, endpoint, `keyss`) VALUES (?, ?, ?)",
      [userId, subscription.endpoint, JSON.stringify(subscription.keys)]
    );
    connection.release();
    console.log("Subscription saved for user:", userId);
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

  if (!user || !message)
    return { status: 400, message: "Id and message required" };

  const connection = await pool.getConnection();

  let userId;

  if (userType == "admin") {
    const [admins] = await connection.query(
      "SELECT email FROM Admins WHERE Admin_id = ?",
      [user]
    );
    userId = admins[0].email;
  }

  if (userType == "user") {
    const [users] = await connection.query(
      "SELECT email FROM users WHERE User_id = ?",
      [user]
    );
    userId = users[0].email;
  }
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT * FROM subscriptions WHERE user_id = ?",
      [userId]
    );

    // Insert notification into the database
    await connection.query(
      "INSERT INTO Notifications (user_id, message) VALUES (?, ?)",
      [userId, message]
    );
    connection.release();

    if (rows.length === 0) {
      return { status: 404, message: "Subscription not found for user." };
    }

    const payload = JSON.stringify({
      title: title || "Notification",
      body: message,
      url: url || "/", // Add the url to the payload, default to homepage if not provided
    });

    for (let i = 0; i < rows.length; i++) {
      let subscription = {
        endpoint: rows[i].endpoint,
        keys: JSON.parse(rows[i].keyss),
      };

      if (!subscription.keys.auth || !subscription.keys.p256dh) {
        console.error(
          "Missing required keys in subscription:",
          subscription.keys
        );
      }

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
  }
};

module.exports = { sendNotificationn, subscribe };
