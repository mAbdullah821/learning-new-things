const eventPublisher = require("./EventPublisher");
const startProjector = require("./Projector");
const BankAccount = require("./BankAccount");
const readModel = require("./ReadModelDB");
const aggregateCache = require("./AggregateCache");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Helper: Retrieves Aggregate from RAM if available, otherwise loads from EventStore
async function getCachedAccount(userId) {
  // 1. Try Memory
  let account = aggregateCache.get(userId);
  if (account) {
    console.log(`⚡ Cache Hit: User ${userId} found in RAM.`);
    return account;
  }

  // 2. Cache Miss - Load from Disk (EventStore)
  console.log(`⚠️ Cache Miss: Loading ${userId} from EventStore...`);
  account = new BankAccount(userId);
  await account.load();

  // 3. Store in Memory for next time
  aggregateCache.set(userId, account);
  return account;
}

async function main() {
  await eventPublisher.init();
  await startProjector();

  const userId = "user_Final_1";
  console.log("\n--- SIMULATION START ---\n");

  async function runCmd(cmd, amount) {
    try {
      // Use the cached aggregate for speed
      const account = await getCachedAccount(userId);

      if (cmd === "open") await account.openAccount(amount);
      if (cmd === "deposit") await account.deposit(amount);
      if (cmd === "withdraw") await account.withdraw(amount);
    } catch (e) {
      console.error(`❌ Error: ${e.message}`);
    }
  }

  // 1. Cache Miss (Loads from EventStore)
  await runCmd("open", 100);

  // 2. Cache Hits (Uses RAM)
  await runCmd("deposit", 50);
  await runCmd("withdraw", 20);
  await runCmd("deposit", 10);
  await runCmd("deposit", 10); // Seq 5 (Snapshot Triggered)

  await sleep(200);

  // --- CONCURRENCY TEST ---
  console.log("\n--- TESTING CONCURRENCY ---");
  // We create a "Stale" account manually to simulate a race condition
  const staleAccount = new BankAccount(userId);
  await staleAccount.load();
  staleAccount.lastSeq = 2; // Intentionally wrong version (Real is 5)

  try {
    console.log("Attempting concurrent write with old version...");
    await staleAccount.withdraw(5);
  } catch (e) {
    console.log(`✅ Concurrency Guard Caught it: ${e.message}`);
  }

  // --- IDEMPOTENCY TEST ---
  console.log("\n--- TESTING IDEMPOTENCY (Read Model) ---");
  const balanceBefore = readModel.getAccount(userId).balance;
  console.log(`Balance Before Attack: ${balanceBefore}`);

  // Manual Injection of a Duplicate Event
  const duplicateEvent = {
    streamId: userId,
    type: "MoneyDeposited",
    data: { amount: 999999 }, // Obvious fake amount
    seqNum: 2, // Old Sequence Number
    timestamp: Date.now(),
  };

  // Directly invoke the DB updater
  readModel.applyUpdate(
    duplicateEvent.streamId,
    duplicateEvent.type,
    duplicateEvent.data,
    duplicateEvent.seqNum
  );

  const balanceAfter = readModel.getAccount(userId).balance;
  console.log(`Balance After Attack: ${balanceAfter}`);

  if (balanceBefore === balanceAfter) {
    console.log("✅ SUCCESS: Read Model ignored the duplicate event.");
  } else {
    console.log("❌ FAIL: Data corruption occurred.");
  }

  setTimeout(() => process.exit(0), 1000);
}

main();
