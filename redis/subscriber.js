const redis = require("redis");

(async () => {
  // 1. Create a client
  const subscriber = redis.createClient();
  await subscriber.connect();

  // 2. Subscribe to a specific channel named 'system_notifications'
  // The callback function runs ONLY when a message arrives
  await subscriber.subscribe("system_notifications", (message) => {
    console.log("🚨 ALERT RECEIVED:", JSON.parse(message));
  });

  // Subscribe to any channel starting with 'orders:'
  await subscriber.pSubscribe("orders:*", (message, channel) => {
    console.log(`LOG: Received order from [${channel}]: ${message}`);
  });

  console.log("Listening for updates on 'system_notifications'...");
})();
