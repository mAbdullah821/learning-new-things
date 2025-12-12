// =========================================================
// --- SAGA STATE AND EVENT CONSTANTS ---
// Centralized constants for all states and events in the SAGA pattern.
// =========================================================

// --- CONCEPT: STATE AND EVENT CONSTANTS ---
// Centralized constants for all states and events to prevent typos and enable autocomplete.
// Using constants instead of string literals provides:
// - Type safety: IDE autocomplete prevents typos
// - Refactoring safety: Rename states/events in one place
// - Better maintainability: Single source of truth
// - Reusability: Can be imported by any file that needs state/event names

// --- DATA STRUCTURE: STATES ---
// Object mapping state names to their string values
// Structure: { STATE_NAME: "state_name_string", ... }
// Returns: Object
const STATES = {
  CREATED: "CREATED",
  RESERVING_STOCK: "RESERVING_STOCK",
  STOCK_RESERVED: "STOCK_RESERVED",
  PAID: "PAID",
  SHIPPED: "SHIPPED",
  ROLLING_BACK_STOCK: "ROLLING_BACK_STOCK",
  FAILED: "FAILED",
  COMPLETED: "COMPLETED",
};

// --- DATA STRUCTURE: EVENTS ---
// Object mapping event names to their string values
// Structure: { EVENT_NAME: "event_name_string", ... }
// Returns: Object
const EVENTS = {
  START: "START",
  INVENTORY_OK: "INVENTORY_OK",
  INVENTORY_FAIL: "INVENTORY_FAIL",
  PAYMENT_OK: "PAYMENT_OK",
  PAYMENT_FAIL: "PAYMENT_FAIL",
  SHIPPING_OK: "SHIPPING_OK",
  FINALIZE_OK: "FINALIZE_OK",
  ROLLBACK_DONE: "ROLLBACK_DONE",
};

module.exports = {
  STATES,
  EVENTS,
};
