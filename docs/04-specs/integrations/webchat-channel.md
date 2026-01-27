# Web Chat Channel Integration

Real-time web chat channel for Jack The Butler using WebSocket.

---

## Overview

The web chat channel enables guest communication via an embeddable chat widget on hotel websites. Uses WebSocket for real-time bidirectional messaging.

### Capabilities

| Feature | Support |
|---------|---------|
| Real-time messaging | Yes |
| Typing indicators | Yes |
| Read receipts | Yes |
| Rich formatting | Markdown |
| File uploads | Yes |
| Quick replies | Yes |
| Carousels | Yes |
| Buttons | Yes |
| Persistent history | Yes |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Hotel Website                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Jack Chat Widget                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐    │    │
│  │  │ Chat UI  │  │ WebSocket│  │ Local Storage  │    │    │
│  │  │          │  │  Client  │  │ (session/msgs) │    │    │
│  │  └──────────┘  └──────────┘  └────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ wss://
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Jack Gateway                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            WebChat Channel Adapter                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │    │
│  │  │  WebSocket   │  │  Connection  │  │  Message  │  │    │
│  │  │   Server     │  │   Manager    │  │  Handler  │  │    │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Server Environment

```bash
# WebSocket server
WEBSOCKET_PORT=3001
WEBSOCKET_PATH=/ws/chat
WEBSOCKET_PING_INTERVAL=30000
WEBSOCKET_MAX_CONNECTIONS=10000

# Widget configuration
WIDGET_ALLOWED_ORIGINS=https://hotel.com,https://www.hotel.com
WIDGET_MAX_MESSAGE_SIZE=4096
WIDGET_MAX_FILE_SIZE=5242880  # 5MB
```

### Widget Embed Code

```html
<!-- Add to hotel website -->
<script>
  window.JackChatConfig = {
    hotelId: 'hotel_123',
    apiUrl: 'https://api.jackthebutler.com',
    wsUrl: 'wss://api.jackthebutler.com/ws/chat',
    theme: {
      primaryColor: '#1a365d',
      fontFamily: 'Inter, sans-serif'
    },
    position: 'bottom-right',
    greeting: 'Hello! How can I help you today?'
  };
</script>
<script src="https://cdn.jackthebutler.com/widget.js" async></script>
```

---

## Server Implementation

### WebSocket Server

```typescript
// src/channels/webchat/adapter.ts

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ChannelAdapter } from '../base-adapter';
import { logger } from '@/utils/logger';

interface Connection {
  ws: WebSocket;
  sessionId: string;
  guestId?: string;
  hotelId: string;
  lastActivity: Date;
}

export class WebChatAdapter implements ChannelAdapter {
  readonly channel = 'webchat' as const;
  private wss: WebSocketServer;
  private connections = new Map<string, Connection>();
  private pingInterval: NodeJS.Timeout;

  constructor(config: WebChatConfig) {
    this.wss = new WebSocketServer({
      port: config.port,
      path: config.path,
      verifyClient: this.verifyClient.bind(this)
    });

    this.setupEventHandlers();
    this.startPingInterval();
  }

  private verifyClient(
    info: { origin: string; req: IncomingMessage; secure: boolean },
    callback: (result: boolean, code?: number, message?: string) => void
  ) {
    const allowedOrigins = process.env.WIDGET_ALLOWED_ORIGINS?.split(',') || [];
    const origin = info.origin;

    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      logger.warn('Rejected WebSocket connection from unauthorized origin', { origin });
      callback(false, 403, 'Origin not allowed');
      return;
    }

    callback(true);
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error });
    });
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage) {
    const sessionId = this.generateSessionId();
    const hotelId = this.extractHotelId(req);

    if (!hotelId) {
      ws.close(4000, 'Missing hotel ID');
      return;
    }

    const connection: Connection = {
      ws,
      sessionId,
      hotelId,
      lastActivity: new Date()
    };

    this.connections.set(sessionId, connection);

    logger.info('WebChat connection established', { sessionId, hotelId });

    // Send connection acknowledgment
    this.sendToClient(ws, {
      type: 'connected',
      sessionId,
      timestamp: new Date().toISOString()
    });

    // Handle messages
    ws.on('message', (data) => this.handleMessage(sessionId, data));

    // Handle close
    ws.on('close', (code, reason) => {
      this.handleDisconnect(sessionId, code, reason.toString());
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket client error', { sessionId, error });
    });
  }

  private async handleMessage(sessionId: string, data: WebSocket.Data) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    connection.lastActivity = new Date();

    try {
      const message = JSON.parse(data.toString()) as WebChatClientMessage;

      switch (message.type) {
        case 'identify':
          await this.handleIdentify(sessionId, message);
          break;

        case 'message':
          await this.handleChatMessage(sessionId, message);
          break;

        case 'typing':
          await this.handleTyping(sessionId, message);
          break;

        case 'read':
          await this.handleReadReceipt(sessionId, message);
          break;

        default:
          logger.warn('Unknown message type', { sessionId, type: message.type });
      }
    } catch (error) {
      logger.error('Failed to process WebChat message', { sessionId, error });
    }
  }

  private async handleIdentify(sessionId: string, message: IdentifyMessage) {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    // Identify or create guest
    const guest = await guestService.identify('webchat', message.visitorId || sessionId);
    connection.guestId = guest.id;

    // Update guest info if provided
    if (message.name || message.email) {
      await guestService.update(guest.id, {
        name: message.name,
        email: message.email
      });
    }

    // Send conversation history if resuming
    if (message.resumeConversation) {
      const conversation = await conversationService.getActive(guest.id);
      if (conversation) {
        const messages = await conversationService.getMessages(conversation.id);
        this.sendToClient(connection.ws, {
          type: 'history',
          conversationId: conversation.id,
          messages: messages.map(this.formatMessageForClient)
        });
      }
    }

    this.sendToClient(connection.ws, {
      type: 'identified',
      guestId: guest.id
    });
  }

  private async handleChatMessage(sessionId: string, message: ChatMessage) {
    const connection = this.connections.get(sessionId);
    if (!connection?.guestId) {
      this.sendToClient(connection!.ws, {
        type: 'error',
        code: 'NOT_IDENTIFIED',
        message: 'Please identify first'
      });
      return;
    }

    // Get or create conversation
    let conversation = await conversationService.getActive(connection.guestId);
    if (!conversation) {
      conversation = await conversationService.create({
        guestId: connection.guestId,
        channel: 'webchat',
        channelIdentifier: sessionId
      });
    }

    // Add message
    const savedMessage = await conversationService.addMessage(conversation.id, {
      role: 'guest',
      content: message.content,
      attachments: message.attachments,
      timestamp: new Date()
    });

    // Acknowledge receipt
    this.sendToClient(connection.ws, {
      type: 'message_ack',
      clientMessageId: message.clientMessageId,
      messageId: savedMessage.id,
      timestamp: savedMessage.timestamp.toISOString()
    });

    logger.info('WebChat message received', {
      sessionId,
      conversationId: conversation.id,
      messageId: savedMessage.id
    });
  }

  private async handleTyping(sessionId: string, message: TypingMessage) {
    const connection = this.connections.get(sessionId);
    if (!connection?.guestId) return;

    const conversation = await conversationService.getActive(connection.guestId);
    if (!conversation) return;

    // Broadcast typing status to staff dashboard
    await eventBus.emit('webchat.typing', {
      conversationId: conversation.id,
      guestId: connection.guestId,
      isTyping: message.isTyping
    });
  }

  private handleDisconnect(sessionId: string, code: number, reason: string) {
    this.connections.delete(sessionId);
    logger.info('WebChat connection closed', { sessionId, code, reason });
  }

  // Send message to guest
  async send(message: OutgoingMessage): Promise<SendResult> {
    const { conversationId, content, quickReplies, buttons, attachments } = message;

    // Find connection for this conversation
    const connection = this.findConnectionByConversation(conversationId);

    if (!connection) {
      // Guest not connected - store for later delivery
      await this.queueForDelivery(conversationId, message);
      return { success: true, queued: true };
    }

    const clientMessage = {
      type: 'message',
      messageId: message.id,
      content,
      quickReplies,
      buttons,
      attachments,
      timestamp: new Date().toISOString()
    };

    this.sendToClient(connection.ws, clientMessage);

    return {
      success: true,
      messageId: message.id,
      timestamp: new Date()
    };
  }

  // Send bot typing indicator
  async sendTypingIndicator(conversationId: string, isTyping: boolean) {
    const connection = this.findConnectionByConversation(conversationId);
    if (!connection) return;

    this.sendToClient(connection.ws, {
      type: 'typing',
      isTyping
    });
  }

  private sendToClient(ws: WebSocket, message: unknown) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private findConnectionByConversation(conversationId: string): Connection | undefined {
    // Look up conversation to get guest ID, then find their connection
    // This is a simplified version - in production, maintain a mapping
    for (const connection of this.connections.values()) {
      // Implementation depends on how you track conversation<->connection
    }
    return undefined;
  }

  private startPingInterval() {
    const interval = parseInt(process.env.WEBSOCKET_PING_INTERVAL || '30000', 10);

    this.pingInterval = setInterval(() => {
      this.connections.forEach((connection, sessionId) => {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping();
        } else {
          this.connections.delete(sessionId);
        }
      });
    }, interval);
  }

  private generateSessionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractHotelId(req: IncomingMessage): string | null {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    return url.searchParams.get('hotelId');
  }

  private formatMessageForClient(message: Message): ClientMessage {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      attachments: message.attachments,
      timestamp: message.timestamp.toISOString()
    };
  }

  shutdown() {
    clearInterval(this.pingInterval);
    this.wss.close();
  }
}
```

---

## Client Widget

### Widget SDK

```typescript
// apps/widget/src/sdk.ts

interface JackChatSDK {
  init(config: WidgetConfig): void;
  open(): void;
  close(): void;
  sendMessage(content: string): void;
  identify(user: UserIdentity): void;
  on(event: string, callback: Function): void;
}

class JackChat implements JackChatSDK {
  private ws: WebSocket | null = null;
  private config: WidgetConfig;
  private sessionId: string | null = null;
  private messageQueue: ChatMessage[] = [];
  private eventHandlers = new Map<string, Function[]>();

  init(config: WidgetConfig) {
    this.config = config;
    this.renderWidget();
    this.connect();
  }

  private connect() {
    const visitorId = this.getOrCreateVisitorId();

    this.ws = new WebSocket(
      `${this.config.wsUrl}?hotelId=${this.config.hotelId}&visitorId=${visitorId}`
    );

    this.ws.onopen = () => {
      this.emit('connected');
      this.flushMessageQueue();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleServerMessage(message);
    };

    this.ws.onclose = (event) => {
      this.emit('disconnected', { code: event.code, reason: event.reason });
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };
  }

  private handleServerMessage(message: ServerMessage) {
    switch (message.type) {
      case 'connected':
        this.sessionId = message.sessionId;
        this.identify();
        break;

      case 'message':
        this.emit('message', message);
        this.renderMessage(message);
        break;

      case 'typing':
        this.emit('typing', message);
        this.showTypingIndicator(message.isTyping);
        break;

      case 'message_ack':
        this.emit('message_sent', message);
        this.markMessageSent(message.clientMessageId, message.messageId);
        break;

      case 'history':
        this.renderHistory(message.messages);
        break;

      case 'error':
        this.emit('error', message);
        break;
    }
  }

  sendMessage(content: string, attachments?: Attachment[]) {
    const clientMessageId = `msg_${Date.now()}`;

    const message: ChatMessage = {
      type: 'message',
      clientMessageId,
      content,
      attachments
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }

    // Optimistic UI update
    this.renderMessage({
      id: clientMessageId,
      role: 'guest',
      content,
      attachments,
      timestamp: new Date().toISOString(),
      pending: true
    });

    return clientMessageId;
  }

  identify(user?: UserIdentity) {
    const visitorId = this.getOrCreateVisitorId();

    this.ws?.send(JSON.stringify({
      type: 'identify',
      visitorId,
      name: user?.name,
      email: user?.email,
      resumeConversation: true
    }));
  }

  sendTyping(isTyping: boolean) {
    this.ws?.send(JSON.stringify({
      type: 'typing',
      isTyping
    }));
  }

  open() {
    this.widgetContainer?.classList.add('open');
    this.emit('opened');
  }

  close() {
    this.widgetContainer?.classList.remove('open');
    this.emit('closed');
  }

  on(event: string, callback: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  private emit(event: string, data?: unknown) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  private getOrCreateVisitorId(): string {
    let visitorId = localStorage.getItem('jack_visitor_id');
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('jack_visitor_id', visitorId);
    }
    return visitorId;
  }

  private scheduleReconnect() {
    setTimeout(() => this.connect(), 3000);
  }

  // ... UI rendering methods
}

// Global export
window.JackChat = new JackChat();
```

### Widget HTML/CSS

```html
<!-- apps/widget/src/widget.html -->
<div id="jack-chat-widget" class="jack-chat">
  <!-- Launcher button -->
  <button class="jack-chat-launcher" onclick="JackChat.open()">
    <svg class="icon-chat"><!-- Chat icon --></svg>
    <svg class="icon-close"><!-- Close icon --></svg>
  </button>

  <!-- Chat window -->
  <div class="jack-chat-window">
    <div class="jack-chat-header">
      <div class="jack-chat-title">
        <img src="avatar.png" class="jack-avatar" />
        <div>
          <strong>Jack</strong>
          <span class="status">Online</span>
        </div>
      </div>
      <button class="jack-chat-close" onclick="JackChat.close()">×</button>
    </div>

    <div class="jack-chat-messages" id="jack-messages">
      <!-- Messages rendered here -->
    </div>

    <div class="jack-chat-typing" id="jack-typing" hidden>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>

    <div class="jack-chat-input">
      <input
        type="text"
        placeholder="Type your message..."
        onkeyup="handleInput(event)"
      />
      <button class="jack-chat-send" onclick="sendMessage()">
        <svg><!-- Send icon --></svg>
      </button>
    </div>
  </div>
</div>
```

```css
/* apps/widget/src/widget.css */
.jack-chat {
  --primary: #1a365d;
  --primary-light: #2d4a7c;
  --bg: #ffffff;
  --text: #333333;
  --text-light: #666666;
  --border: #e2e8f0;

  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999999;
  font-family: var(--font-family, -apple-system, BlinkMacSystemFont, sans-serif);
}

.jack-chat-launcher {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--primary);
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
}

.jack-chat-launcher:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.jack-chat-window {
  display: none;
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 380px;
  height: 600px;
  background: var(--bg);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  flex-direction: column;
}

.jack-chat.open .jack-chat-window {
  display: flex;
}

.jack-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--primary);
  color: white;
}

.jack-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.jack-message {
  max-width: 80%;
  margin-bottom: 12px;
  padding: 12px 16px;
  border-radius: 16px;
  line-height: 1.4;
}

.jack-message.guest {
  background: var(--primary);
  color: white;
  margin-left: auto;
  border-bottom-right-radius: 4px;
}

.jack-message.assistant {
  background: #f1f5f9;
  color: var(--text);
  border-bottom-left-radius: 4px;
}

.jack-chat-input {
  display: flex;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  gap: 8px;
}

.jack-chat-input input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 10px 16px;
  outline: none;
}

.jack-chat-input input:focus {
  border-color: var(--primary);
}

.jack-chat-send {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  border: none;
  cursor: pointer;
  color: white;
}

/* Typing indicator */
.jack-chat-typing {
  padding: 8px 16px;
  display: flex;
  gap: 4px;
}

.typing-dot {
  width: 8px;
  height: 8px;
  background: var(--text-light);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

/* Quick replies */
.jack-quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
}

.jack-quick-reply {
  padding: 8px 16px;
  border: 1px solid var(--primary);
  border-radius: 20px;
  background: white;
  color: var(--primary);
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s, color 0.2s;
}

.jack-quick-reply:hover {
  background: var(--primary);
  color: white;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .jack-chat-window {
    width: 100vw;
    height: 100vh;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }

  .jack-chat-launcher {
    bottom: 10px;
    right: 10px;
  }
}
```

---

## Rich Messages

### Quick Replies

```typescript
// Send message with quick reply options
await webChatAdapter.send({
  conversationId,
  content: 'How can I help you today?',
  quickReplies: [
    { label: 'Room Service', payload: 'room_service' },
    { label: 'Housekeeping', payload: 'housekeeping' },
    { label: 'Concierge', payload: 'concierge' },
    { label: 'Other', payload: 'other' }
  ]
});
```

### Buttons

```typescript
// Send message with action buttons
await webChatAdapter.send({
  conversationId,
  content: 'Your room service order is ready. Would you like to track it?',
  buttons: [
    {
      type: 'postback',
      label: 'Track Order',
      payload: 'track_order_123'
    },
    {
      type: 'url',
      label: 'View Menu',
      url: 'https://hotel.com/menu'
    }
  ]
});
```

### Cards/Carousels

```typescript
// Send card carousel (e.g., restaurant recommendations)
await webChatAdapter.send({
  conversationId,
  content: 'Here are some restaurants nearby:',
  cards: [
    {
      title: 'The Italian Place',
      subtitle: '5 min walk • $$$',
      imageUrl: 'https://...',
      buttons: [
        { type: 'url', label: 'View Menu', url: 'https://...' },
        { type: 'postback', label: 'Book Table', payload: 'book_italian' }
      ]
    },
    {
      title: 'Sushi Garden',
      subtitle: '10 min walk • $$',
      imageUrl: 'https://...',
      buttons: [
        { type: 'url', label: 'View Menu', url: 'https://...' },
        { type: 'postback', label: 'Book Table', payload: 'book_sushi' }
      ]
    }
  ]
});
```

---

## File Uploads

### Client-Side Upload

```typescript
// Widget file upload handling
async function handleFileUpload(file: File) {
  const maxSize = parseInt(window.JackChatConfig.maxFileSize || '5242880', 10);

  if (file.size > maxSize) {
    showError('File too large. Maximum size is 5MB.');
    return;
  }

  // Get upload URL from server
  const { uploadUrl, attachmentId } = await fetch(
    `${window.JackChatConfig.apiUrl}/chat/upload-url`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size
      })
    }
  ).then(r => r.json());

  // Upload file
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });

  // Send message with attachment
  JackChat.sendMessage('', [{
    id: attachmentId,
    filename: file.name,
    contentType: file.type,
    size: file.size
  }]);
}
```

### Server-Side Handling

```typescript
// Generate presigned upload URL
app.post('/chat/upload-url', async (c) => {
  const { filename, contentType, size } = await c.req.json();

  const attachmentId = `att_${Date.now()}`;
  const key = `uploads/${attachmentId}/${filename}`;

  const uploadUrl = await storage.getSignedUploadUrl(key, contentType, size);

  return c.json({ uploadUrl, attachmentId });
});
```

---

## Testing

### Unit Tests

```typescript
// src/channels/webchat/adapter.test.ts

import { describe, it, expect, vi } from 'vitest';
import { WebChatAdapter } from './adapter';
import WebSocket from 'ws';

describe('WebChatAdapter', () => {
  describe('connection handling', () => {
    it('should accept valid connections', async () => {
      const adapter = new WebChatAdapter({ port: 0, path: '/ws' });

      const ws = new WebSocket(`ws://localhost:${adapter.port}/ws?hotelId=hotel_123`);

      await new Promise((resolve) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          expect(message.type).toBe('connected');
          expect(message.sessionId).toBeDefined();
          resolve(null);
        });
      });

      ws.close();
      adapter.shutdown();
    });

    it('should reject connections without hotelId', async () => {
      const adapter = new WebChatAdapter({ port: 0, path: '/ws' });

      const ws = new WebSocket(`ws://localhost:${adapter.port}/ws`);

      await new Promise((resolve) => {
        ws.on('close', (code) => {
          expect(code).toBe(4000);
          resolve(null);
        });
      });

      adapter.shutdown();
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/channels/webchat.test.ts

import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';

describe('WebChat Integration', () => {
  it('should handle full conversation flow', async () => {
    const ws = new WebSocket('ws://localhost:3001/ws/chat?hotelId=test_hotel');
    const messages: unknown[] = [];

    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    // Wait for connection
    await new Promise((resolve) => ws.on('open', resolve));

    // Identify
    ws.send(JSON.stringify({
      type: 'identify',
      visitorId: 'test_visitor',
      name: 'Test Guest'
    }));

    // Wait for identification
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Send message
    ws.send(JSON.stringify({
      type: 'message',
      clientMessageId: 'msg_1',
      content: 'I need extra towels'
    }));

    // Wait for acknowledgment
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify messages received
    expect(messages).toContainEqual(expect.objectContaining({ type: 'connected' }));
    expect(messages).toContainEqual(expect.objectContaining({ type: 'identified' }));
    expect(messages).toContainEqual(expect.objectContaining({
      type: 'message_ack',
      clientMessageId: 'msg_1'
    }));

    ws.close();
  });
});
```

---

## Monitoring

### Metrics

```typescript
import { metrics } from '@/utils/metrics';

// Active connections
metrics.gauge('webchat_connections_active', {
  hotelId: string
});

// Messages per second
metrics.counter('webchat_messages_total', {
  direction: 'inbound' | 'outbound',
  type: 'text' | 'attachment' | 'quick_reply'
});

// Connection duration
metrics.histogram('webchat_connection_duration_seconds', {
  disconnectReason: string
});

// Message latency
metrics.histogram('webchat_message_latency_ms', {
  direction: 'inbound' | 'outbound'
});
```

### Health Check

```typescript
// WebSocket server health
app.get('/health/websocket', (c) => {
  const adapter = channelManager.get('webchat') as WebChatAdapter;

  return c.json({
    status: 'healthy',
    connections: adapter.connectionCount,
    uptime: adapter.uptime
  });
});
```

---

## Related

- [Channel Architecture](../../03-architecture/c4-components/channels.md) - Channel design
- [SMS Channel](sms-channel.md) - SMS integration
- [Email Channel](email-channel.md) - Email integration
- [WhatsApp Channel](whatsapp-channel.md) - WhatsApp integration
