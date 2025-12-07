# Resequencer Pattern

This project demonstrates the **Resequencer Pattern** for handling out-of-order messages in event-driven architectures.

## Key Concepts Demonstrated

### 1. **Resequencer Pattern**

- **Problem**: Messages arrive out of order due to network delays, parallel processing, or retries
- **Solution**: Buffer out-of-order messages and process them in sequence
- **Use Case**: Critical when message order matters for business logic

### 2. **In-Memory State Management**

- **State Store**: Maintains expected sequence number per entity
- **Message Buffering**: Stores future messages in a buffer until their turn
- **Per-Entity Tracking**: Each entity (e.g., order_555) has its own sequence state

### 3. **Sequence Number Tracking**

- **Expected Sequence**: Tracks what sequence number should be processed next
- **Gap Detection**: Identifies when messages arrive out of order
- **Duplicate Detection**: Handles duplicate or old messages gracefully

### 4. **Buffer Management**

- **Future Messages**: Messages with sequence > expected are buffered
- **Drain Loop**: When expected message arrives, check buffer for next sequential messages
- **Memory Efficiency**: Buffer is cleaned up as messages are processed

### 5. **Message Processing Logic**

Three scenarios handled:

1. **Exact Match**: Message sequence equals expected → process immediately
2. **Too Early**: Message sequence > expected → buffer for later
3. **Duplicate/Old**: Message sequence < expected → already processed, ignore

## Architecture

```
Producer → Queue → Resequencer → Processed Events (in order)
              ↓
         Out-of-order messages buffered
              ↓
         Drain loop processes buffered messages sequentially
```

## Flow

1. Consumer receives message with sequence number
2. Check if sequence matches expected:
   - **Match**: Process immediately, increment expected sequence
   - **Too Early**: Store in buffer, acknowledge message
   - **Too Late**: Ignore (duplicate/old message)
3. After processing, check buffer for next expected sequence
4. Drain buffer: Process all consecutive messages found in buffer

## Example Scenario

**Sent Order**: Seq 0, 2, 1, 3  
**Processing Order**:

- Seq 0 arrives → Process (expected: 0) → Expected becomes 1
- Seq 2 arrives → Buffer (expected: 1) → Store in buffer[2]
- Seq 1 arrives → Process (expected: 1) → Expected becomes 2
  - Drain loop finds buffer[2] → Process Seq 2 → Expected becomes 3
- Seq 3 arrives → Process (expected: 3) → Expected becomes 4

**Result**: All messages processed in correct order (0, 1, 2, 3)

## Files

- `producer.js` - Sends events with scrambled sequence numbers
- `consumer.js` - Resequencer that buffers and processes messages in order

## Running the Example

1. Start RabbitMQ server
2. Start consumer: `node consumer.js`
3. Send events: `node producer.js`

Observe how messages are buffered and processed in the correct sequence order, regardless of arrival order.

## When to Use

- **Order-Dependent Operations**: When message order affects business logic
- **State Machines**: When each message depends on previous state
- **Audit Trails**: When maintaining chronological order is critical
- **Distributed Systems**: When messages may arrive out of order due to network delays
