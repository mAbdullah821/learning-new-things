/**
 * gRPC Client Implementation
 *
 * This client demonstrates how to:
 * 1. Load the same .proto file as the server (contract must match!)
 * 2. Create a client stub (proxy object that makes RPC calls)
 * 3. Call remote methods as if they were local functions
 *
 * Key Concepts:
 * - Client Stub: A proxy that makes network calls look like local function calls
 * - Unary Call: Simple request-response (like calling a function)
 * - Streaming Call: Receiving multiple responses from one request
 */

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// ============================================================================
// STEP 1: LOAD THE PROTO FILE (Same as Server!)
// ============================================================================
// CRITICAL: Client and server MUST use the same .proto file
// This ensures both sides understand the same data format and method signatures

const PROTO_PATH = path.join(__dirname, "users.proto");

// Load the proto file (same options as server for consistency)
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Extract the User service definition
const userProto = grpc.loadPackageDefinition(packageDefinition).userService;

// ============================================================================
// STEP 2: CREATE CLIENT STUB
// ============================================================================
// A "stub" is a proxy object that looks like a local object
// but actually makes network calls to the server
// This is the magic of RPC - remote calls look like local calls!

const SERVER_ADDRESS = "localhost:50051"; // Must match server's address

// Create the client stub
// createInsecure() = no TLS/SSL (matches server configuration)
const client = new userProto.User(
  SERVER_ADDRESS,
  grpc.credentials.createInsecure()
);

// ============================================================================
// STEP 3: MAKE RPC CALLS
// ============================================================================

console.log("🔌 Connected to gRPC server at", SERVER_ADDRESS);
console.log("");

// ----------------------------------------------------------------------------
// Example 1: Unary RPC Call (Simple Request-Response)
// ----------------------------------------------------------------------------
// This looks like a normal function call, but it's actually a network request!
// The client sends a request, waits for response, then executes the callback

console.log("📤 Example 1: Unary RPC - GetUser");
console.log("─────────────────────────────────");

client.GetUser({ id: "1" }, (error, response) => {
  if (error) {
    // gRPC errors have a 'code' and 'details' property
    console.error("❌ Error:", error.code, "-", error.details);
  } else {
    // Success! Response contains the UserResponse message
    console.log("✅ Response received:");
    console.log("   ID:", response.id);
    console.log("   Name:", response.name);
    console.log("   Age:", response.age);
    console.log("   Hobbies:", response.hobbies.join(", "));
  }
  console.log("");
});

// ----------------------------------------------------------------------------
// Example 2: Unary RPC Call - User Not Found
// ----------------------------------------------------------------------------

setTimeout(() => {
  console.log("📤 Example 2: Unary RPC - GetUser (Not Found)");
  console.log("─────────────────────────────────────────────");

  client.GetUser({ id: "999" }, (error, response) => {
    if (error) {
      console.log("❌ Error (expected):", error.code, "-", error.details);
    } else {
      console.log("✅ Response:", response);
    }
    console.log("");
  });
}, 500);

// ----------------------------------------------------------------------------
// Example 3: Server Streaming RPC Call
// ----------------------------------------------------------------------------
// Unlike unary calls, streaming calls receive multiple responses
// The server keeps the connection open and sends data as it becomes available
// This example streams all users, receiving one complete user object per chunk

setTimeout(() => {
  console.log("📤 Example 3: Server Streaming RPC - GetUsersStream");
  console.log("────────────────────────────────────────────────────");

  // Create a streaming call
  // Empty object {} = no parameters needed (matches Empty message in .proto)
  const stream = client.GetUsersStream({});

  let userCount = 0;

  // Listen for data chunks (responses from server)
  // Each chunk contains a complete user object with all fields
  stream.on("data", (response) => {
    userCount++;
    console.log(`📥 Received user ${userCount}:`);
    console.log("   ID:", response.id);
    console.log("   Name:", response.name);
    console.log("   Age:", response.age);
    console.log("   Hobbies:", response.hobbies.join(", "));
    console.log("");
  });

  // Listen for errors
  stream.on("error", (error) => {
    console.error("❌ Stream error:", error.code, "-", error.details);
  });

  // Listen for stream end
  stream.on("end", () => {
    console.log(
      `✅ Stream ended - received ${userCount} complete user objects`
    );
    console.log("");
    console.log("🎉 All examples completed!");
  });
}, 1000);

// ============================================================================
// KEY DIFFERENCES FROM REST API CALLS
// ============================================================================
//
// REST (HTTP/JSON):
//   - Text-based (JSON strings)
//   - One request = one response
//   - Need to manually parse JSON
//   - No built-in streaming
//   - Larger payload size
//
// gRPC (HTTP/2 + Protobuf):
//   - Binary format (Protobuf)
//   - Supports streaming (multiple responses)
//   - Strongly typed (from .proto file)
//   - Smaller payload size (5-10x smaller)
//   - Multiplexing (multiple requests on one connection)
//   - Looks like local function calls
//
