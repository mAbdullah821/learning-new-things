const broker = require("../infrastructure/Broker");
const db = require("../infrastructure/MockDatabase");
const config = require("../infrastructure/config");

class InventoryService {
  async start() {
    // 1. RESERVE (Start - Forward Action)
    broker.consume(
      config.QUEUES.INVENTORY_WORK,
      config.KEYS.ORDER_CREATED,
      async (data, msg) => {
        const { orderId, itemId } = data;

        if (await db.hasProcessed(orderId, "inventory_reserve")) return;

        try {
          await db.reserveStock(itemId);
          await db.markProcessed(orderId, "inventory_reserve");
          await broker.publish(config.KEYS.STOCK_RESERVED, data);
        } catch (err) {
          console.error(`❌ [Inventory] Reservation failed: ${err.message}`);
          // In a real app, we would emit ORDER_FAILED here to kill the Saga early
        }
      }
    );

    // 2. COMPENSATE (Failure Handling - Backward Action)
    broker.consume(
      config.QUEUES.INVENTORY_COMPENSATE,
      config.KEYS.PAYMENT_FAILED,
      async (data, msg) => {
        const { orderId, itemId } = data;

        // --- CONCEPT: IDEMPOTENT COMPENSATION ---
        // Even during rollback, we must process events exactly once.
        // If we release the lock twice for the same order, we might corrupt the aggregate stock count
        // (e.g., releasing stock reserved by a different order).
        if (await db.hasProcessed(orderId, "inventory_compensate")) return;

        console.log(`↩️ [Inventory] Compensating Order ${orderId}...`);
        await db.releaseStock(itemId);
        await db.markProcessed(orderId, "inventory_compensate");
      }
    );

    // 3. FINALIZE (Success Handling - Post Pivot)
    // --- CONCEPT: EVENTUAL CONSISTENCY & BOUNDED CONTEXT ---
    // The Order Service updates its status independently.
    // This handler runs in the background to finalize the data consistency
    // within the Inventory Bounded Context.
    // ONLY InventoryService is allowed to modify the Inventory table.
    broker.consume(
      config.QUEUES.INVENTORY_FINALIZE,
      config.KEYS.ORDER_SHIPPED,
      async (data, msg) => {
        const { orderId, itemId } = data;

        // Idempotency is CRITICAL here. We must not deduct stock twice.
        if (await db.hasProcessed(orderId, "inventory_finalize")) return;

        console.log(`🔒 [Inventory] Finalizing stock for Order ${orderId}...`);

        try {
          // This converts the "Lock" to a "Hard Delete"
          await db.confirmStockDeduction(itemId);
          await db.markProcessed(orderId, "inventory_finalize");
        } catch (err) {
          // --- CONCEPT: FORWARD RECOVERY ---
          // We are Post-Pivot. We cannot Cancel. We cannot Undo.
          // We MUST succeed. If DB is down, we throw Error.
          // RabbitMQ will NACK and redeliver this message until DB comes back.
          console.error(`⚠️ [Inventory] Finalization failed. Retrying...`);
          throw err;
        }
      }
    );
  }
}

module.exports = new InventoryService();
