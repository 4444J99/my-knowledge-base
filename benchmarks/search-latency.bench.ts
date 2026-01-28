/**
 * Search Latency Benchmark
 * Performance tests for search operations
 *
 * Run with: npm run benchmark
 * These tests are NOT included in CI due to execution time
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FIXTURE_UNITS, getSortedUnits } from '../tests/fixtures/deterministic-units.js';

// Only run benchmarks when explicitly invoked
const BENCHMARK_ENABLED = process.env.RUN_BENCHMARKS === 'true';

describe.skipIf(!BENCHMARK_ENABLED)('Search Latency Benchmarks', () => {
  const iterations = 100;
  const results: number[] = [];

  beforeAll(() => {
    console.log(`\n📊 Running ${iterations} search iterations...`);
  });

  afterAll(() => {
    if (results.length > 0) {
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      const min = Math.min(...results);
      const max = Math.max(...results);
      const p95 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

      console.log('\n📈 Search Latency Results:');
      console.log(`   Average: ${avg.toFixed(2)}ms`);
      console.log(`   Min: ${min.toFixed(2)}ms`);
      console.log(`   Max: ${max.toFixed(2)}ms`);
      console.log(`   P95: ${p95.toFixed(2)}ms`);
    }
  });

  it('should complete in-memory search under 10ms', () => {
    const units = getSortedUnits();
    const query = 'react hooks typescript';

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      // Simple in-memory search simulation
      const searchResults = units.filter((unit) => {
        const searchText = `${unit.title} ${unit.content} ${unit.tags.join(' ')}`.toLowerCase();
        return query.split(' ').some((term) => searchText.includes(term));
      });

      const end = performance.now();
      results.push(end - start);
    }

    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    expect(avg).toBeLessThan(10); // Average should be under 10ms
  });

  it('should handle large result sets', () => {
    // Create a larger dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      ...FIXTURE_UNITS[i % FIXTURE_UNITS.length],
      id: `large-unit-${i}`,
    }));

    const start = performance.now();
    const filtered = largeDataset.filter((u) => u.type === 'insight');
    const end = performance.now();

    expect(filtered.length).toBeGreaterThan(0);
    expect(end - start).toBeLessThan(50); // Should complete in under 50ms
  });
});

describe.skipIf(!BENCHMARK_ENABLED)('Memory Usage Benchmarks', () => {
  it('should not exceed memory limits with 10k units', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Create 10k units
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      ...FIXTURE_UNITS[i % FIXTURE_UNITS.length],
      id: `memory-unit-${i}`,
      content: FIXTURE_UNITS[i % FIXTURE_UNITS.length].content.repeat(10), // Make content larger
    }));

    const afterCreation = process.memoryUsage().heapUsed;
    const memoryUsedMB = (afterCreation - initialMemory) / 1024 / 1024;

    console.log(`\n💾 Memory used for 10k units: ${memoryUsedMB.toFixed(2)} MB`);

    // Should use less than 100MB for 10k units
    expect(memoryUsedMB).toBeLessThan(100);

    // Cleanup
    largeDataset.length = 0;
  });
});
