class EventStore {
  constructor() {
    // DATA STRUCTURE OPTIMIZATION:
    // Using a Map gives us O(1) access time.
    // If we used an Array, we would have to loop through every user
    // in the system to find one user's events (O(N)).
    this.streams = new Map();
  }

  // --- CONCEPT: FLEXIBLE STREAM QUERYING ---
  // Instead of always returning everything, we allow the caller to ask for
  // specific "Slices" of time.
  // - 'forwards': Standard replay (Oldest -> Newest)
  // - 'backwards': Useful for finding the latest state or last N events (Newest -> Oldest)
  getStream(streamId, options = {}) {
    const {
      startingFromSeqNum, // undefined = start from beginning (or end if backwards)
      direction = "forwards",
      maxCount = undefined, // undefined = no limit
    } = options;

    const allEvents = this.streams.get(streamId) || [];
    let result = [];

    if (direction === "forwards") {
      // Filter: Get everything >= startingFromSeqNum
      // If startingFromSeqNum is undefined, we take everything.
      result =
        startingFromSeqNum !== undefined
          ? allEvents.filter((e) => e.seqNum >= startingFromSeqNum)
          : [...allEvents];
    } else {
      // --- CONCEPT: REVERSE READ ---
      // We want to look from Newest to Oldest.
      // We create a shallow copy ([...]) to reverse without mutating original storage.
      let reversed = [...allEvents].reverse();

      // If startingFromSeqNum is provided in backwards mode, we want events
      // BEFORE or EQUAL to that number (going back in time).
      result =
        startingFromSeqNum !== undefined
          ? reversed.filter((e) => e.seqNum <= startingFromSeqNum)
          : reversed;
    }

    // Apply Limit
    if (maxCount !== undefined) {
      result = result.slice(0, maxCount);
    }

    return result;
  }

  save(streamId, eventType, data, expectedSeq) {
    // 1. Ensure stream storage exists
    if (!this.streams.has(streamId)) {
      this.streams.set(streamId, []);
    }

    // --- CONCEPT: CALCULATING NEXT SEQUENCE ---
    // Instead of loading the whole history to count length, we request
    // ONLY the very last event using our new query capabilities.
    // This keeps the save operation fast (O(1) effectively) even if history is huge.
    const lastEvents = this.getStream(streamId, {
      direction: "backwards",
      maxCount: 1,
    });

    // If we found an event, that's the current head. If not, we are at 0.
    const currentVersion = lastEvents.length > 0 ? lastEvents[0].seqNum : 0;

    // 3. OPTIMISTIC CONCURRENCY CONTROL:
    // If the Aggregate thinks it is at Version 5, but the Store is at Version 6,
    // it means another process modified this account in the background.
    // We MUST fail to prevent data corruption (Double Spending).
    if (expectedSeq !== undefined && currentVersion !== expectedSeq) {
      throw new Error(
        `Concurrency Conflict for ${streamId}: Expected version ${expectedSeq}, but found ${currentVersion}.`
      );
    }

    const nextSeq = currentVersion + 1;

    const newEvent = {
      streamId,
      type: eventType,
      data,
      seqNum: nextSeq,
      timestamp: Date.now(),
    };

    // 4. Append to the master list
    // Note: We push to the Map's array, not the sliced array from getStream
    this.streams.get(streamId).push(newEvent);

    console.log(`[EventStore] Saved: ${eventType} #${nextSeq}`);

    return newEvent;
  }
}

module.exports = new EventStore();
