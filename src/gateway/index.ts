/**
 * Gateway - Central HTTP/WebSocket Server
 *
 * The Gateway is the central nervous system of Jack, handling:
 * - HTTP API requests
 * - WebSocket connections
 * - Request routing and authentication
 * - Message orchestration
 *
 * @see docs/03-architecture/c4-components/gateway.md
 */

export { app, createApp } from './server.js';
export { setupWebSocket, broadcast, sendToUser, getConnectionCount } from './websocket.js';
export * from './middleware/index.js';
export * from './routes/index.js';
