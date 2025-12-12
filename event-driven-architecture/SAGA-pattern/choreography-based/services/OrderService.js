const broker = require("../infrastructure/Broker");
const config = require("../infrastructure/config");
const db = require("../infrastructure/MockDatabase");

class OrderService {
  async start() {
    console.log("[OrderService] Listeners Started");

    // --- LISTENER 1: SUCCESS FLOW (Terminal State) ---
    // We listen to Shipping Completed.
    // --- CONCEPT: STATE OWNER ---
    // The Order Service is the sole authority on the Order Status.
    // It maintains its own local state based on events from other services,
    // ensuring Decoupled Architecture.
    broker.consume(
      config.QUEUES.ORDER_SUCCESS,
      config.KEYS.ORDER_SHIPPED,
      async (data, msg) => {
        const { orderId } = data;

        // Idempotency check ensures we don't log "Success" twice
        if (await db.hasProcessed(orderId, "order_complete_status")) return;

        console.log(
          `🎉 [OrderService] SAGA SUCCESS: Order ${orderId} marked COMPLETED.`
        );

        // Update local state only
        await db.updateOrderStatus(orderId, "COMPLETED");

        await db.markProcessed(orderId, "order_complete_status");
      }
    );

    // --- LISTENER 2: FAILURE FLOW (Rollback State) ---
    // If Payment fails, the order is dead.
    broker.consume(
      config.QUEUES.ORDER_FAILURE,
      config.KEYS.PAYMENT_FAILED,
      async (data, msg) => {
        const { orderId, reason } = data;

        if (await db.hasProcessed(orderId, "order_failed_status")) return;

        console.log(
          `💀 [OrderService] SAGA FAILED: Order ${orderId} marked FAILED. Reason: ${reason}`
        );

        // Update local state only
        await db.updateOrderStatus(orderId, "FAILED");

        await db.markProcessed(orderId, "order_failed_status");
      }
    );
  }

  // --- SAGA STARTER ---
  async createOrder(orderId, itemId, amount) {
    console.log(`\n--- [OrderService] Request Received: ${orderId} ---`);

    // 1. Initialize Local State
    await db.initOrder(orderId, itemId, amount);

    // 2. Start Saga
    await broker.publish(config.KEYS.ORDER_CREATED, {
      orderId,
      itemId,
      amount,
    });
  }
}

module.exports = new OrderService();
