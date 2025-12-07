# Event Sourcing & CQRS Pattern

This project demonstrates a complete **Event Sourcing** and **CQRS (Command Query Responsibility Segregation)** implementation with advanced optimizations and concurrency controls.

## Key Concepts Demonstrated

### 1. **Event Sourcing**

- **Event Store**: Immutable append-only log of all domain events
- **Event Replay**: Reconstructing current state by replaying events from history
- **Event Streams**: Each aggregate has its own event stream identified by stream ID
- **Version Tracking**: Sequence numbers ensure event ordering and versioning

### 2. **CQRS (Command Query Responsibility Segregation)**

- **Write Model (Command Side)**: Event Store + Aggregates for handling commands
- **Read Model (Query Side)**: Optimized read database updated via event projection
- **Separation of Concerns**: Write and read models optimized independently
- **Eventual Consistency**: Read models updated asynchronously via event stream

### 3. **Aggregate Pattern**

- **Aggregate Root**: BankAccount as the consistency boundary
- **State Hydration**: Loading aggregate state from event history
- **Command Validation**: Business rules enforced at aggregate level
- **Event Generation**: Commands produce events that are persisted

### 4. **Snapshot Optimization**

- **Performance Problem**: Replaying thousands of events is slow
- **Solution**: Periodically save aggregate state snapshots
- **Delta Replay**: Load snapshot + replay only events after snapshot
- **Threshold-Based**: Snapshots created every N events (configurable)

### 5. **Optimistic Concurrency Control**

- **Version Checking**: Expected version number prevents concurrent modifications
- **Conflict Detection**: Throws error if aggregate version doesn't match event store
- **Race Condition Prevention**: Prevents lost updates in concurrent scenarios
- **Optimistic Locking**: Assumes conflicts are rare, fails fast when detected

### 6. **Idempotency in Read Models**

- **Problem**: At-least-once delivery can cause duplicate events
- **Solution**: Track processed sequence numbers in read model
- **Duplicate Detection**: Skip events that have already been processed
- **Data Integrity**: Ensures read model consistency despite message redelivery

### 7. **Event Projection**

- **Projector Pattern**: Asynchronous consumer that updates read models
- **Strict Ordering**: `prefetch(1)` ensures events processed sequentially
- **At-Least-Once Delivery**: Manual acknowledgment ensures no data loss
- **Read Model Updates**: Transforms events into optimized query structures

### 8. **Aggregate Caching**

- **In-Memory Cache**: Frequently accessed aggregates cached in RAM
- **Cache Hit/Miss**: Reduces event store queries for hot aggregates
- **Performance Optimization**: Critical for high-throughput systems

### 9. **Flexible Event Store Queries**

- **Bidirectional Reading**: Forward and backward event stream traversal
- **Range Queries**: Fetch events from specific sequence numbers
- **Efficient Lookups**: O(1) access using Map data structures

## Architecture

```
Command Side (Write):
  Controller → Aggregate → Event Store → Event Publisher → RabbitMQ

Query Side (Read):
  RabbitMQ → Projector → Read Model DB (optimized for queries)

Optimization Layer:
  Snapshot Manager (periodic state snapshots)
  Aggregate Cache (in-memory hot aggregates)
```

## Flow

1. **Command Processing**:

   - Load aggregate from cache or event store
   - Validate business rules
   - Generate event
   - Save to event store with version check
   - Publish event to message queue
   - Update snapshot if threshold reached

2. **Read Model Update**:
   - Projector consumes events from queue
   - Check idempotency (skip duplicates)
   - Update read model database
   - Acknowledge message

## Files

- `Controller.js` - Orchestrates commands and demonstrates concurrency/idempotency tests
- `BankAccount.js` - Aggregate root with business logic and event handling
- `EventStore.js` - Append-only event storage with version control
- `EventPublisher.js` - Publishes events to RabbitMQ for projection
- `Projector.js` - Consumes events and updates read models
- `ReadModelDB.js` - Optimized read database with idempotency checks
- `SnapshotManager.js` - Manages aggregate state snapshots
- `AggregateCache.js` - In-memory cache for hot aggregates

## Running the Example

1. Start RabbitMQ server
2. Run: `node Controller.js`

The example demonstrates:

- Event sourcing with full history replay
- Snapshot optimization (faster loading)
- Concurrency conflict detection
- Idempotency protection in read models
