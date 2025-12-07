const amqp = require("amqplib");
const config = require("./config");

class EventPublisher {
  constructor() {
    this.channel = null;
  }

  async init() {
    const conn = await amqp.connect(config.RABBIT_URL);
    this.channel = await conn.createChannel();

    // --- CONCEPT: DURABILITY ---
    // We assert the exchange as 'durable: true'.
    // Why? If RabbitMQ crashes/restarts, we want this exchange to survive.
    // If it were false, the exchange would vanish, and subsequent publishes would fail.
    await this.channel.assertExchange(config.EXCHANGE, "topic", {
      durable: true,
    });

    console.log("[EventPublisher] Connected to RabbitMQ");
  }

  async publish(event) {
    if (!this.channel) throw new Error("Publisher not initialized");

    // --- CONCEPT: DECOUPLING ---
    // The Aggregate (BankAccount) calls this. It doesn't know about RabbitMQ buffers,
    // routing keys, or serialization. It just hands over the object.
    // This makes testing the Aggregate easier (we can mock this class).
    this.channel.publish(
      config.EXCHANGE,
      config.ROUTING_KEY,
      Buffer.from(JSON.stringify(event))
    );
  }
}

module.exports = new EventPublisher();
