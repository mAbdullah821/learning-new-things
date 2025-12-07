// setup.js
const amqp = require("amqplib");
const config = require("./config");

async function setup() {
  const conn = await amqp.connect(config.RABBIT_URL);
  const channel = await conn.createChannel();

  console.log("--- Setting up Infrastructure ---");

  // 1. Assert MAIN components
  await channel.assertExchange(config.MAIN_EXCHANGE, "direct");
  await channel.assertQueue(config.MAIN_QUEUE, { durable: true });
  await channel.bindQueue(
    config.MAIN_QUEUE,
    config.MAIN_EXCHANGE,
    config.MAIN_ROUTING_KEY
  );
  console.log("✅ Main Queue & Exchange Ready");

  // 2. Assert WAIT components (The Deep Part)
  await channel.assertExchange(config.WAIT_EXCHANGE, "direct");

  // This is the Magic: Connecting the Wait Queue back to the Main Exchange
  await channel.assertQueue(config.WAIT_QUEUE, {
    durable: true,
    arguments: {
      "x-message-ttl": config.DELAY_MS, // Message dies after 5s
      "x-dead-letter-exchange": config.MAIN_EXCHANGE, // Send corpse here
      "x-dead-letter-routing-key": config.MAIN_ROUTING_KEY, // With this key
    },
  });

  await channel.bindQueue(
    config.WAIT_QUEUE,
    config.WAIT_EXCHANGE,
    config.WAIT_ROUTING_KEY
  );
  console.log("✅ Wait Queue (Penalty Box) Ready");

  await conn.close();
  console.log("--- Setup Complete ---");
}

setup().catch(console.error);
