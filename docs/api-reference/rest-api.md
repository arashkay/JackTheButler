# REST API Reference

Jack The Butler provides a REST API for integration and automation.

## Base URL

```
http://your-server:3000/api/v1
```

## Authentication

Most endpoints require JWT authentication.

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "staff@hotel.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

### Using the Token

Include the token in the Authorization header:

```http
GET /api/v1/conversations
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Conversations

### List Conversations

```http
GET /api/v1/conversations
```

**Query Parameters:**
- `state` - Filter by state: `active`, `escalated`, `resolved`
- `assignedTo` - Filter by assigned staff ID
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv_abc123",
      "guestId": "guest_xyz",
      "channelType": "whatsapp",
      "channelId": "+15551234567",
      "state": "active",
      "lastMessageAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42
}
```

### Get Conversation

```http
GET /api/v1/conversations/:id
```

### Get Conversation Messages

```http
GET /api/v1/conversations/:id/messages
```

### Send Message

```http
POST /api/v1/conversations/:id/messages
Content-Type: application/json

{
  "content": "Hello, how can I help you?"
}
```

### Update Conversation

```http
PATCH /api/v1/conversations/:id
Content-Type: application/json

{
  "state": "resolved",
  "assignedTo": "staff_123"
}
```

## Tasks

### List Tasks

```http
GET /api/v1/tasks
```

**Query Parameters:**
- `status` - Filter by status: `pending`, `assigned`, `in_progress`, `completed`
- `department` - Filter by department
- `assignedTo` - Filter by assigned staff ID

### Create Task

```http
POST /api/v1/tasks
Content-Type: application/json

{
  "type": "housekeeping",
  "department": "housekeeping",
  "description": "Extra towels needed",
  "roomNumber": "302",
  "priority": "standard"
}
```

### Update Task

```http
PATCH /api/v1/tasks/:id
Content-Type: application/json

{
  "status": "completed",
  "completionNotes": "Delivered 2 extra towels"
}
```

## Integrations

### List Integrations

```http
GET /api/v1/integrations
```

### Get Integration Status

```http
GET /api/v1/integrations/:integrationId
```

### Update Provider Config

```http
PUT /api/v1/integrations/:integrationId/providers/:providerId
Content-Type: application/json

{
  "apiKey": "sk-ant-...",
  "model": "claude-sonnet-4-20250514"
}
```

### Test Connection

```http
POST /api/v1/integrations/:integrationId/providers/:providerId/test
```

### Toggle Provider

```http
POST /api/v1/integrations/:integrationId/providers/:providerId/toggle
Content-Type: application/json

{
  "enabled": true
}
```

## Automation Rules

### List Rules

```http
GET /api/v1/automation/rules
```

### Create Rule

```http
POST /api/v1/automation/rules
Content-Type: application/json

{
  "name": "Welcome Message",
  "triggerType": "time_based",
  "triggerConfig": {
    "type": "before_arrival",
    "offsetDays": 1,
    "time": "10:00"
  },
  "actionType": "send_message",
  "actionConfig": {
    "template": "welcome_pre_arrival"
  },
  "enabled": true
}
```

### Update Rule

```http
PUT /api/v1/automation/rules/:ruleId
Content-Type: application/json

{
  "name": "Updated Rule Name",
  "enabled": false
}
```

### Toggle Rule

```http
POST /api/v1/automation/rules/:ruleId/toggle
Content-Type: application/json

{
  "enabled": true
}
```

### Test Rule

```http
POST /api/v1/automation/rules/:ruleId/test
```

### Delete Rule

```http
DELETE /api/v1/automation/rules/:ruleId
```

## Health & Monitoring

### Liveness Check

```http
GET /health/live
```

Returns 200 if the process is running.

### Readiness Check

```http
GET /health/ready
```

Returns 200 if the service is ready to accept traffic.

### System Info

```http
GET /health/info
```

Returns version, uptime, and memory usage.

### Metrics

```http
GET /health/metrics
```

Returns application metrics (counters, histograms, gauges).

## Webhooks

### WhatsApp Webhook

```
GET /webhooks/whatsapp   # Verification
POST /webhooks/whatsapp  # Messages
```

### SMS Webhook (Twilio)

```
POST /webhooks/sms/twilio/inbound  # Incoming SMS
POST /webhooks/sms/twilio/status   # Delivery status
```

### PMS Webhook

```
POST /webhooks/pms/guests        # Guest updates
POST /webhooks/pms/reservations  # Reservation updates
POST /webhooks/pms/events        # Generic events
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "path": ["email"],
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limits

- Auth endpoints: 10 requests/minute per IP
- API endpoints: 100 requests/minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705320000
```
