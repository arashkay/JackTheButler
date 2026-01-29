/**
 * Simple Load Test Script
 *
 * Tests API performance under concurrent load.
 * Run with: npx tsx scripts/load-test.ts [url] [concurrency] [duration]
 *
 * Example: npx tsx scripts/load-test.ts http://localhost:3000 100 30
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.argv[3] || '50', 10);
const DURATION_SECONDS = parseInt(process.argv[4] || '10', 10);

interface Stats {
  requests: number;
  errors: number;
  latencies: number[];
}

async function makeRequest(url: string, stats: Stats): Promise<void> {
  const start = performance.now();
  try {
    const response = await fetch(url);
    if (!response.ok) {
      stats.errors++;
    }
    stats.latencies.push(performance.now() - start);
    stats.requests++;
  } catch {
    stats.errors++;
    stats.requests++;
  }
}

async function runWorker(url: string, stats: Stats, endTime: number): Promise<void> {
  while (Date.now() < endTime) {
    await makeRequest(url, stats);
  }
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

async function runTest(endpoint: string, description: string): Promise<void> {
  const url = `${BASE_URL}${endpoint}`;
  const stats: Stats = { requests: 0, errors: 0, latencies: [] };
  const endTime = Date.now() + DURATION_SECONDS * 1000;

  console.log(`\n📊 Testing: ${description}`);
  console.log(`   URL: ${url}`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log(`   Duration: ${DURATION_SECONDS}s\n`);

  const workers = Array(CONCURRENCY)
    .fill(null)
    .map(() => runWorker(url, stats, endTime));

  await Promise.all(workers);

  const avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
  const p50 = percentile(stats.latencies, 50);
  const p95 = percentile(stats.latencies, 95);
  const p99 = percentile(stats.latencies, 99);
  const rps = stats.requests / DURATION_SECONDS;
  const errorRate = (stats.errors / stats.requests) * 100;

  console.log(`   Results:`);
  console.log(`   ├─ Total Requests: ${stats.requests}`);
  console.log(`   ├─ Requests/sec:   ${rps.toFixed(1)}`);
  console.log(`   ├─ Error Rate:     ${errorRate.toFixed(2)}%`);
  console.log(`   ├─ Avg Latency:    ${avgLatency.toFixed(1)}ms`);
  console.log(`   ├─ P50 Latency:    ${p50.toFixed(1)}ms`);
  console.log(`   ├─ P95 Latency:    ${p95.toFixed(1)}ms`);
  console.log(`   └─ P99 Latency:    ${p99.toFixed(1)}ms`);

  // Performance targets from Phase 9 spec
  const targets = {
    '/health/live': { p99: 50, name: 'Health check' },
    '/api/v1/conversations': { p99: 200, name: 'API read' },
  };

  const target = targets[endpoint as keyof typeof targets];
  if (target) {
    const passed = p99 < target.p99;
    console.log(`\n   Target: P99 < ${target.p99}ms`);
    console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            Jack The Butler - Load Test                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check if server is running
  try {
    await fetch(`${BASE_URL}/health/live`);
  } catch {
    console.error(`\n❌ Cannot connect to ${BASE_URL}`);
    console.error('   Make sure the server is running: pnpm dev\n');
    process.exit(1);
  }

  // Run tests
  await runTest('/health/live', 'Health Check (liveness)');
  await runTest('/health/ready', 'Health Check (readiness)');

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Load Test Complete                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
