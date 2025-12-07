const redis = require("redis");

(async () => {
  // 1. Create a client
  const publisher = redis.createClient();
  await publisher.connect();

  const messagePayload = {
    message: "Database server is overheating! (Error 505)",
    status: "error",
  };

  // 2. Publish to the SAME channel name
  // Returns the number of clients that received the message
  const listeners = await publisher.publish(
    "system_notifications",
    JSON.stringify(messagePayload)
  );

  console.log(`Message sent! received by ${listeners} listeners.`);

  // Publish to multiple channels
  await Promise.all([
    publisher.publish(
      "orders:123",
      JSON.stringify({ orderId: 123, status: "pending" })
    ),
    publisher.publish(
      "orders:456",
      JSON.stringify({ orderId: 456, status: "completed" })
    ),
    publisher.publish(
      "orders:789",
      JSON.stringify({ orderId: 789, status: "cancelled" })
    ),
  ]);

  // 3. Disconnect
  await publisher.quit();
})();
