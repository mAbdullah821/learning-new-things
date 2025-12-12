const broker = require("../infrastructure/Broker");
const db = require("../infrastructure/MockDatabase");
const config = require("../infrastructure/config");

class PaymentService {
  async start() {
    broker.consume(
      config.QUEUES.PAYMENT_WORK,
      config.KEYS.STOCK_RESERVED,
      async (data, msg) => {
        const { orderId, amount, itemId } = data;

        if (await db.hasProcessed(orderId, "payment_charge")) return;

        console.log(`💰 [Payment] Processing charge for Order ${orderId}...`);

        // SIMULATION: Random Failure
        const isSuccess = Math.random() > 0.3;

        if (isSuccess) {
          // --- CONCEPT: PIVOT TRANSACTION (Success) ---
          // We have crossed the line. The Saga is now expected to finish.
          // Any failures AFTER this point (Shipping) must be retried until they work.
          await db.markProcessed(orderId, "payment_charge");
          await broker.publish(config.KEYS.PAYMENT_PROCESSED, data);
        } else {
          // --- CONCEPT: PIVOT TRANSACTION (Failure) ---
          // We failed at the critical point. We cannot proceed.
          // We must initiate the "Rollback" flow (Compensation) for previous steps.
          console.error(`❌ [Payment] Charge failed! Triggering Rollback.`);

          await broker.publish(config.KEYS.PAYMENT_FAILED, {
            orderId,
            itemId, // Needed by Inventory to unlock the item
            reason: "Insufficient Funds",
          });
        }
      }
    );
  }
}

module.exports = new PaymentService();
