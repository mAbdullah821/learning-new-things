class MockDatabase {
  constructor() {
    // Map<ItemId, { qty, lockedQty }>
    this.inventory = new Map();
    // Map<OrderId, { status, itemId, amount }>
    this.orders = new Map();

    // --- CONCEPT: IDEMPOTENCY STORE ---
    // In distributed systems, networks fail and messages get redelivered.
    // We must ensure that running the same logic twice doesn't corrupt data.
    // We track processed events by ID.
    this.processedEvents = new Set();
  }

  async hasProcessed(orderId, step) {
    const key = `${orderId}:${step}`;
    return this.processedEvents.has(key);
  }

  async markProcessed(orderId, step) {
    const key = `${orderId}:${step}`;
    this.processedEvents.add(key);
  }

  // =========================================================
  // --- INVENTORY BOUNDED CONTEXT ---
  // This section represents the private data store of the Inventory Service.
  // External access is strictly prohibited to maintain service autonomy.
  // =========================================================

  // --- CONCEPT: SEMANTIC LOCKING (Dirty Read Protection) ---
  // Problem: In SAGAs, we can't lock the database row for the whole duration
  // (it might take seconds).
  // Solution: We introduce a logical state ('lockedQty').
  // - Actual Stock: 10
  // - Available Stock: 10 - 1 = 9
  // Other transactions see '9' immediately, preserving consistency without
  // blocking the database row.

  initItem(itemId, qty) {
    this.inventory.set(itemId, { qty, lockedQty: 0 });
  }

  async reserveStock(itemId) {
    const item = this.inventory.get(itemId);

    if (!item) throw new Error(`Item ${itemId} not found`);
    if (item.qty - item.lockedQty <= 0) throw new Error("Out of Stock");

    item.lockedQty++;
    console.log(
      `   [DB] Item ${itemId} Locked. (Total: ${item.qty}, Locked: ${item.lockedQty})`
    );
  }

  async releaseStock(itemId) {
    const item = this.inventory.get(itemId);
    // Idempotent: if item gone, nothing to release
    if (!item) return;

    if (item.lockedQty > 0) item.lockedQty--;
    console.log(
      `   [DB] Item ${itemId} Released (Compensation). (Locked: ${item.lockedQty})`
    );
  }

  async confirmStockDeduction(itemId) {
    const item = this.inventory.get(itemId);

    if (!item) throw new Error(`Item ${itemId} not found`);

    // Finalize: Convert the "Semantic Lock" into a real permanent deduction
    item.qty--;
    item.lockedQty--;
    console.log(
      `   [DB] Item ${itemId} PERMANENTLY Deducted. (New Total: ${item.qty})`
    );
  }

  // =========================================================
  // --- ORDER BOUNDED CONTEXT ---
  // Only Order Service should call these methods.
  // =========================================================

  async initOrder(orderId, itemId, amount) {
    this.orders.set(orderId, {
      status: "PENDING",
      itemId,
      amount,
    });

    console.log(`   [DB] Order ${orderId} Created (Status: PENDING)`);
  }

  async updateOrderStatus(orderId, status) {
    const order = this.orders.get(orderId);
    if (!order) return; // Or throw error

    order.status = status;
    console.log(`   [DB] Order ${orderId} Updated -> ${status}`);
  }
}

module.exports = new MockDatabase();
