const db = require("./infrastructure/MockDatabase");
const {
  InventoryService,
  PaymentService,
  ShippingService,
} = require("./services/Services");
const { STATES, EVENTS } = require("./constants");

// =========================================================
// --- ORDER ORCHESTRATOR ---
// This is the "Central Brain" of the Orchestration-based SAGA.
// It combines the Saga State Machine with Execution Logic.
// =========================================================

// --- CONCEPT: ORCHESTRATION vs CHOREOGRAPHY ---
// Orchestration: Centralized control - one orchestrator manages everything
// Choreography: Distributed control - services communicate via events
//
// Benefits of Orchestration:
// - Single source of truth for workflow logic
// - Easier to understand and debug
// - Better visibility into workflow state
// - Simpler error handling and recovery

class OrderOrchestrator {
  constructor(orderId) {
    this.orderId = orderId;

    // --- DATA STRUCTURE: STATE ---
    // string - Current state of the saga (e.g., "CREATED", "RESERVING_STOCK", "PAID")
    // Default state in memory (will be hydrated from DB on init)
    this.state = STATES.CREATED;

    // --- DATA STRUCTURE: CONTEXT ---
    // Object - Holds saga data: { itemId: string, amount: number }
    // This context is passed between states and used by actions
    this.context = {};

    // --- CONCEPT: CENTRALIZED STATE-ACTION MAPPING ---
    // This map defines which action to execute when entering each state.
    // It's used for both:
    // 1. Building the FSM transitions (actions execute when transitioning TO a state)
    // 2. Crash recovery (resume the action when recovering FROM a state)
    //
    // Structure: { [state: string]: Function }
    // - Key: Target state name
    // - Value: Action function to execute when entering this state
    //
    // This single source of truth ensures consistency and makes updates easier.
    this.stateActionMap = {
      [STATES.CREATED]: this.doStart, // Action for initial state
      [STATES.RESERVING_STOCK]: this.doReserve,
      [STATES.STOCK_RESERVED]: this.doPayment,
      [STATES.PAID]: this.doShipping,
      [STATES.SHIPPED]: this.doFinalize,
      [STATES.ROLLING_BACK_STOCK]: this.doCompensateStock,
      [STATES.FAILED]: this.doNotifyFail,
      [STATES.COMPLETED]: this.doSuccessLog,
    };
  }

  /**
   * Initializes the orchestrator by loading the saga state from the database.
   * This is crucial for crash recovery (Zombie Saga handling).
   *
   * @description Loads the Saga state from the database. If the server crashes during
   * saga execution, when it restarts, we can load the persisted state and resume from
   * where we left off. This prevents "Zombie Sagas" - sagas that are stuck in an unknown state.
   *
   * @returns {Promise<void>}
   * @throws {Error} If order is not found in the database
   */
  async init() {
    const order = await db.getOrder(this.orderId);
    if (!order) throw new Error("Order not found");

    // Hydrate state from persisted data
    this.state = order.status;
    this.context = { itemId: order.itemId, amount: order.amount };
  }

  /**
   * Unified execution method - the single entry point for executing the saga workflow.
   *
   * @description This method automatically determines what to do based on the current state:
   * - If terminal state (COMPLETED/FAILED): Does nothing
   * - If any other state: Executes the action associated with that state
   *
   * This unified approach means main.js only needs to call one method: execute().
   * It works for both new orders (CREATED state) and crash recovery (any state).
   * The orchestrator handles everything automatically.
   *
   * How it works:
   * 1. Check if we're in a terminal state -> return early
   * 2. Get the action from stateActionMap for current state
   * 3. Execute the action (which will trigger next transitions)
   * 4. The action chain continues automatically until terminal state
   *
   * @returns {Promise<void>}
   * @throws {Error} If no action is defined for the current state
   */
  async execute() {
    // Terminal states don't need execution
    if (this.state === STATES.COMPLETED || this.state === STATES.FAILED) {
      console.log(
        `ℹ️ [Saga ${this.orderId}] Already in terminal state: ${this.state}`
      );
      return;
    }

    // Get the action for the current state
    const actionToExecute = this.stateActionMap[this.state];

    if (!actionToExecute) {
      throw new Error(
        `Unknown state: ${this.state}. No action defined for this state.`
      );
    }

    console.log(
      `🚀 [Saga ${this.orderId}] Executing from state: ${this.state}`
    );

    // Execute the action associated with the current state
    // The action will handle transitions and continue the workflow
    await actionToExecute.call(this);
  }

  /**
   * Returns the Finite State Machine (FSM) transitions definition.
   *
   * @description A State Machine is defined by three rules:
   * 1. Finite States: You can only be in ONE state at a time
   * 2. Transitions: You move from one state to another based on an Event
   * 3. Guards: You cannot jump randomly - only valid transitions are allowed
   *
   * This map defines: CurrentState -> Event -> { NextState, Action }
   * It enforces the rules of the Saga and makes the workflow explicit.
   *
   * The STATE-EVENT-ACTION-EVENT CYCLE:
   * 1. Current State: The saga sits in a state (e.g., "CREATED")
   * 2. Event Triggers: An event occurs (e.g., "START")
   * 3. State Transition: The FSM moves to the target state (e.g., "RESERVING_STOCK")
   * 4. Action Execution: The associated action runs (e.g., doReserve())
   * 5. Action Result: The action completes and determines the next event
   * 6. Loop: The new event triggers the next transition, repeating the cycle
   *
   * The transitions are built using the centralized stateActionMap. This ensures
   * consistency: the same action mapping is used for transitions and resume.
   * When adding a new state, update stateActionMap once, and it's used everywhere.
   *
   * @returns {Object} The FSM transitions map
   * @returns {Object.<string, Object.<string, {target: string, action: Function}>>} transitions
   * Structure: { [state: string]: { [event: string]: { target: string, action: Function } } }
   */
  get transitions() {
    // Build transitions using the centralized stateActionMap
    // For each transition, get the action from stateActionMap[targetState]
    return {
      [STATES.CREATED]: {
        [EVENTS.START]: {
          target: STATES.RESERVING_STOCK,
          action: this.stateActionMap[STATES.RESERVING_STOCK],
        },
      },
      [STATES.RESERVING_STOCK]: {
        [EVENTS.INVENTORY_OK]: {
          target: STATES.STOCK_RESERVED,
          action: this.stateActionMap[STATES.STOCK_RESERVED],
        },
        [EVENTS.INVENTORY_FAIL]: {
          target: STATES.FAILED,
          action: this.stateActionMap[STATES.FAILED],
        },
      },
      [STATES.STOCK_RESERVED]: {
        [EVENTS.PAYMENT_OK]: {
          target: STATES.PAID,
          action: this.stateActionMap[STATES.PAID],
        },
        [EVENTS.PAYMENT_FAIL]: {
          target: STATES.ROLLING_BACK_STOCK,
          action: this.stateActionMap[STATES.ROLLING_BACK_STOCK],
        }, // <--- Pivot Failure: Triggers Compensation
      },
      [STATES.ROLLING_BACK_STOCK]: {
        [EVENTS.ROLLBACK_DONE]: {
          target: STATES.FAILED,
          action: this.stateActionMap[STATES.FAILED],
        },
      },
      [STATES.PAID]: {
        // --- CONCEPT: POST-PIVOT BEHAVIOR ---
        // Post-Pivot: We don't have a FAIL transition here because Shipping
        // retries internally. The FSM doesn't need to handle SHIPPING_FAIL
        // because ShippingService guarantees eventual success (forward recovery).
        [EVENTS.SHIPPING_OK]: {
          target: STATES.SHIPPED,
          action: this.stateActionMap[STATES.SHIPPED],
        },
      },
      [STATES.SHIPPED]: {
        [EVENTS.FINALIZE_OK]: {
          target: STATES.COMPLETED,
          action: this.stateActionMap[STATES.COMPLETED],
        },
      },
      [STATES.FAILED]: {}, // Terminal State - no transitions allowed
      [STATES.COMPLETED]: {}, // Terminal State - no transitions allowed
    };
  }

  /**
   * Handles state transitions in the Finite State Machine.
   *
   * @description This method handles the mechanics of state transitions:
   * 1. Check Rule: Validate that the transition is allowed from current state
   * 2. Update DB: Persist the new state FIRST (before executing action)
   * 3. Run Action: Execute the side effect (calling services)
   *
   * The order matters: We persist state BEFORE executing action to enable crash recovery.
   * If we crash during action execution, we can resume from the persisted state.
   *
   * @param {string} event - The event that triggers the transition
   * @param {any} [payload] - Optional data passed to the action
   * @returns {Promise<void>}
   * @throws {Error} If the transition is invalid (event not allowed from current state)
   */
  async transition(event, payload) {
    const rules = this.transitions[this.state];
    const nextStep = rules ? rules[event] : null;

    if (!nextStep) {
      throw new Error(
        `Invalid Transition: Cannot '${event}' from '${this.state}'`
      );
    }

    console.log(
      `\n🔄 [Saga ${this.orderId}] FSM: ${this.state} -> ${nextStep.target} (Event: ${event})`
    );

    // 1. PERSISTENCE (Save State FIRST)
    // --- CONCEPT: STATE PERSISTENCE ---
    // If we crash after this line, we restart in the new state.
    // This is critical for crash recovery. For example:
    // - If we crash during doPayment, the DB says "STOCK_RESERVED"
    // - When server restarts, we know we were supposed to be doing payment
    // - We can resume from that point
    this.state = nextStep.target;
    await db.updateOrderStatus(this.orderId, this.state);

    // 2. SIDE EFFECT (Execute Action)
    if (nextStep.action) {
      // We use .call(this) to ensure 'this' refers to the Orchestrator instance
      // This allows actions to access this.orderId, this.context, etc.
      await nextStep.action.call(this, payload);
    }
  }

  // =========================================================
  // --- ACTIONS (The "Doing" part) ---
  // Actions are the side effects that happen during state transitions.
  // They call services and trigger the next transition based on results.
  // =========================================================

  /**
   * Action for CREATED state - triggers the START event to begin the saga workflow.
   *
   * @returns {Promise<void>}
   */
  async doStart() {
    await this.transition(EVENTS.START);
  }

  /**
   * Reserves stock for the order using InventoryService.
   *
   * @description Attempts to reserve stock. On success, triggers INVENTORY_OK event.
   * On failure, triggers INVENTORY_FAIL event which moves to FAILED state.
   *
   * @returns {Promise<void>}
   */
  async doReserve() {
    try {
      await InventoryService.reserve(this.context.itemId);
      // Trigger next step: Move to STOCK_RESERVED state
      await this.transition(EVENTS.INVENTORY_OK);
    } catch (e) {
      console.error(`❌ Inventory failed: ${e.message}`);
      // Trigger failure path: Move to FAILED state
      await this.transition(EVENTS.INVENTORY_FAIL, e.message);
    }
  }

  /**
   * Processes payment for the order using PaymentService.
   *
   * @description This is the PIVOT TRANSACTION - the point of no return.
   * - On success: Triggers PAYMENT_OK event (crossing the pivot)
   * - On failure: Triggers PAYMENT_FAIL event (triggers compensation flow)
   *
   * After payment succeeds, failures must use forward recovery (retry), not compensation.
   *
   * @returns {Promise<void>}
   */
  async doPayment() {
    try {
      await PaymentService.charge(this.orderId, this.context.amount);
      // --- CONCEPT: CROSSING THE PIVOT ---
      // Payment succeeded - we've crossed the point of no return.
      // From now on, failures must use forward recovery (retry), not compensation.
      await this.transition(EVENTS.PAYMENT_OK);
    } catch (e) {
      console.error(`❌ Payment failed: ${e.message}`);
      // --- CONCEPT: PIVOT FAILURE - TRIGGER COMPENSATION ---
      // Payment failed before the pivot. We must trigger compensation
      // to undo previous steps (release reserved stock).
      await this.transition(EVENTS.PAYMENT_FAIL);
    }
  }

  /**
   * Compensates for failed payment by releasing reserved stock.
   *
   * @description This implements BACKWARD RECOVERY (Compensation). When a step fails
   * BEFORE the pivot, we must undo previous steps. This is called "compensation" or
   * "backward recovery". We go backwards through the workflow, undoing each step.
   *
   * @returns {Promise<void>}
   */
  async doCompensateStock() {
    console.log("⚠️ Triggering Compensation: Releasing Stock");
    await InventoryService.release(this.context.itemId);
    await this.transition(EVENTS.ROLLBACK_DONE);
  }

  /**
   * Handles shipping of the order using ShippingService.
   *
   * @description This implements FORWARD RECOVERY (Retry). ShippingService.ship() handles
   * its own retries internally. If it throws here, it means the world is broken (unrecoverable).
   * But functionally, we treat it as "It will eventually succeed".
   *
   * The FSM doesn't have a SHIPPING_FAIL transition because we don't accept failure after the pivot.
   *
   * @returns {Promise<void>}
   */
  async doShipping() {
    await ShippingService.ship(this.orderId);
    await this.transition(EVENTS.SHIPPING_OK);
  }

  /**
   * Finalizes the inventory deduction after successful shipping.
   *
   * @description This implements POST-SAGA CLEANUP (Eventual Consistency). After successful
   * shipping, we finalize the inventory deduction. This converts the semantic lock into
   * a permanent deduction.
   *
   * @returns {Promise<void>}
   */
  async doFinalize() {
    await InventoryService.finalize(this.context.itemId);
    await this.transition(EVENTS.FINALIZE_OK);
  }

  /**
   * Logs successful completion of the order.
   *
   * @returns {Promise<void>}
   */
  async doSuccessLog() {
    console.log(`🎉 ORDER ${this.orderId} COMPLETED SUCCESSFULLY!`);
  }

  /**
   * Logs order failure with the provided reason.
   *
   * @param {string} [reason] - The reason for the failure
   * @returns {Promise<void>}
   */
  async doNotifyFail(reason) {
    console.log(
      `💀 ORDER ${this.orderId} FAILED. Reason: ${reason || "Unknown"}`
    );
  }
}

module.exports = OrderOrchestrator;
