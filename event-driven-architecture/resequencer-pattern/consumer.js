const amqp = require("amqplib");

// 1. STATE STORE
// In a real app, this might be Redis. Here, we use RAM.
// Structure:
// {
//    "order_555": { expectedSeq: 0, buffer: { 2: msgObject, 3: msgObject } }
// }
const stateStore = new Map();

async function startResequencer() {
  const conn = await amqp.connect("amqp://localhost");
  const channel = await conn.createChannel();
  const queue = "ordered_events";

  await channel.assertQueue(queue, { durable: false });

  console.log("--- Resequencer Waiting ---");

  channel.consume(queue, (msg) => {
    if (!msg) return;

    const event = JSON.parse(msg.content.toString());
    const { id, seqNum } = event;

    // A. Initialize State for new Entity if needed
    if (!stateStore.has(id)) {
      stateStore.set(id, {
        expectedSeq: 0, // We assume all streams start at 0
        buffer: {}, // Storage for out-of-order items
      });
    }

    const state = stateStore.get(id);

    console.log(`[Received] Seq ${seqNum}. Expecting: ${state.expectedSeq}`);

    // B. CORE LOGIC
    if (seqNum === state.expectedSeq) {
      // Case 1: It is exactly what we wanted!
      processEvent(event);
      state.expectedSeq++;

      // C. THE DRAIN LOOP (The "While" Loop)
      // Check if the NEXT number is already sitting in the buffer
      while (state.buffer[state.expectedSeq]) {
        console.log(
          `   -> [Buffer Hit] Found Seq ${state.expectedSeq} in buffer!`
        );

        // Process the buffered message
        processEvent(state.buffer[state.expectedSeq]);

        // Clean up memory
        delete state.buffer[state.expectedSeq];

        // Move the pointer forward
        state.expectedSeq++;
      }
    } else if (seqNum > state.expectedSeq) {
      // Case 2: It's from the future. SAVE IT.
      console.log(
        `   -> [Buffering] Seq ${seqNum} is too early. Storing in buffer.`
      );
      state.buffer[seqNum] = event;
    } else {
      // Case 3: Duplicate or old message (seqNum < expectedSeq)
      console.log(
        `   -> [Duplicate] Seq ${seqNum} already processed. Ignoring.`
      );
    }

    // Always Ack in this pattern (assuming we stored it in RAM/DB safely)
    channel.ack(msg);
  });
}

// Dummy processing function
function processEvent(event) {
  console.log(`✅ PROCESSED: ${event.data} (Seq: ${event.seqNum})`);
}

startResequencer();
