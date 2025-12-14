# Redis Pub/Sub Learning Project

A simple, beginner-friendly project demonstrating Redis Pub/Sub (Publish/Subscribe) messaging pattern with Node.js. This project is designed for learning purposes with clear examples showing how to implement real-time messaging between publishers and subscribers.

## Overview

This project demonstrates how to use Redis for real-time messaging between publishers and subscribers. You'll learn:

- **Pub/Sub Pattern**: Decoupled messaging where publishers don't know about subscribers
- **Channels**: Named message channels for organizing messages
- **Pattern-Based Subscriptions**: Using wildcards to subscribe to multiple channels
- **Redis as Message Broker**: Using Redis for lightweight messaging
- **Real-time Communication**: Instant message delivery to all subscribers

## Key Concepts

### What is Pub/Sub (Publish/Subscribe)?

**Pub/Sub** is a messaging pattern where:

- **Publishers** send messages without knowing who will receive them
- **Subscribers** listen for messages without knowing who sent them
- **Decoupling**: Publishers and subscribers are completely independent
- **Broadcasting**: One message can be delivered to multiple subscribers

**Real-world analogy**: Think of a radio station:

- The radio station (publisher) broadcasts music
- Listeners (subscribers) tune in to hear the music
- The station doesn't know who's listening
- Multiple listeners can hear the same broadcast simultaneously

### Why Use Pub/Sub?

**Benefits:**

- **Decoupling**: Publishers and subscribers don't need to know about each other
- **Scalability**: Easy to add more subscribers without changing publishers
- **Flexibility**: Subscribers can join/leave dynamically
- **Real-time**: Instant message delivery to all subscribers
- **Lightweight**: Simple pattern, easy to implement

**Use Cases:**

- Real-time notifications
- Event broadcasting
- System monitoring and alerts
- Live updates (chat, feeds, dashboards)
- Microservices communication

### Redis Pub/Sub vs Message Queues

**Pub/Sub (This Project):**

- Messages are **broadcast** to all subscribers
- If no subscribers are listening, message is **lost**
- **Fire-and-forget** pattern
- Good for: notifications, events, real-time updates

**Message Queues (RabbitMQ, etc.):**

- Messages are **stored** in queues
- Messages **persist** until consumed
- **Guaranteed delivery** pattern
- Good for: task processing, reliable messaging

## Project Structure

```
redis/
├── publisher.js    # Publishes messages to Redis channels
├── subscriber.js  # Subscribes to channels and receives messages
├── package.json   # Dependencies and scripts
└── README.md      # This file
```

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Redis server running (default: `localhost:6379`)

## Installation

1. Navigate to the project directory:

   ```bash
   cd redis
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Usage

### 1. Start the Subscriber

In one terminal, start the subscriber to listen for messages:

```bash
node subscriber.js
```

You should see:

```
Listening for updates on 'system_notifications'...
```

The subscriber will:

- Subscribe to the `system_notifications` channel
- Use pattern matching to subscribe to any channel starting with `orders:*`
- Display received messages in the console

### 2. Run the Publisher

In another terminal, run the publisher to send messages:

```bash
node publisher.js
```

The publisher will:

- Publish a system notification message
- Publish multiple order messages to different channels
- Display how many subscribers received each message

**Expected Output:**

**Publisher terminal:**

```
Message sent! received by 1 listeners.
```

**Subscriber terminal:**

```
🚨 ALERT RECEIVED: { message: 'Database server is overheating! (Error 505)', status: 'error' }
LOG: Received order from [orders:123]: {"orderId":123,"status":"pending"}
LOG: Received order from [orders:456]: {"orderId":456,"status":"completed"}
LOG: Received order from [orders:789]: {"orderId":789,"status":"cancelled"}
```

## Architecture

```
Publisher (publisher.js)     Redis Server (Pub/Sub)     Subscriber (subscriber.js)
     │                              │                            │
     │  Connect to Redis            │                            │  Connect to Redis
     │                              │                            │
     │   Subscribe to channels      │                            │
     │                              │                            │
     │   publish("system_...") ────>│                            │
     │                              │  Route to matching         │
     │                              │  subscribers               │
     │                              │                            │
     │                              │  <─────────────────────────│  Callback triggered
     │                              │                            │  Message received
     │                              │                            │
     │   publish("orders:123") ────>│                            │
     │                              │  Pattern match:            │
     │                              │  "orders:*"                │
     │                              │                            │
     │                              │  <─────────────────────────│  Pattern match
     │                              │                            │  Message received
```

**Flow:**

1. Subscriber connects to Redis and subscribes to channels/patterns
2. Publisher connects to Redis and publishes messages to channels
3. Redis routes messages to all matching subscribers
4. Subscribers receive messages via callback functions
5. Messages are delivered in real-time to all active subscribers

## Key Concepts Explained

### 1. Channels

**Channels** are named message destinations in Redis Pub/Sub:

```javascript
// Publisher sends to a specific channel
await publisher.publish("system_notifications", message);

// Subscriber listens to a specific channel
await subscriber.subscribe("system_notifications", (message) => {
  console.log("Received:", message);
});
```

**Key Points:**

- Channels are **strings** (any name you choose)
- Channels are **created automatically** when first used
- Messages sent to a channel are **broadcast** to all subscribers
- If no subscribers are listening, message is **lost** (not stored)

### 2. Pattern-Based Subscriptions

**Pattern subscriptions** allow subscribing to multiple channels using wildcards:

```javascript
// Subscribe to all channels matching pattern
await subscriber.pSubscribe("orders:*", (message, channel) => {
  console.log(`Received from ${channel}:`, message);
});
```

**Wildcard Patterns:**

- `*` (asterisk): Matches any characters in that position
  - `orders:*` matches: `orders:123`, `orders:456`, `orders:abc`, `orders:123:details`
  - Does NOT match: `system:orders:123` (needs exact match for the start term "orders:")
- `?` (question mark): Matches single character (not commonly used in Redis Pub/Sub)

**Example Patterns:**

- `orders:*` - All channels starting with "orders:"
- `system.*` - All channels matching "system." followed by anything
- `*.error` - All channels ending with ".error"

**Important:** Pattern subscriptions use `pSubscribe()` (with 'p'), not `subscribe()`

### 3. Decoupling Publishers and Subscribers

**The Power of Decoupling:**

```javascript
// Publisher doesn't know who's listening
await publisher.publish("system_notifications", message);
// Could be 0, 1, or 100 subscribers - publisher doesn't care!

// Subscriber doesn't know who's sending
await subscriber.subscribe("system_notifications", (message) => {
  // Could be from publisher A, B, or C - subscriber doesn't care!
});
```

**Benefits:**

- **Scalability**: Add more subscribers without changing publishers
- **Flexibility**: Subscribers can join/leave dynamically
- **Maintainability**: Changes to one side don't affect the other
- **Testing**: Easy to test publishers and subscribers independently

### 4. Message Format

**Messages are strings** in Redis Pub/Sub:

```javascript
// Publisher: Convert object to JSON string
const messagePayload = {
  message: "Database server is overheating!",
  status: "error",
};
await publisher.publish("channel", JSON.stringify(messagePayload));

// Subscriber: Parse JSON string back to object
await subscriber.subscribe("channel", (message) => {
  const data = JSON.parse(message); // Convert back to object
  console.log(data.message);
});
```

**Why JSON?**

- Redis Pub/Sub only handles strings
- JSON allows structured data exchange
- Easy to serialize/deserialize objects

### 5. Connection Management

**Publisher Connection:**

```javascript
const publisher = redis.createClient();
await publisher.connect();
// ... publish messages ...
await publisher.quit(); // Close connection
```

**Subscriber Connection:**

```javascript
const subscriber = redis.createClient();
await subscriber.connect();
// ... subscribe to channels ...
// Connection stays open to receive messages
// (Don't call quit() - subscriber needs to stay connected!)
```

**Important Notes:**

- Subscribers must **stay connected** to receive messages
- If subscriber disconnects, it **stops receiving** messages
- Publishers can **disconnect after publishing** (fire-and-forget)
- Each client needs its **own connection**

## Dependencies

- **redis**: Official Redis client for Node.js (v5.10.0+)

## Learning Path

1. **Start here**: Understand the Pub/Sub pattern concept
2. **Publisher**: Study `publisher.js` to see how messages are sent
3. **Subscriber**: Study `subscriber.js` to see how messages are received
4. **Experiment**:
   - Create multiple subscribers and see all receive messages
   - Try different channel names and patterns
   - Test what happens when no subscribers are listening
   - Add more publishers to the same channels

## Common Patterns

### Pattern 1: Simple Channel Subscription

```javascript
// Subscriber
await subscriber.subscribe("notifications", (message) => {
  console.log("Notification:", message);
});

// Publisher
await publisher.publish("notifications", "Hello!");
```

### Pattern 2: Pattern-Based Subscription

```javascript
// Subscriber: Listen to all user events
await subscriber.pSubscribe("user:*", (message, channel) => {
  console.log(`Event from ${channel}:`, message);
});

// Publisher: Send to specific user channels
await publisher.publish("user:123", "User logged in");
await publisher.publish("user:456", "User logged out");
```

### Pattern 3: Multiple Subscriptions

```javascript
// Subscriber can subscribe to multiple channels/patterns
await subscriber.subscribe("alerts", (msg) => {
  console.log("Alert:", msg);
});

await subscriber.pSubscribe("orders:*", (msg, channel) => {
  console.log(`Order from ${channel}:`, msg);
});
```

## When to Use Redis Pub/Sub

**Good for:**

- Real-time notifications (chat, alerts, updates)
- Event broadcasting (system events, user actions)
- Live dashboards and monitoring
- Decoupled microservices communication
- Simple pub/sub requirements (no persistence needed)

**Not ideal for:**

- **Guaranteed delivery** (messages are lost if no subscribers)
- **Message persistence** (messages are not stored)
- **Complex routing** (use RabbitMQ for advanced routing)
- **Task queues** (use Redis Lists or dedicated queue systems)
- **Ordered processing** (no ordering guarantees)

## Limitations

1. **No Message Persistence**: Messages are lost if no subscribers are listening
2. **No Delivery Guarantees**: If subscriber crashes, messages are lost
3. **No Acknowledgment**: Can't confirm message was processed
4. **No Message Ordering**: No guarantee of message order
5. **Memory Only**: Messages are not stored on disk

## Next Steps

- Learn about **Redis Streams** (persistent pub/sub alternative)
- Explore **Redis Lists** for message queues
- Study **RabbitMQ** for advanced messaging patterns
- Implement **error handling** and reconnection logic
- Add **message filtering** and validation
- Explore **Redis Cluster** for high availability
