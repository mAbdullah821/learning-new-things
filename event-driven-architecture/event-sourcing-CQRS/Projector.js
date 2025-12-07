const amqp = require("amqplib");
const config = require("./config");
const readModel = require("./ReadModelDB");

async function startProjector() {
  const conn = await amqp.connect(config.RABBIT_URL);
  const channel = await conn.createChannel();

  await channel.assertQueue(config.QUEUE, { durable: true });
  await channel.bindQueue(config.QUEUE, config.EXCHANGE, config.ROUTING_KEY);

  // --- CONCEPT: STRICT ORDERING (Head-of-Line) ---
  // We set prefetch(1). This ensures we process Event 1, finish it,
  // and ONLY THEN grab Event 2.
  // If we allowed parallel processing (e.g., prefetch 10), Event 2 might
  // finish updating the DB before Event 1, causing a race condition
  // where the balance is calculated wrongly or the Idempotency check fails.
  await channel.prefetch(1);

  console.log("[Projector] Started Listening...");

  channel.consume(config.QUEUE, (msg) => {
    if (!msg) return;
    const event = JSON.parse(msg.content.toString());

    try {
      // Apply the change to the Read Database
      readModel.applyUpdate(
        event.streamId,
        event.type,
        event.data,
        event.seqNum
      );

      // --- CONCEPT: AT-LEAST-ONCE DELIVERY ---
      // We Ack ONLY after the DB update is successful.
      // If the Node process crashes at the line above, the Ack is never sent.
      // RabbitMQ will redeliver this message later, ensuring we never lose data.
      // This is why the Idempotency check in ReadModelDB is mandatory.
      channel.ack(msg);
    } catch (err) {
      console.error("[Projector] Error applying event:", err);
      // In a real app, you might Dead-Letter this message to avoid infinite loops.
    }
  });
}

module.exports = startProjector;
