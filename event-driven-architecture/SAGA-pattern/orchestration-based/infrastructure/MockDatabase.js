class MockDatabase {
  constructor() {
    // --- DATA STRUCTURE: INVENTORY MAP ---
    // Map<ItemId, { qty: number, lockedQty: number }>
    // Stores inventory items with their total quantity and locked quantity
    this.inventory = new Map();

    // --- DATA STRUCTURE: ORDERS MAP ---
    // Map<OrderId, { status: string, itemId: string, amount: number }>
    // Stores order information including current state, item, and amount
    this.orders = new Map();
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

  /**
   * Initializes an item in the inventory with the specified quantity.
   *
   * @param {string} itemId - The ID of the item
   * @param {number} qty - The initial quantity of the item
   * @returns {void}
   */
  initItem(itemId, qty) {
    this.inventory.set(itemId, { qty, lockedQty: 0 });
  }

  /**
   * Reserves stock for an item using semantic locking.
   *
   * @description Implements semantic locking to prevent dirty reads without blocking
   * the database row. Increments the lockedQty counter.
   *
   * @param {string} itemId - The ID of the item to reserve
   * @returns {Promise<void>}
   * @throws {Error} If item is not found or out of stock
   */
  async reserveStock(itemId) {
    const item = this.inventory.get(itemId);

    if (!item) throw new Error(`Item ${itemId} not found`);
    if (item.qty - item.lockedQty <= 0) throw new Error("Out of Stock");

    item.lockedQty++;
    console.log(
      `   [DB] Item ${itemId} Locked. (Total: ${item.qty}, Locked: ${item.lockedQty})`
    );
  }

  /**
   * Releases reserved stock (compensation action).
   *
   * @description Idempotent operation: if item is gone, nothing to release.
   * Decrements the lockedQty counter.
   *
   * @param {string} itemId - The ID of the item to release
   * @returns {Promise<void>}
   */
  async releaseStock(itemId) {
    const item = this.inventory.get(itemId);
    // Idempotent: if item gone, nothing to release
    if (!item) return;

    if (item.lockedQty > 0) item.lockedQty--;
    console.log(
      `   [DB] Item ${itemId} Released (Compensation). (Locked: ${item.lockedQty})`
    );
  }

  /**
   * Confirms and finalizes stock deduction after successful order completion.
   *
   * @description Converts the semantic lock into a real permanent deduction.
   * Decrements both qty and lockedQty.
   *
   * @param {string} itemId - The ID of the item to finalize
   * @returns {Promise<void>}
   * @throws {Error} If item is not found
   */
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
  // In Orchestration, the Orchestrator needs to persist and retrieve order state
  // for crash recovery (Zombie Saga handling).
  // =========================================================

  /**
   * Initializes a new order in the database.
   *
   * @param {string} orderId - The ID of the order
   * @param {string} itemId - The ID of the item being ordered
   * @param {number} amount - The order amount
   * @returns {Promise<void>}
   */
  async initOrder(orderId, itemId, amount) {
    this.orders.set(orderId, {
      status: "CREATED",
      itemId,
      amount,
    });

    console.log(`   [DB] Order ${orderId} Persisted (Status: CREATED)`);
  }

  /**
   * Updates the status of an existing order.
   *
   * @param {string} orderId - The ID of the order
   * @param {string} status - The new status to set
   * @returns {Promise<void>}
   */
  async updateOrderStatus(orderId, status) {
    const order = this.orders.get(orderId);
    if (!order) return; // Or throw error

    order.status = status;
    console.log(`   [DB] Order ${orderId} State Updated -> ${status}`);
  }

  /**
   * Retrieves an order from the database.
   *
   * @description Used by Orchestrator to hydrate state after crash recovery.
   *
   * @param {string} orderId - The ID of the order to retrieve
   * @returns {Promise<Object|undefined>} Order object: { status: string, itemId: string, amount: number }
   */
  async getOrder(orderId) {
    return this.orders.get(orderId);
  }
}

module.exports = new MockDatabase();
