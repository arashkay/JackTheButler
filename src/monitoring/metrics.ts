/**
 * Application Metrics
 *
 * Simple metrics collection for monitoring application performance.
 * Provides counters, gauges, and histograms.
 */

import { createLogger } from '@/utils/logger.js';

const log = createLogger('metrics');

/**
 * Counter metric - monotonically increasing value
 */
export class Counter {
  private value = 0;

  constructor(
    public readonly name: string,
    public readonly description: string
  ) {}

  inc(amount = 1): void {
    this.value += amount;
  }

  get(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}

/**
 * Gauge metric - value that can go up or down
 */
export class Gauge {
  private value = 0;

  constructor(
    public readonly name: string,
    public readonly description: string
  ) {}

  set(value: number): void {
    this.value = value;
  }

  inc(amount = 1): void {
    this.value += amount;
  }

  dec(amount = 1): void {
    this.value -= amount;
  }

  get(): number {
    return this.value;
  }
}

/**
 * Histogram metric - distribution of values
 */
export class Histogram {
  private values: number[] = [];
  private sum = 0;
  private count = 0;

  constructor(
    public readonly name: string,
    public readonly description: string,
    private readonly maxSamples = 1000
  ) {}

  observe(value: number): void {
    this.values.push(value);
    this.sum += value;
    this.count++;

    // Keep only recent samples
    if (this.values.length > this.maxSamples) {
      const removed = this.values.shift();
      if (removed !== undefined) {
        this.sum -= removed;
      }
    }
  }

  get(): { count: number; sum: number; avg: number; p50: number; p95: number; p99: number } {
    const sorted = [...this.values].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      count: this.count,
      sum: this.sum,
      avg: len > 0 ? this.sum / len : 0,
      p50: len > 0 ? sorted[Math.floor(len * 0.5)] ?? 0 : 0,
      p95: len > 0 ? sorted[Math.floor(len * 0.95)] ?? 0 : 0,
      p99: len > 0 ? sorted[Math.floor(len * 0.99)] ?? 0 : 0,
    };
  }

  reset(): void {
    this.values = [];
    this.sum = 0;
    this.count = 0;
  }
}

/**
 * Application metrics collection
 */
export const metrics = {
  // Counters
  messagesReceived: new Counter('messages_received_total', 'Total messages received'),
  messagesSent: new Counter('messages_sent_total', 'Total messages sent'),
  aiRequests: new Counter('ai_requests_total', 'Total AI API requests'),
  aiCacheHits: new Counter('ai_cache_hits_total', 'Total AI response cache hits'),
  tasksCreated: new Counter('tasks_created_total', 'Total tasks created'),
  tasksCompleted: new Counter('tasks_completed_total', 'Total tasks completed'),
  errors: new Counter('errors_total', 'Total errors'),
  authAttempts: new Counter('auth_attempts_total', 'Total authentication attempts'),
  authFailures: new Counter('auth_failures_total', 'Total authentication failures'),

  // Histograms
  messageProcessingTime: new Histogram('message_processing_seconds', 'Message processing time in milliseconds'),
  aiResponseTime: new Histogram('ai_response_seconds', 'AI response time in milliseconds'),
  dbQueryTime: new Histogram('db_query_seconds', 'Database query time in milliseconds'),
  httpRequestTime: new Histogram('http_request_seconds', 'HTTP request time in milliseconds'),

  // Gauges
  activeConversations: new Gauge('active_conversations', 'Currently active conversations'),
  pendingTasks: new Gauge('pending_tasks', 'Currently pending tasks'),
  connectedWebSockets: new Gauge('connected_websockets', 'Currently connected WebSocket clients'),
};

/**
 * Get all metrics as a structured object
 */
export function getMetrics(): Record<string, unknown> {
  return {
    counters: {
      messagesReceived: metrics.messagesReceived.get(),
      messagesSent: metrics.messagesSent.get(),
      aiRequests: metrics.aiRequests.get(),
      aiCacheHits: metrics.aiCacheHits.get(),
      tasksCreated: metrics.tasksCreated.get(),
      tasksCompleted: metrics.tasksCompleted.get(),
      errors: metrics.errors.get(),
      authAttempts: metrics.authAttempts.get(),
      authFailures: metrics.authFailures.get(),
    },
    histograms: {
      messageProcessingTime: metrics.messageProcessingTime.get(),
      aiResponseTime: metrics.aiResponseTime.get(),
      dbQueryTime: metrics.dbQueryTime.get(),
      httpRequestTime: metrics.httpRequestTime.get(),
    },
    gauges: {
      activeConversations: metrics.activeConversations.get(),
      pendingTasks: metrics.pendingTasks.get(),
      connectedWebSockets: metrics.connectedWebSockets.get(),
    },
  };
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  metrics.messagesReceived.reset();
  metrics.messagesSent.reset();
  metrics.aiRequests.reset();
  metrics.aiCacheHits.reset();
  metrics.tasksCreated.reset();
  metrics.tasksCompleted.reset();
  metrics.errors.reset();
  metrics.authAttempts.reset();
  metrics.authFailures.reset();
  metrics.messageProcessingTime.reset();
  metrics.aiResponseTime.reset();
  metrics.dbQueryTime.reset();
  metrics.httpRequestTime.reset();
  metrics.activeConversations.set(0);
  metrics.pendingTasks.set(0);
  metrics.connectedWebSockets.set(0);

  log.debug('Metrics reset');
}

// Export metrics instance for direct access
export default metrics;
