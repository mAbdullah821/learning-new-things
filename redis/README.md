# Redis Pub/Sub Example

A simple demonstration of Redis Pub/Sub (Publish/Subscribe) messaging pattern using Node.js.

## Overview

This project demonstrates how to use Redis for real-time messaging between publishers and subscribers. It includes examples of:

- Publishing messages to specific channels
- Subscribing to channels
- Pattern-based subscriptions using `pSubscribe`
- Multiple channel publishing

## Prerequisites

- Node.js installed
- Redis server running (default: `localhost:6379`)

## Installation

```bash
npm install
```

## Project Structure

- `publisher.js` - Publishes messages to Redis channels
- `subscriber.js` - Subscribes to Redis channels and receives messages

## Usage

### 1. Start the Subscriber

In one terminal, run the subscriber to listen for messages:

```bash
node subscriber.js
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

## Architecture

```
Publisher → Redis Server (Pub/Sub) → Subscribers
              │
              ├─ Channel: system_notifications → Subscriber 1
              └─ Pattern: orders:* → Subscriber 1 (pattern match)
```

**Flow:**

1. Publisher connects to Redis and publishes messages to specific channels
2. Redis server receives messages and routes them to subscribed clients
3. Subscribers receive messages from channels they're subscribed to
4. Pattern-based subscribers receive messages matching their subscription pattern

## Key Concepts

- **Pub/Sub Pattern**: Decouples publishers from subscribers, allowing multiple subscribers to receive the same message
- **Channels**: Named message channels that publishers send to and subscribers listen on
- **Pattern Matching**: Using `pSubscribe` to subscribe to multiple channels matching a pattern (e.g., `orders:*`)

## Dependencies

- `redis` - Official Redis client for Node.js
