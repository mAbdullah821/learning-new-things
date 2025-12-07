const amqp = require("amqplib");

async function sendChaoticEvents() {
  const conn = await amqp.connect("amqp://localhost");
  const channel = await conn.createChannel();
  const queue = "ordered_events";

  await channel.assertQueue(queue, { durable: false });

  const entityId = "order_555";

  // We want to process: 0, 1, 2, 3
  // We send them scrambled: 0, 2, 1, 3
  const events = [
    { id: entityId, seqNum: 0, data: "Order Created" },
    { id: entityId, seqNum: 2, data: "Payment Charged" }, // <--- OUT OF ORDER
    { id: entityId, seqNum: 1, data: "Items Reserved" }, // <--- LATE ARRIVAL
    { id: entityId, seqNum: 3, data: "Order Shipped" },
  ];

  console.log("--- Sending Events Out-of-Order ---");

  for (const event of events) {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(event)));
    console.log(`[Producer] Sent Seq: ${event.seqNum}`);
    // Add tiny delay to ensure they arrive in the scramble order
    await new Promise((r) => setTimeout(r, 100));
  }

  setTimeout(() => {
    conn.close();
    process.exit(0);
  }, 500);
}

sendChaoticEvents();
