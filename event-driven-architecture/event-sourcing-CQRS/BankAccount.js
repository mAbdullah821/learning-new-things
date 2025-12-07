const eventStore = require("./EventStore");
const snapshotManager = require("./SnapshotManager");
const eventPublisher = require("./EventPublisher");
const config = require("./config");

class BankAccount {
  constructor(streamId) {
    this.streamId = streamId;
    this.state = {
      balance: 0,
      status: "Closed",
    };
    // Tracks the version of this specific instance in memory
    this.lastSeq = 0;
  }

  // --- CONCEPT: HYDRATION STRATEGY ---
  // The Aggregate is responsible for choosing the most efficient way to load.
  // Logic: Try Snapshot -> If Hit, load "Delta" (remaining) events.
  async load() {
    // 1. Check Snapshot Manager (Optimization)
    const snapshot = snapshotManager.getSnapshot(this.streamId);

    let eventsToApply = [];

    if (snapshot) {
      console.log(
        `[Aggregate] ⚡ Loaded Snapshot (Seq: ${snapshot.lastSeqNum})`
      );
      // Restore State from Snapshot
      this.state = snapshot.state;

      // 2. Fetch "Delta" Events
      // We need everything that happened AFTER the snapshot.
      eventsToApply = eventStore.getStream(this.streamId, {
        startingFromSeqNum: snapshot.lastSeqNum + 1,
        direction: "forwards",
      });

      // --- CORRECTED LOGIC: Snapshot Scenario ---
      // If we have delta events, the latest version is the last event's seqNum.
      // If we have NO new events, the latest version is the Snapshot's seqNum.
      this.lastSeq =
        eventsToApply.length > 0
          ? eventsToApply.at(-1).seqNum
          : snapshot.lastSeqNum;
    } else {
      // Fallback: Load entire history from beginning
      console.log(`[Aggregate] No Snapshot. Loading full history.`);
      eventsToApply = eventStore.getStream(this.streamId, {
        direction: "forwards",
      });

      // --- CORRECTED LOGIC: Full Replay Scenario ---
      // If we have events, the latest version is the last event's seqNum.
      // If we have NO events (brand new account), version is 0.
      this.lastSeq = eventsToApply.length > 0 ? eventsToApply.at(-1).seqNum : 0;
    }

    // 3. Apply the Events (Deltas since snapshot or Full History)
    for (const event of eventsToApply) {
      this.applyEventToState(event);
    }
  }

  // --- INTERNAL STATE TRANSITION ---
  // Pure Logic. No side effects. No database calls.
  // This just calculates "What is my balance based on this fact?"
  applyEventToState(event) {
    switch (event.type) {
      case "AccountOpened":
        this.state.status = "Active";
        this.state.balance = event.data.initialAmount;
        break;
      case "MoneyDeposited":
        this.state.balance += event.data.amount;
        break;
      case "MoneyWithdrawn":
        this.state.balance -= event.data.amount;
        break;
    }
  }

  updateSnapshot() {
    // Optimization: Don't snapshot every event.
    // Only do it when we cross the threshold (e.g., every 5 events).
    if (this.lastSeq > 0 && this.lastSeq % config.SNAPSHOT_THRESHOLD === 0) {
      snapshotManager.saveSnapshot(this.streamId, this.state, this.lastSeq);
    }
  }

  // --- COMMANDS (The Public API) ---
  // Pattern: Validate -> Save -> Apply -> Publish -> Snapshot

  async openAccount(amount) {
    // 1. VALIDATE (Business Logic Guard)
    if (this.state.status === "Active") throw new Error("Already active");

    // 2. SAVE (Persist Intent)
    // We pass 'this.lastSeq' to lock the version and prevent race conditions.
    const event = eventStore.save(
      this.streamId,
      "AccountOpened",
      { initialAmount: amount },
      this.lastSeq
    );

    // 3. APPLY (Update Local State immediately so we are ready for next command)
    this.applyEventToState(event);
    this.lastSeq = event.seqNum; // Move pointer forward

    // 4. PUBLISH (Notify Read Models / External Systems)
    await eventPublisher.publish(event);

    // 5. SNAPSHOT (Optimization maintenance)
    this.updateSnapshot();
  }

  async deposit(amount) {
    if (this.state.status !== "Active") throw new Error("Account closed");

    const event = eventStore.save(
      this.streamId,
      "MoneyDeposited",
      { amount },
      this.lastSeq
    );

    this.applyEventToState(event);
    this.lastSeq = event.seqNum;

    await eventPublisher.publish(event);
    this.updateSnapshot();
  }

  async withdraw(amount) {
    if (this.state.status !== "Active") throw new Error("Account closed");

    // Critical Logic: Validation happens against the Computed State
    if (this.state.balance < amount) throw new Error("Insufficient funds");

    const event = eventStore.save(
      this.streamId,
      "MoneyWithdrawn",
      { amount },
      this.lastSeq
    );

    this.applyEventToState(event);
    this.lastSeq = event.seqNum;

    await eventPublisher.publish(event);
    this.updateSnapshot();
  }
}

module.exports = BankAccount;
