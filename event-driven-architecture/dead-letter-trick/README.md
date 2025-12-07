# Dead Letter Exchange (DLX) Pattern - Delayed Message Processing

This project demonstrates the **Dead Letter Exchange (DLX) trick** for implementing delayed message processing and message resequencing without external schedulers.

## Key Concepts Demonstrated

### 1. **Dead Letter Exchange (DLX) Pattern**

- **Concept**: Messages that expire or are rejected are automatically routed to a Dead Letter Exchange
- **Use Case**: Implementing delayed processing without external delay queues or schedulers
- **Configuration**: Using queue arguments (`x-dead-letter-exchange`, `x-dead-letter-routing-key`)

### 2. **Message TTL (Time To Live)**

- **Queue-Level TTL**: Messages automatically expire after a set duration
- **Delayed Processing**: Messages sit in a "penalty box" queue until TTL expires
- **Automatic Routing**: Expired messages are automatically sent to the DLX

### 3. **Message Resequencing Pattern**

- **Problem**: Messages arrive out of order due to network delays or processing times
- **Solution**: Out-of-order messages are sent to a delay queue and retried later
- **State Tracking**: Consumer maintains expected sequence number to detect gaps
- **Gap Detection**: Messages arriving too early are buffered via DLX delay mechanism

### 4. **Retry Mechanism with Headers**

- **Custom Headers**: Using `x-retry-count` to track retry attempts
- **Infinite Loop Prevention**: Maximum retry limit prevents endless retry cycles
- **State Preservation**: Retry count is preserved across delay queue cycles

### 5. **Two-Queue Architecture**

- **Main Queue**: Primary processing queue for in-order messages
- **Wait Queue**: Temporary holding queue with TTL for out-of-order messages
- **Automatic Re-routing**: Expired messages from wait queue return to main queue via DLX

## Architecture

```
Producer → Main Exchange → Main Queue → Consumer
                              ↓ (out-of-order detected)
                         Wait Exchange → Wait Queue (TTL: 5s)
                              ↓ (TTL expires)
                         DLX → Main Exchange → Main Queue (retry)
```

## Flow

1. Consumer receives message with sequence number
2. If sequence matches expected: process immediately
3. If sequence is too early: acknowledge and send to wait queue
4. Wait queue holds message for TTL duration (5 seconds)
5. After TTL expires, message is routed back to main queue via DLX
6. Consumer retries processing with updated retry count

## Files

- `setup.js` - Configures exchanges, queues, and DLX bindings
- `producer.js` - Sends events with scrambled sequence numbers
- `consumer.js` - Processes messages in order, handles out-of-order via DLX
- `config.js` - Configuration for queues, exchanges, and delays

## Running the Example

1. Run setup: `node setup.js`
2. Start consumer: `node consumer.js`
3. Send events: `node producer.js`

Observe how out-of-order messages are automatically delayed and retried until they can be processed in sequence.
