# RabbitMQ Basics - Topic Exchange Pattern

This project demonstrates fundamental RabbitMQ concepts and the **Topic Exchange** pattern for event-driven message routing.

## Key Concepts Demonstrated

### 1. **Topic Exchange with Pattern Matching**

- **Exchange Type**: Topic exchange allows flexible routing using wildcard patterns
- **Routing Keys**: Hierarchical structure (`service.severity.type`) enables category-based filtering
- **Pattern Matching**:
  - `#` (hash) - matches zero or more words
  - `*` (star) - matches exactly one word
- **Multiple Consumers**: Same message can be delivered to multiple queues based on different binding patterns

### 2. **Message Acknowledgment Strategies**

- **Auto Acknowledgment (`noAck: true`)**: Fire-and-forget delivery for non-critical operations (logging)
- **Manual Acknowledgment (`noAck: false`)**: Guaranteed delivery with explicit confirmation for critical operations (alerts)
- **Delivery Guarantees**: Understanding when messages are lost vs. requeued on failure

### 3. **Flow Control with Prefetch**

- **Prefetch Limit**: Controls how many unacknowledged messages RabbitMQ sends to a consumer
- **Sequential Processing**: `prefetch(1)` ensures messages are processed one at a time
- **Fair Distribution**: Prevents one fast consumer from monopolizing all messages
- **Important**: Prefetch only works with manual acknowledgment (`noAck: false`)

### 4. **Queue Management Patterns**

- **Temporary Queues**: Empty name + `exclusive: true` for auto-cleanup
- **Persistent Queues**: Static names + `exclusive: false` for message durability
- **Queue Lifecycle**: Understanding queue behavior on connection loss and restarts

### 5. **Exchange and Queue Durability**

- **Durable Exchanges**: Survive RabbitMQ restarts
- **Durable Queues**: Preserve messages across server restarts
- **Trade-offs**: Performance vs. reliability considerations

## Architecture

```
Producer → Topic Exchange → Multiple Queues (via bindings)
                              ├─ Audit Log Queue (# pattern - receives all)
                              └─ Alert Queue (*.error.* pattern - receives only errors)
```

## Files

- `producer.js` - Publishes events with routing keys to topic exchange
- `audit_log.js` - Consumer that receives ALL messages (pattern: `#`)
- `alert_service.js` - Consumer that receives ONLY error messages (pattern: `*.error.*`)

## Running the Example

1. Start RabbitMQ server
2. Terminal 1: `node audit_log.js`
3. Terminal 2: `node alert_service.js`
4. Terminal 3: `node producer.js`

Observe how the same message can be delivered to multiple consumers based on their binding patterns.
