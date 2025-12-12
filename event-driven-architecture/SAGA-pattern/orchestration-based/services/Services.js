const db = require("../infrastructure/MockDatabase");

// =========================================================
// --- ORCHESTRATION SERVICES ---
// In Orchestration, services are "dumb" - they don't listen to events.
// Instead, they respond to direct method calls from the Orchestrator.
// This simulates RPC/HTTP calls in a real microservices architecture.
// =========================================================

// --- CONCEPT: RPC/HTTP SIMULATION ---
// Unlike Choreography (which uses message broker events), Orchestration
// uses direct service calls. In production, these would be:
// - HTTP REST calls
// - gRPC calls
// - Service mesh communication
// The Orchestrator acts as the client, services act as servers.

// =========================================================
// --- SERVICE 1: INVENTORY SERVICE ---
// =========================================================

const InventoryService = {
  /**
   * Reserves stock for an order using semantic locking.
   *
   * @param {string} itemId - The ID of the item to reserve
   * @returns {Promise<void>}
   */
  reserve: async (itemId) => {
    // Simulating Remote Procedure Call (RPC)
    console.log(`[Inventory] Request to reserve ${itemId}`);
    await db.reserveStock(itemId);
  },

  /**
   * Releases reserved stock (compensation action).
   *
   * @param {string} itemId - The ID of the item to release
   * @returns {Promise<void>}
   */
  release: async (itemId) => {
    console.log(`[Inventory] Request to release ${itemId}`);
    await db.releaseStock(itemId);
  },

  /**
   * Finalizes stock deduction after successful order completion.
   *
   * @param {string} itemId - The ID of the item to finalize
   * @returns {Promise<void>}
   */
  finalize: async (itemId) => {
    console.log(`[Inventory] Request to finalize deduction ${itemId}`);
    await db.confirmStockDeduction(itemId);
  },
};

// =========================================================
// --- SERVICE 2: PAYMENT SERVICE (The Pivot) ---
// =========================================================

// --- CONCEPT: PIVOT TRANSACTION ---
// Payment is the "point of no return" in the SAGA.
// - Before Pivot: If payment fails, we can rollback (compensate) previous steps
// - After Pivot: If shipping fails, we must retry (forward recovery) because
//   the customer has already paid. We cannot undo the payment.

const PaymentService = {
  /**
   * Charges the customer for the order.
   *
   * @description This is the PIVOT TRANSACTION. Throws Error if payment fails
   * (triggers compensation flow).
   *
   * @param {string} orderId - The ID of the order
   * @param {number} amount - The amount to charge
   * @returns {Promise<void>}
   * @throws {Error} If payment fails (e.g., "Insufficient Funds")
   */
  charge: async (orderId, amount) => {
    console.log(`[Payment] Charging $${amount} for ${orderId}`);

    // Simulation: 70% Success Rate
    const isSuccess = Math.random() > 0.3;

    if (!isSuccess) {
      throw new Error("Insufficient Funds");
    }
    console.log(`[Payment] Charge Successful`);
  },
};

// =========================================================
// --- SERVICE 3: SHIPPING SERVICE (Post-Pivot) ---
// =========================================================

// --- CONCEPT: RETRIABLE TRANSACTION (Forward Recovery) ---
// Since Shipping happens AFTER the Pivot (Payment succeeded), we cannot fail.
// The customer has already paid, so we MUST deliver.
// This service handles its own retries internally - it will keep trying
// until it succeeds. The Orchestrator doesn't need to handle SHIPPING_FAIL
// because this service guarantees eventual success.

const ShippingService = {
  /**
   * Ships the order to the customer.
   *
   * @description This implements FORWARD RECOVERY. Retries internally until success
   * (never throws in normal operation). Since this happens AFTER the pivot (Payment succeeded),
   * we cannot fail. The customer has already paid, so we MUST deliver.
   *
   * @param {string} orderId - The ID of the order to ship
   * @returns {Promise<void>}
   */
  ship: async (orderId) => {
    console.log(`[Shipping] Dispatching ${orderId}`);

    // --- CONCEPT: FORWARD RECOVERY ---
    // We simulate a flaky network that eventually works.
    // In production, this might be:
    // - External API that's temporarily down
    // - Network timeout that resolves on retry
    // - Rate limiting that clears after delay
    let attempts = 0;
    while (true) {
      attempts++;
      try {
        // Simulation: 50% chance of network error
        if (Math.random() < 0.5) throw new Error("Network Glitch");

        console.log(`[Shipping] Success on attempt ${attempts}`);
        return; // Exit loop on success
      } catch (e) {
        console.warn(`⚠️ [Shipping] Attempt ${attempts} failed. Retrying...`);
        await new Promise((r) => setTimeout(r, 500)); // Wait 500ms before retry
      }
    }
  },
};

module.exports = { InventoryService, PaymentService, ShippingService };
