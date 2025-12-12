const db = require("./infrastructure/MockDatabase");
const OrderOrchestrator = require("./OrderOrchestrator");
const { STATES, EVENTS } = require("./constants");

// =========================================================
// --- ORCHESTRATION SAGA BOOTSTRAP ---
// This file demonstrates the Orchestration-based SAGA pattern
// using a Finite State Machine (FSM) approach.
// =========================================================

// --- TEST DATA CONSTANTS ---
// Constants for test data to prevent typos and enable easy changes
const TEST_ITEM_ID = "item-101";
const TEST_ITEM_QUANTITY = 10;
const TEST_ORDER_AMOUNT = 50;

async function main() {
  console.log("--- BOOTSTRAPPING ORCHESTRATION SAGA ---");

  // 1. Initialize Data
  // Create a test item in inventory
  db.initItem(TEST_ITEM_ID, TEST_ITEM_QUANTITY);

  /**
   * Creates and runs an order through the saga workflow.
   *
   * @description Unified function that works for both new orders and crash recovery.
   * The orchestrator automatically determines what to do based on the current state.
   *
   * @param {string} id - Order ID
   * @param {string} [initialState=STATES.CREATED] - The state to start from (for crash recovery simulation).
   *                                                If not provided, defaults to CREATED (new order)
   * @returns {Promise<void>}
   */
  async function createAndRunOrder(id, initialState = STATES.CREATED) {
    if (initialState === STATES.CREATED) {
      console.log(`\n\n=== STARTING NEW ORDER: ${id} ===`);
    } else {
      console.log(
        `\n\n=== RESUMING ORDER FROM CRASH: ${id} (State: ${initialState}) ===`
      );
    }

    // 1. Check if order exists, create only if it doesn't
    const existingOrder = await db.getOrder(id);
    if (!existingOrder) {
      // Order doesn't exist, create it
      await db.initOrder(id, TEST_ITEM_ID, TEST_ORDER_AMOUNT);
      // If simulating crash recovery, set the state to the recovery state
      if (initialState !== STATES.CREATED) {
        await db.updateOrderStatus(id, initialState);
      }
    } else {
      console.log(
        `ℹ️ Order ${id} already exists, using existing state: ${existingOrder.status}`
      );
    }

    // 2. Instantiate Orchestrator
    const saga = new OrderOrchestrator(id);

    // 3. Hydrate (Load from DB)
    // Load the persisted state from database (CREATED for new orders, or recovery state)
    await saga.init();

    // 4. Execute
    // Single method that handles everything:
    // - If CREATED: Executes doStart() which triggers START event
    // - If any other state: Executes the action for that state
    // - If terminal: Does nothing
    // The orchestrator automatically continues the workflow until completion
    await saga.execute();
  }

  // =========================================================
  // --- EXAMPLE 1: NORMAL FLOW (Starting from Beginning) ---
  // =========================================================
  console.log("\n--- EXAMPLE 1: Normal Flow from START ---");
  // Run Order - Normal flow from the beginning (CREATED state)
  // The orchestrator will automatically execute doStart() which triggers the workflow
  // This order will go through the complete workflow:
  // CREATED -> RESERVING_STOCK -> STOCK_RESERVED -> PAID -> SHIPPED -> COMPLETED
  // (or fail at payment and trigger compensation)
  await createAndRunOrder("ord_1");

  // =========================================================
  // --- EXAMPLE 2: CRASH RECOVERY (Resuming from Middle) ---
  // =========================================================
  console.log(
    "\n\n--- EXAMPLE 2: Crash Recovery - Resuming from STOCK_RESERVED ---"
  );
  // Simulate: Server crashed during payment processing
  // When it restarts, the order is in "STOCK_RESERVED" state
  // The orchestrator will automatically execute doPayment() for this state
  await createAndRunOrder("ord_crash_1", STATES.STOCK_RESERVED);
}

main().catch(console.error);
