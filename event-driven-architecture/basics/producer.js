// ============================================================================
// PRODUCER.JS - The Message Sender
// ============================================================================
// WHAT IS RABBITMQ?
// RabbitMQ is a message broker. It accepts messages from producers and delivers
// them to consumers. Think of it as a "digital post office":
//   1. Producers (like this file) put "mail" (messages) into the system.
//   2. Exchanges (the sorting centers) decide where the mail goes.
//   3. Queues (the mailboxes) hold the mail until it's picked up.
//   4. Consumers (audit_log.js, alert_service.js) pick up and read the mail.
//
// HOW TO RUN THIS TUTORIAL:
// 1. Start RabbitMQ (ensure it's running locally).
// 2. Open 3 separate terminals.
// 3. Terminal 1: Run `node audit_log.js` (Starts the "log everything" consumer)
// 4. Terminal 2: Run `node alert_service.js` (Starts the "errors only" consumer)
// 5. Terminal 3: Run `node producer.js` (Run this file to send messages)
// ============================================================================

const amqp = require("amqplib");

async function sendEvents() {
  // ========================================================================
  // STEP 1: CONNECTION (The Highway to RabbitMQ Server)
  // ========================================================================
  // This establishes a TCP connection to the RabbitMQ server running on
  // your local machine. The connection string "amqp://localhost" means:
  // - Protocol: amqp (Advanced Message Queuing Protocol)
  // - Host: localhost (your local machine)
  // - Port: 5672 (default AMQP port, not shown but implied)
  //
  // This is like opening a phone line to RabbitMQ. You need this connection
  // before you can do anything else.
  const connection = await amqp.connect("amqp://localhost");

  // ========================================================================
  // STEP 2: CHANNEL (The Lane on the Highway)
  // ========================================================================
  // A channel is a lightweight "virtual connection" on top of the TCP
  // connection. Why use channels? Because creating a TCP connection is
  // expensive, but channels are cheap. You can have many channels on one
  // connection, and each channel can be used independently.
  //
  // Think of it like: Connection = Highway, Channel = Individual Lane
  // All your actual operations (publish, consume, etc.) happen on channels.
  const channel = await connection.createChannel();

  // ========================================================================
  // STEP 3: EXCHANGE SETUP
  // ========================================================================
  // An exchange is like a "post office" or "mail sorting center". It receives
  // messages from producers and routes them to the correct queues based on
  // routing keys and bindings.
  const exchangeName = "system_events";

  // ========================================================================
  // STEP 4: assertExchange() - "Make Sure This Exchange Exists"
  // ========================================================================
  // The Command: "Make sure this exchange exists. If it exists, check if the
  // settings match. If it doesn't exist, create it with these settings."
  //
  // Parameters:
  //   - exchangeName: "system_events" - The name of our exchange
  //   - type: "topic" - The type of exchange (see explanation below)
  //   - options: { durable: false } - Additional settings (see below)
  //
  // --- TYPE: "topic" ---
  // There are several exchange types in RabbitMQ:
  //   - "direct": Needs EXACT match (routingKey "error" == binding "error")
  //   - "topic": Allows PATTERN matching (routingKey "payment.error" matches
  //              binding "*.error" or "payment.#")
  //   - "fanout": Broadcasts to ALL bound queues (ignores routing keys)
  //   - "headers": Routes based on message headers (not routing keys)
  //
  // We use "topic" because it's ideally suited for logging and categorized
  // events. It allows us to use patterns like:
  //   - "#" (hash) = match zero or more words
  //   - "*" (star) = match exactly one word
  //   Example: "*.error.*" matches "payment.error.timeout" but not
  //            "payment.error" (needs 3 words, not 2)
  //
  // --- durable: false ---
  // This is a CRITICAL setting that determines what happens when RabbitMQ
  // restarts:
  //   - durable: true  → RabbitMQ REMEMBERS this exchange exists after restart.
  //                      The exchange survives server crashes/restarts.
  //   - durable: false → RabbitMQ FORGETS this exchange after restart.
  //                      The exchange is deleted when RabbitMQ restarts.
  //
  // Why use false?
  //   - For development or non-critical logging, we often prefer a clean
  //     slate on restart.
  //   - If you use true and later try to change the type to "direct",
  //     RabbitMQ will throw an error saying "Parameter Mismatch" because
  //     it remembers the old type.
  //   - False makes it easier to change code while learning without
  //     parameter conflicts.
  //
  // IMPORTANT: If you use durable: true, you should also use durable: true
  //            on queues that bind to this exchange for consistency.
  //            Also, durable queues typically use static names (not empty strings)
  //            and exclusive: false, so they can be reconnected to after restarts.
  await channel.assertExchange(exchangeName, "topic", {
    durable: false,
  });

  // ========================================================================
  // STEP 5: SIMULATING DATA - Our Test Events
  // ========================================================================
  // We're creating sample events to send. Notice the routing key format:
  // "service.severity.type"
  //   - service: Which part of the system (payment, user, etc.)
  //   - severity: How important (info, error, warning, etc.)
  //   - type: Specific event type (login, timeout, etc.)
  //
  // This hierarchical structure works perfectly with topic exchanges because
  // we can use patterns to match categories (e.g., all errors: "*.error.*")
  const events = [
    { key: "payment.info.started", msg: "Transaction 101 started" },
    {
      key: "payment.error.insufficient_funds",
      msg: "Transaction 101 failed: No money",
    },
    { key: "user.info.login", msg: "User John logged in" },
    { key: "user.error.db_timeout", msg: "Database connection died" },
  ];

  // ========================================================================
  // STEP 6: PUBLISH LOOP - Sending Messages
  // ========================================================================
  // We iterate through each event and publish it to the exchange.
  for (const event of events) {
    // ====================================================================
    // channel.publish() - The Actual Message Sending
    // ====================================================================
    // This is where we send the message to RabbitMQ.
    //
    // Parameters:
    //   1. exchangeName: "system_events"
    //      - Where to send the message (the exchange we created)
    //   2. event.key: The routing key (e.g., "payment.error.insufficient_funds")
    //      - This is the "address label" on the message
    //      - The exchange uses this to decide which queues should receive
    //        the message based on their binding patterns
    //      - This is just a string - it's not a special object, just text
    //   3. Buffer.from(event.msg): The message content
    //      - WHY Buffer? RabbitMQ is protocol-agnostic. It doesn't know what
    //        "JSON" or "String" is. It only stores BINARY DATA (0s and 1s).
    //      - We MUST convert our text message into a Buffer before sending.
    //      - Buffer.from() converts a JavaScript string into binary format
    //        that RabbitMQ can store and transmit.
    //      - TIP: To send a JSON object, use: Buffer.from(JSON.stringify(myObj))
    //      - When consumers receive it, they convert it back with
    //        msg.content.toString() (or JSON.parse(msg.content.toString()))
    //
    // What happens inside RabbitMQ:
    //   1. Message arrives at the "system_events" exchange
    //   2. Exchange looks at the routing key: "payment.error.insufficient_funds"
    //   3. Exchange checks ALL queues bound to it and their binding patterns
    //   4. For each matching pattern, it copies the message to that queue
    //   5. Consumers listening to those queues receive the message
    channel.publish(exchangeName, event.key, Buffer.from(event.msg));
    console.log(`[x] Sent '${event.key}': '${event.msg}'`);
  }

  // ========================================================================
  // STEP 7: CLEANUP - Graceful Shutdown
  // ========================================================================
  // We need to give RabbitMQ time to actually send the messages over the
  // network before we close the connection. Without this delay, the messages
  // might still be in the TCP buffer and get lost when we immediately exit.
  //
  // The setTimeout gives 500ms for the network to flush the messages.
  setTimeout(() => {
    connection.close();
    process.exit(0);
  }, 500);
}

sendEvents();
