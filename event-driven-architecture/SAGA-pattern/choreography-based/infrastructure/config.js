module.exports = {
  RABBIT_URL: "amqp://localhost",
  EXCHANGE: "saga_exchange",

  KEYS: {
    ORDER_CREATED: "order.created",
    STOCK_RESERVED: "inventory.reserved",
    PAYMENT_PROCESSED: "payment.processed",
    PAYMENT_FAILED: "payment.failed",
    ORDER_SHIPPED: "shipping.completed",
  },

  QUEUES: {
    INVENTORY_WORK: "q_inventory_work",
    INVENTORY_COMPENSATE: "q_inventory_compensate",
    // New Queue: For the Inventory service to hear about success and finalize stock
    INVENTORY_FINALIZE: "q_inventory_finalize",

    PAYMENT_WORK: "q_payment_work",
    SHIPPING_WORK: "q_shipping_work",

    // Split Queues for Order Service to avoid round-robin collision
    ORDER_SUCCESS: "q_order_success",
    ORDER_FAILURE: "q_order_failure",
  },
};
