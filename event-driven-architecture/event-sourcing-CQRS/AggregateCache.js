class AggregateCache {
  constructor() {
    // Map<StreamID, AggregateInstance>
    this.cache = new Map();
  }

  get(streamId) {
    return this.cache.get(streamId);
  }

  set(streamId, aggregate) {
    this.cache.set(streamId, aggregate);

    // MEMORY OPTIMIZATION:
    // Automatically remove this aggregate from RAM after 5 minutes.
    // This prevents the server from running out of memory if millions
    // of different users access the system over time.
    setTimeout(() => {
      console.log(`[Cache] Evicting ${streamId} from memory to free space.`);
      this.cache.delete(streamId);
    }, 5 * 60 * 1000);
  }
}

module.exports = new AggregateCache();
