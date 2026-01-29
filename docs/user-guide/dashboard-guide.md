# Dashboard Guide

The Jack The Butler dashboard provides staff with tools to manage guest conversations, tasks, and system settings.

## Accessing the Dashboard

1. Open your browser to `http://your-server:3000`
2. Log in with your staff credentials
3. You'll see the main navigation with:
   - **Conversations** - Guest communication threads
   - **Tasks** - Service requests and work orders
   - **Integrations** - Channel and AI configuration
   - **Automations** - Automated messaging rules

## Conversations

The Conversations page shows all guest communication threads.

### Conversation List

- **Active** - Ongoing conversations requiring attention
- **Escalated** - Conversations flagged for human attention
- **Resolved** - Completed conversations

Each conversation card shows:
- Guest name and contact info
- Channel (WhatsApp, SMS, Email, Web Chat)
- Last message preview
- Status and assignment

### Viewing a Conversation

Click a conversation to open the detail view:

1. **Message Thread** - Full conversation history
2. **Guest Info Panel** - Guest profile and reservation details
3. **Quick Actions** - Assign, escalate, or resolve

### Sending Messages

1. Type your message in the input field
2. Click **Send** or press Enter
3. The message is delivered through the original channel

### Escalation

If AI cannot handle a request, conversations are automatically escalated. Staff can also manually escalate:

1. Click the **Escalate** button
2. Add a note explaining the issue
3. The conversation moves to the Escalated queue

### Resolution

When a conversation is complete:

1. Click **Resolve**
2. Optionally add resolution notes
3. The conversation moves to Resolved

## Tasks

Tasks represent service requests that need action.

### Task List

Tasks are organized by:
- **Status** - Pending, Assigned, In Progress, Completed
- **Department** - Housekeeping, Maintenance, Concierge, etc.
- **Priority** - Urgent, High, Standard, Low

### Creating Tasks

1. Click **New Task**
2. Fill in:
   - Description
   - Department
   - Room number (if applicable)
   - Priority
3. Click **Create**

### Working Tasks

1. Click a task to view details
2. Click **Claim** to assign to yourself
3. Click **Complete** when done
4. Add completion notes as needed

## Integrations

Configure connections to external services.

### AI Providers

1. Go to **Settings > Integrations > AI**
2. Select your provider (Anthropic, OpenAI, Ollama)
3. Enter API credentials
4. Test the connection
5. Enable the integration

### Channels

Configure messaging channels:

**WhatsApp**
1. Go to **Settings > Integrations > WhatsApp**
2. Select **Meta Business**
3. Enter Access Token and Phone Number ID
4. Configure webhook in Meta dashboard
5. Test and enable

**SMS**
1. Go to **Settings > Integrations > SMS**
2. Select **Twilio** or **Vonage**
3. Enter account credentials
4. Test and enable

**Email**
1. Go to **Settings > Integrations > Email**
2. Select **SMTP** or a provider
3. Enter server settings
4. Test and enable

### PMS Integration

Connect to your Property Management System:

1. Go to **Settings > Integrations > PMS**
2. Select your PMS provider
3. Enter API credentials
4. Configure sync settings
5. Test and enable

## Automations

Set up automated messaging and actions.

### Automation Rules

Create rules that trigger actions automatically:

1. Go to **Settings > Automations**
2. Click **New Rule**
3. Configure:
   - **Name** - Descriptive rule name
   - **Trigger** - When to run (scheduled or event-based)
   - **Action** - What to do (send message, create task, etc.)
4. Enable the rule

### Trigger Types

**Time-Based**
- Before/after arrival
- Before/after departure
- Scheduled time

**Event-Based**
- Reservation created/updated
- Guest checked in/out
- Conversation started
- Task created/completed

### Action Types

**Send Message**
- Select a message template
- Customize with guest variables
- Choose channel

**Create Task**
- Set task details
- Assign department
- Set priority

**Notify Staff**
- Send alert to staff
- Include context

**Webhook**
- Call external URL
- Send data payload

### Example Rules

**Pre-Arrival Welcome**
- Trigger: 1 day before arrival at 10:00 AM
- Action: Send welcome message with check-in details

**Post-Check-In Follow-Up**
- Trigger: 2 hours after check-in
- Action: Send message asking if they need anything

**VIP Alert**
- Trigger: VIP guest checks in
- Action: Notify concierge team

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + N` | New task |
| `Escape` | Close modal |

## Mobile Access

The dashboard is responsive and works on mobile devices:

1. Open the dashboard URL on your phone
2. Log in with your credentials
3. Use the hamburger menu for navigation

## Tips for Staff

1. **Check Escalated First** - These need immediate attention
2. **Use Quick Replies** - Templates save time
3. **Add Context Notes** - Help the next shift
4. **Watch for VIPs** - They get priority service
5. **Trust the AI** - But verify for complex requests
