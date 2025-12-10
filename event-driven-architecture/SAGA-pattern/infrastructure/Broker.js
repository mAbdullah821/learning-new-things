const amqp = require("amqplib");
const config = require("./config");

class Broker {
  constructor() {
    this.channel = null;
  }

  async init() {
    const conn = await amqp.connect(config.RABBIT_URL);
    this.channel = await conn.createChannel();

    await this.channel.assertExchange(config.EXCHANGE, "topic", {
      durable: true,
    });

    console.log("✅ Broker Connected");
  }

  async publish(routingKey, payload) {
    // ZOMBIE PROTECTION:
    // By using persistent messages (durable), if RabbitMQ crashes, events aren't lost.
    this.channel.publish(
      config.EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );

    console.log(`📡 [Emitted] ${routingKey} for Order ${payload.orderId}`);
  }

  async consume(queue, bindingKey, callback) {
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, config.EXCHANGE, bindingKey);

    // ZOMBIE PROTECTION:
    // manualAck mode. If the Node process crashes while working,
    // the message stays in RabbitMQ and is redelivered on restart.
    await this.channel.prefetch(1);

    this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        await callback(data, msg);
        this.channel.ack(msg); // Only ack if successful
      } catch (err) {
        console.error(`❌ Error in ${queue}:`, err.message);
        // RETRY STRATEGY:
        // If it's a "Pivot/Post-Pivot" retry, we NACK with requeue=true
        // If it's a logic error (Compensation), we might DeadLetter it.
        // For this example, we assume we want to retry forever on crash.
        this.channel.nack(msg, false, true);
      }
    });
  }
}

module.exports = new Broker();
