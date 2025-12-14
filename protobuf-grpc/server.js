/**
 * gRPC Server Implementation
 *
 * This server demonstrates how to:
 * 1. Load and parse a .proto file (the contract)
 * 2. Implement service methods (the business logic)
 * 3. Start a gRPC server and handle incoming requests
 *
 * Key Concepts:
 * - Protocol Buffers: Binary data format (smaller, faster than JSON)
 * - gRPC: RPC framework over HTTP/2 (supports streaming, multiplexing)
 * - Service Definition: The API contract defined in .proto file
 */

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// ============================================================================
// STEP 1: LOAD THE PROTO FILE (The Contract)
// ============================================================================
// The .proto file defines the "contract" between client and server
// Both sides must use the same .proto file to communicate
// This is like a TypeScript interface, but for network communication

const PROTO_PATH = path.join(__dirname, "users.proto");

// Load the proto file synchronously
// protoLoader converts the .proto file into JavaScript objects we can use
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  // Options for loading the proto file
  keepCase: true, // Keep field names as-is (don't convert to camelCase)
  longs: String, // Convert 64-bit integers to strings (JavaScript limitation)
  enums: String, // Convert enums to strings
  defaults: true, // Set default values for missing fields
  oneofs: true, // Support "oneof" fields (mutually exclusive fields)
});

// Load the package definition into gRPC
// This creates JavaScript objects that match our service and message definitions
const userProto = grpc.loadPackageDefinition(packageDefinition).userService;

// ============================================================================
// STEP 2: CREATE IN-MEMORY DATABASE (Mock Data Store)
// ============================================================================
// In a real application, this would be a database connection
// For learning purposes, we'll use a simple array

const usersDB = [
  { id: "1", name: "Alice", age: 25, hobbies: ["Coding", "Skiing"] },
  { id: "2", name: "Bob", age: 30, hobbies: ["Gaming", "Reading"] },
  { id: "3", name: "Charlie", age: 28, hobbies: ["Photography"] },
];

// ============================================================================
// STEP 3: IMPLEMENT SERVICE METHODS (Business Logic)
// ============================================================================
// Each RPC method defined in the .proto file needs an implementation
// The function signature is always: (call, callback) => {}

/**
 * Unary RPC: GetUser
 * Pattern: 1 Request → 1 Response (like REST API)
 *
 * @param {Object} call - Contains request data and metadata
 * @param {Object} call.request - The UserRequest message (has 'id' field)
 * @param {Function} callback - Function to send response or error
 * @param {Error|null} callback[0] - Error object (null if success)
 * @param {Object} callback[1] - UserResponse message (user data)
 */
function getUser(call, callback) {
  // Log the incoming request for debugging
  console.log("📥 Received GetUser request for ID:", call.request.id);

  // Find user in our mock database
  const user = usersDB.find((u) => u.id === call.request.id);

  if (user) {
    // SUCCESS: User found
    // First parameter (null) = no error
    // Second parameter = the response data (must match UserResponse message)
    callback(null, user);
    console.log("✅ Sent user data:", user.name);
  } else {
    // ERROR: User not found
    // gRPC uses status codes (like HTTP, but different)
    // NOT_FOUND = equivalent to HTTP 404
    callback({
      code: grpc.status.NOT_FOUND, // gRPC status code
      details: `User with ID '${call.request.id}' not found`,
    });
    console.log("❌ User not found:", call.request.id);
  }
}

/**
 * Server Streaming RPC: GetUsersStream
 * Pattern: 1 Request → Multiple Responses (streaming)
 *
 * This demonstrates how gRPC can send multiple responses to a single request
 * Unlike REST, we can keep the connection open and send data as it becomes available
 * This method streams all users from the database, sending one complete user object per chunk
 *
 * @param {Object} call - Contains request and a writable stream
 * @param {Object} call.request - The Empty message (no parameters needed)
 * @param {Object} call.write - Function to send a response chunk (complete user object)
 * @param {Function} call.end - Function to close the stream
 */
function getUsersStream(call, callback) {
  console.log("📥 Received GetUsersStream request - streaming all users");

  if (usersDB.length === 0) {
    // If no users, we can either send nothing or send an error
    // For this example, we'll just close the stream
    console.log("⚠️ No users found in database");
    call.end();
    return;
  }

  console.log(`📡 Starting to stream ${usersDB.length} users...`);

  // Stream each user one by one with a small delay to demonstrate streaming
  // In a real scenario, this might be:
  // - Fetching users from a database in batches
  // - Processing and sending data as it becomes available
  // - Real-time updates as new users are added

  let userIndex = 0;

  // Function to send the next user
  const sendNextUser = () => {
    if (userIndex < usersDB.length) {
      const user = usersDB[userIndex];

      // Send a complete user object as one chunk
      // Each chunk contains all user data: id, name, age, and all hobbies
      call.write({
        id: user.id,
        name: user.name,
        age: user.age,
        hobbies: user.hobbies, // Complete hobbies array
      });

      console.log(
        `📤 Sent user ${userIndex + 1}/${usersDB.length}: ${user.name}`
      );

      userIndex++;

      // Wait 500ms before sending the next user (simulates processing time)
      // In production, you might send immediately or based on actual processing
      setTimeout(sendNextUser, 500);
    } else {
      // All users sent, close the stream
      call.end();
      console.log("✅ Stream closed - all users sent");
    }
  };

  // Start streaming
  sendNextUser();
}

// ============================================================================
// STEP 4: CREATE AND CONFIGURE THE SERVER
// ============================================================================

// Create a new gRPC server instance
const server = new grpc.Server();

// Register our service implementation
// This connects the methods in our .proto file to the JavaScript functions above
server.addService(userProto.User.service, {
  GetUser: getUser, // Maps to "rpc GetUser" in .proto
  GetUsersStream: getUsersStream, // Maps to "rpc GetUsersStream" in .proto
});

// ============================================================================
// STEP 5: START THE SERVER
// ============================================================================

const PORT = "0.0.0.0:50051"; // Listen on all interfaces, port 50051

// Bind the server to a port and start listening
// createInsecure() = no TLS/SSL (fine for development, NOT for production!)
server.bindAsync(
  PORT,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error("❌ Failed to start server:", error);
      return;
    }

    console.log("🚀 gRPC Server running on", PORT);
    console.log("📋 Available methods:");
    console.log("   - GetUser (Unary)");
    console.log("   - GetUsersStream (Server Streaming)");
  }
);
