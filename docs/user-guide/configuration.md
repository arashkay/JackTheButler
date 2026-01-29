# Configuration Reference

Jack The Butler is configured through environment variables. This guide covers all available options.

## Core Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment: `development`, `test`, or `production` |
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_PATH` | No | `./data/jack.db` | Path to SQLite database file |

## Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Secret for JWT signing (min 32 characters) |
| `JWT_EXPIRES_IN` | No | `15m` | Access token expiration |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiration |
| `ENCRYPTION_KEY` | No | Auto-generated | AES-256 key for encrypting credentials |

## AI Providers

### Anthropic (Claude)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes*** | - | Anthropic API key |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-20250514` | Model to use |

### OpenAI

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | **Yes*** | - | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o` | Model to use |

### Ollama (Local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OLLAMA_BASE_URL` | **Yes*** | - | Ollama server URL (e.g., `http://localhost:11434`) |
| `OLLAMA_MODEL` | No | `llama3` | Model to use |

*At least one AI provider is required.

## Channels

### WhatsApp (Meta Business)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WHATSAPP_ACCESS_TOKEN` | Yes | - | Meta access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | - | WhatsApp phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Yes | - | Webhook verification token |
| `WHATSAPP_APP_SECRET` | No | - | App secret for signature verification |

### SMS (Twilio)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TWILIO_ACCOUNT_SID` | Yes | - | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | - | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes | - | Twilio phone number (E.164 format) |

### Email (SMTP)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | Yes | - | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | Yes | - | SMTP username |
| `SMTP_PASSWORD` | Yes | - | SMTP password |
| `SMTP_FROM` | Yes | - | From email address |
| `IMAP_HOST` | No | - | IMAP server for receiving emails |
| `IMAP_PORT` | No | `993` | IMAP server port |
| `IMAP_USER` | No | - | IMAP username |
| `IMAP_PASSWORD` | No | - | IMAP password |

## PMS Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PMS_PROVIDER` | No | `mock` | PMS provider: `mock`, `mews`, `cloudbeds` |
| `PMS_API_URL` | No | - | PMS API base URL |
| `PMS_API_KEY` | No | - | PMS API key |
| `PMS_CLIENT_TOKEN` | No | - | PMS client/access token |
| `PMS_SYNC_INTERVAL` | No | `300000` | Sync interval in milliseconds (5 min) |

## Logging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | No | `json` | Log format: `json` or `pretty` |

## Example Configuration

### Development (.env)

```bash
NODE_ENV=development
PORT=3000
DATABASE_PATH=./data/jack.db

# Security
JWT_SECRET=your-development-secret-at-least-32-chars

# AI (choose one)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### Production (.env)

```bash
NODE_ENV=production
PORT=3000
DATABASE_PATH=/app/data/jack.db

# Security
JWT_SECRET=your-production-secret-at-least-32-chars-long
ENCRYPTION_KEY=your-32-byte-encryption-key-here

# AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# WhatsApp
WHATSAPP_ACCESS_TOKEN=EAABs...
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_APP_SECRET=app-secret-for-verification

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Docker Environment

When running with Docker, pass environment variables using `-e`:

```bash
docker run -d \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  -e ANTHROPIC_API_KEY=your-key \
  jackthebutler/jack:1.0.0
```

Or use a `.env` file:

```bash
docker run -d \
  --env-file .env \
  jackthebutler/jack:1.0.0
```

## Configuration via Dashboard

Most integrations can also be configured through the dashboard:

1. Go to **Settings > Integrations**
2. Select the integration to configure
3. Fill in the required fields
4. Click **Save** and **Test Connection**

Dashboard configuration is stored encrypted in the database and takes precedence over environment variables.
