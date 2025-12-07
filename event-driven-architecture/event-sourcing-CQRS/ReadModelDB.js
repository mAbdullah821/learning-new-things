class ReadModelDB {
  constructor() {
    // This simulates a SQL Table or NoSQL Collection optimized for QUERYING.
    // Structure: { id, balance, status, lastProcessedSeq }
    this.db = new Map();
  }

  getAccount(id) {
    return this.db.get(id) || null;
  }

  applyUpdate(id, eventType, data, seqNum) {
    // Load existing record or initialize default state
    let record = this.db.get(id) || {
      id,
      balance: 0,
      status: "Closed",
      lastProcessedSeq: 0, // <--- Critical for Idempotency
    };

    // --- CONCEPT: IDEMPOTENCY GUARD ---
    // RabbitMQ guarantees "At-Least-Once" delivery, meaning duplicates CAN happen.
    // If we process 'MoneyDeposited' ($10) twice, the user gets free money.
    // By checking if (IncomingSeq <= LastSeenSeq), we essentially say:
    // "If I have already seen this event (or a newer one), ignore this."
    if (seqNum <= record.lastProcessedSeq) {
      console.log(
        `[ReadDB] ⚠️ Idempotency Check: Event ${seqNum} already processed. Skipping.`
      );
      return;
    }

    // --- CONCEPT: PROJECTION LOGIC ---
    // This transforms the "Fact" (Event) into "State" (Table Row).
    // This logic can be different from the Aggregate logic.
    // For example, the Write model cares about rules, but the Read model
    // might just care about aggregating totals for a dashboard.
    switch (eventType) {
      case "AccountOpened":
        record.status = "Active";
        record.balance = data.initialAmount;
        break;
      case "MoneyDeposited":
        record.balance += data.amount;
        break;
      case "MoneyWithdrawn":
        record.balance -= data.amount;
        break;
    }

    // Update the pointer so we know we are up to date
    record.lastProcessedSeq = seqNum;

    this.db.set(id, record);
    console.log(
      `[ReadDB] ✅ Updated User ${id} -> Bal: ${record.balance} (Seq: ${seqNum})`
    );
  }
}

module.exports = new ReadModelDB();
