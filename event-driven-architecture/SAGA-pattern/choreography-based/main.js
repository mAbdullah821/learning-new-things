const broker = require("./infrastructure/Broker");
const db = require("./infrastructure/MockDatabase");

// Import Services
const inventoryService = require("./services/InventoryService");
const paymentService = require("./services/PaymentService");
const shippingService = require("./services/ShippingService");
const orderService = require("./services/OrderService");

async function main() {
  console.log("--- BOOTSTRAPPING SAGA CHOREOGRAPHY ---");

  // 1. Initialize Infra
  await broker.init();

  // 2. Initialize DB Data
  db.initItem("item-101", 10);

  // 3. Start All Microservices
  await inventoryService.start();
  await paymentService.start();
  await shippingService.start();
  await orderService.start();

  console.log("\n--- STARTING SIMULATION ---");

  // 4. Trigger Workflows via Order Service
  // 'ord_1' might succeed or fail at payment
  orderService.createOrder("ord_1", "item-101", 50);

  // 'ord_2' launched later to avoid log clutter
  setTimeout(() => {
    orderService.createOrder("ord_2", "item-101", 50);
  }, 3000);
}

main().catch(console.error);
