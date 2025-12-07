class SnapshotManager {
  constructor() {
    // In-memory storage for snapshots.
    // In production, this would be a fast KV store like Redis or DynamoDB.
    this.snapshots = new Map();
  }

  getSnapshot(streamId) {
    return this.snapshots.get(streamId) || null;
  }

  saveSnapshot(streamId, state, lastSeqNum) {
    // --- CONCEPT: IMMUTABILITY ---
    // We must perform a Deep Copy of the state before saving.
    // Why? In JavaScript, objects are passed by reference.
    // If we just saved 'state', and the Aggregate later modifies 'state.balance',
    // it would corrupt the snapshot stored here historically.
    // structuredClone is a simple way to break the reference link.
    const stateCopy = structuredClone(state);

    this.snapshots.set(streamId, {
      state: stateCopy,
      lastSeqNum: lastSeqNum,
      timestamp: Date.now(),
    });

    console.log(
      `[SnapshotManager] 📸 Saved snapshot for ${streamId} at Seq ${lastSeqNum}`
    );
  }
}

// Exporting 'new' ensures this is a SINGLETON.
// We only want one manager handling snapshots for the whole app.
module.exports = new SnapshotManager();
