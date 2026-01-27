# Deployment

Deploying Jack The Butler to production environments.

---

## Overview

Jack The Butler is designed for **self-hosted deployment** on hotel infrastructure. Each hotel runs their own instance, keeping guest data on their own servers.

### Deployment Options

| Method | Complexity | Best For |
|--------|------------|----------|
| Docker (recommended) | Low | Most deployments |
| Direct Node.js | Low | Custom environments |
| Docker Compose | Medium | With local LLM (Ollama) |

---

## Docker Deployment (Recommended)

### One-Command Deploy

```bash
docker run -d \
  --name jack \
  --restart unless-stopped \
  -p 3000:3000 \
  -v jack-data:/app/data \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e JWT_SECRET=your-secure-secret-min-32-chars \
  jackthebutler/jack:latest
```

That's it. Jack is now running at `http://localhost:3000`.

### Configuration via Environment

```bash
docker run -d \
  --name jack \
  --restart unless-stopped \
  -p 3000:3000 \
  -v jack-data:/app/data \
  --env-file /path/to/.env \
  jackthebutler/jack:latest
```

### Environment File

```bash
# /path/to/.env

# Core
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (stored in volume)
DATABASE_PATH=/app/data/jack.db

# Security (CHANGE THESE!)
JWT_SECRET=generate-a-secure-random-string-min-32-chars
ENCRYPTION_KEY=another-secure-random-string-32-chars

# AI Provider
ANTHROPIC_API_KEY=sk-ant-...

# Channels (configure as needed)
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxx
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_APP_SECRET=your-app-secret

TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hotel@gmail.com
SMTP_PASSWORD=app-specific-password
```

---

## Docker Compose Deployment

For deployments with additional services (like Ollama for local LLM):

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  jack:
    image: jackthebutler/jack:latest
    container_name: jack
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - jack-data:/app/data
    env_file:
      - .env
    depends_on:
      - ollama  # Optional

  # Optional: Local LLM
  ollama:
    image: ollama/ollama:latest
    container_name: jack-ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama

volumes:
  jack-data:
  ollama-data:
```

### Commands

```bash
# Start
docker compose up -d

# View logs
docker compose logs -f jack

# Stop
docker compose down

# Update
docker compose pull
docker compose up -d
```

---

## Direct Node.js Deployment

For environments where Docker isn't available:

### Prerequisites

```bash
# Install Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm
```

### Installation

```bash
# Clone repository
git clone https://github.com/jackthebutler/jack.git
cd jack

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm build

# Configure
cp .env.example .env
nano .env  # Edit configuration
```

### Running

```bash
# Start directly
node dist/index.js

# Or use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name jack
pm2 save
pm2 startup  # Auto-start on boot
```

---

## Reverse Proxy Setup

### Nginx

```nginx
# /etc/nginx/sites-available/jack
server {
    listen 80;
    server_name jack.yourhotel.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jack.yourhotel.com;

    ssl_certificate /etc/letsencrypt/live/jack.yourhotel.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jack.yourhotel.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for chat
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/jack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Caddy (Simpler)

```caddyfile
# /etc/caddy/Caddyfile
jack.yourhotel.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

---

## SSL/TLS Certificates

### Let's Encrypt (Free)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d jack.yourhotel.com

# Auto-renewal (added automatically)
sudo certbot renew --dry-run
```

---

## Data Persistence

### Backup Strategy

Jack stores all data in a single SQLite file, making backups simple:

```bash
# Manual backup
docker exec jack sqlite3 /app/data/jack.db ".backup '/app/data/backup.db'"
docker cp jack:/app/data/backup.db ./backups/jack-$(date +%Y%m%d).db

# Automated daily backup
cat > /etc/cron.daily/jack-backup << 'EOF'
#!/bin/bash
BACKUP_DIR=/backups/jack
mkdir -p $BACKUP_DIR
docker exec jack sqlite3 /app/data/jack.db ".backup '/app/data/backup.db'"
docker cp jack:/app/data/backup.db $BACKUP_DIR/jack-$(date +%Y%m%d).db
# Keep last 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
EOF
chmod +x /etc/cron.daily/jack-backup
```

### Restore from Backup

```bash
# Stop Jack
docker stop jack

# Restore database
docker cp ./backups/jack-20240115.db jack:/app/data/jack.db

# Start Jack
docker start jack
```

---

## Updating

### Docker Update

```bash
# Pull latest image
docker pull jackthebutler/jack:latest

# Stop current container
docker stop jack

# Remove old container (data is preserved in volume)
docker rm jack

# Start new container
docker run -d \
  --name jack \
  --restart unless-stopped \
  -p 3000:3000 \
  -v jack-data:/app/data \
  --env-file /path/to/.env \
  jackthebutler/jack:latest

# Run migrations (if needed)
docker exec jack pnpm db:migrate
```

### Direct Node.js Update

```bash
cd /path/to/jack

# Backup database
cp data/jack.db data/jack.db.backup

# Pull latest
git pull

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm build

# Run migrations
pnpm db:migrate

# Restart
pm2 restart jack
```

---

## Health Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/health

# Response:
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "database": "connected",
  "channels": {
    "whatsapp": "connected",
    "sms": "connected",
    "email": "connected",
    "webchat": "connected"
  }
}
```

### Docker Health Check

```bash
docker inspect --format='{{.State.Health.Status}}' jack
```

### Simple Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/check-jack.sh

HEALTH=$(curl -s http://localhost:3000/health | jq -r '.status')

if [ "$HEALTH" != "healthy" ]; then
  echo "Jack is unhealthy, restarting..."
  docker restart jack
  # Send alert (optional)
  # curl -X POST https://hooks.slack.com/... -d '{"text":"Jack restarted"}'
fi
```

```bash
# Run every 5 minutes
echo "*/5 * * * * /usr/local/bin/check-jack.sh" | crontab -
```

---

## Resource Requirements

### Minimum

| Resource | Requirement |
|----------|-------------|
| CPU | 1 core |
| RAM | 512 MB |
| Disk | 1 GB |

### Recommended

| Resource | Requirement |
|----------|-------------|
| CPU | 2 cores |
| RAM | 1 GB |
| Disk | 10 GB |

### With Local LLM (Ollama)

| Resource | Requirement |
|----------|-------------|
| CPU | 4+ cores |
| RAM | 8+ GB |
| Disk | 20+ GB |
| GPU | Optional (faster inference) |

---

## Security Checklist

- [ ] Change default JWT_SECRET and ENCRYPTION_KEY
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall (only expose ports 80, 443)
- [ ] Set up regular backups
- [ ] Keep Docker/Node.js updated
- [ ] Review channel webhook secrets
- [ ] Enable rate limiting
- [ ] Set LOG_LEVEL=info in production

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs jack

# Common issues:
# - Missing environment variables
# - Port already in use
# - Permission issues on data volume
```

### Database Errors

```bash
# Check database integrity
docker exec jack sqlite3 /app/data/jack.db "PRAGMA integrity_check"

# If corrupted, restore from backup
docker stop jack
docker cp ./backups/latest.db jack:/app/data/jack.db
docker start jack
```

### High Memory Usage

```bash
# Check memory
docker stats jack

# SQLite is memory efficient, high usage usually means:
# - Large conversation history (consider archiving)
# - Memory leak (update to latest version)
```

### Webhook Not Receiving

```bash
# Check if port is accessible
curl -I https://jack.yourhotel.com/health

# Verify webhook configuration in provider dashboard
# Check firewall rules
sudo ufw status
```

---

## Related

- [Local Development](local-development.md) - Development setup
- [Configuration](configuration.md) - All configuration options
- [Tech Stack](../03-architecture/tech-stack.md) - Technology choices
