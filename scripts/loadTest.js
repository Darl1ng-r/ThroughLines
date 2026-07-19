import http from 'http'
import https from 'https'

/**
 * ThroughLines Performance & Concurrent Load Benchmark
 * Simulates concurrent client requests measuring latency distribution and throughput.
 */

const TARGET_URL = process.env.LOAD_TEST_URL || 'http://localhost:5173'
const CONCURRENT_CLIENTS = Number(process.env.CONCURRENCY || 50)
const TOTAL_REQUESTS = Number(process.env.REQUESTS || 200)

console.log(`🚀 Starting ThroughLines Load Test`)
console.log(`📍 Target: ${TARGET_URL}`)
console.log(`👥 Concurrent Clients: ${CONCURRENT_CLIENTS}`)
console.log(`📊 Total Requests: ${TOTAL_REQUESTS}\n`)

let completedRequests = 0
let successfulRequests = 0
let failedRequests = 0
const latencies = []
const startTime = Date.now()

function sendRequest(requestId) {
  const reqStart = Date.now()
  const lib = TARGET_URL.startsWith('https') ? https : http

  const req = lib.get(TARGET_URL, (res) => {
    res.on('data', () => {})
    res.on('end', () => {
      const duration = Date.now() - reqStart
      latencies.push(duration)
      if (res.statusCode >= 200 && res.statusCode < 400) {
        successfulRequests++
      } else {
        failedRequests++
      }
      onDone()
    })
  })

  req.on('error', (err) => {
    failedRequests++
    onDone()
  })

  req.end()
}

function onDone() {
  completedRequests++
  if (completedRequests < TOTAL_REQUESTS) {
    sendRequest(completedRequests)
  } else if (completedRequests === TOTAL_REQUESTS) {
    printReport()
  }
}

function printReport() {
  const totalDurationMs = Date.now() - startTime
  const rps = ((successfulRequests / totalDurationMs) * 1000).toFixed(2)
  latencies.sort((a, b) => a - b)

  const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length || 0).toFixed(2)
  const min = latencies[0] || 0
  const max = latencies[latencies.length - 1] || 0
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📈 LOAD TEST BENCHMARK RESULTS`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`⏱️ Total Time Elapsed  : ${(totalDurationMs / 1000).toFixed(2)} seconds`)
  console.log(`✅ Successful Requests : ${successfulRequests} / ${TOTAL_REQUESTS}`)
  console.log(`❌ Failed Requests     : ${failedRequests}`)
  console.log(`🚀 Requests / Second   : ${rps} req/sec`)
  console.log(`-----------------------------------------------------`)
  console.log(`📊 LATENCY DISTRIBUTION (ms):`)
  console.log(`   Min Latency        : ${min} ms`)
  console.log(`   Average Latency    : ${avg} ms`)
  console.log(`   50th Percentile (p50): ${p50} ms`)
  console.log(`   95th Percentile (p95): ${p95} ms`)
  console.log(`   99th Percentile (p99): ${p99} ms`)
  console.log(`   Max Latency        : ${max} ms`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
}

// Spawn initial batch of concurrent workers
const initialBatch = Math.min(CONCURRENT_CLIENTS, TOTAL_REQUESTS)
for (let i = 0; i < initialBatch; i++) {
  sendRequest(i)
}
