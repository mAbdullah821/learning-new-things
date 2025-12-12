const broker = require("../infrastructure/Broker");
const db = require("../infrastructure/MockDatabase");
const config = require("../infrastructure/config");

class ShippingService {
  async start() {
    broker.consume(
      config.QUEUES.SHIPPING_WORK,
      config.KEYS.PAYMENT_PROCESSED,
      async (data, msg) => {
        const { orderId } = data;

        if (await db.hasProcessed(orderId, "shipping_dispatch")) return;

        console.log(`🚚 [Shipping] Dispatching Order ${orderId}...`);

        // SIMULATION: High Failure Rate
        const apiUp = Math.random() > 0.5;

        if (!apiUp) {
          // --- CONCEPT: FORWARD RECOVERY ---
          // We are after the Pivot (Payment succeeded). We CANNOT Cancel now.
          // The user has paid. We must deliver.
          // Instead of emitting a failure event, we Throw an Error.
          // The RabbitMQ Broker will catch this, NACK it, and redeliver it.
          // We keep trying until we succeed.
          console.warn(`⚠️ [Shipping] External API down. Retrying...`);
          throw new Error("Shipping Service Unavailable");
        }

        console.log(`✅ [Shipping] Shipped Successfully!`);

        await db.markProcessed(orderId, "shipping_dispatch");
        await broker.publish(config.KEYS.ORDER_SHIPPED, data);
      }
    );
  }
}

module.exports = new ShippingService();
