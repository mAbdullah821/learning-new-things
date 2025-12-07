// producer.js
const amqp = require("amqplib");
const config = require("./config");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendChaoticEvents() {
  const conn = await amqp.connect(config.RABBIT_URL);
  const channel = await conn.createChannel();

  // We want to process: 1, 2, 3, 4, 5
  // We send them scrambled to simulate out-of-order arrival
  const events = [
    { seqNum: 6, data: "I am sixth" },
    { seqNum: 2, data: "I am second" },
    { seqNum: 1, data: "I am first" },
    { seqNum: 5, data: "I am fifth" },
    { seqNum: 4, data: "I am fourth" },
    { seqNum: 3, data: "I am third" },
  ];

  console.log("--- Starting Simulation ---");

  for (const event of events) {
    channel.publish(
      config.MAIN_EXCHANGE,
      config.MAIN_ROUTING_KEY,
      Buffer.from(JSON.stringify(event))
    );
    console.log(`[Producer] Sent Seq: ${event.seqNum}`);

    // Random delay between 100ms and 2000ms
    const randomDelay = Math.floor(Math.random() * 1900) + 100;
    await sleep(randomDelay);
  }

  console.log("--- All Events Sent ---");

  setTimeout(() => {
    conn.close();
    process.exit(0);
  }, 5000);
}

sendChaoticEvents().catch(console.error);
