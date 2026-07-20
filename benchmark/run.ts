import { performance } from 'node:perf_hooks';
import { DataFactory } from 'rdf-data-factory';
import { D1QuadSource, insertQuads } from '../src/d1-source.js';
import { initializeStore } from '../src/schema.js';
import { MemoryD1 } from '../test/memory-d1.js';

const factory = new DataFactory();
const ex = (value: string) =>
  factory.namedNode(`https://benchmark.test/${value}`);
const database = new MemoryD1();
await initializeStore(database);

const quads = Array.from({ length: 5_000 }, (_, index) =>
  factory.quad(
    ex(`person-${index % 1_000}`),
    ex(index % 2 === 0 ? 'name' : 'knows'),
    index % 2 === 0
      ? factory.literal(`Person ${index}`)
      : ex(`person-${(index + 1) % 1_000}`),
  ),
);
await insertQuads(database, quads);

let calls = 0;
const source = new D1QuadSource(database, { observe: () => (calls += 1) });
const durations: number[] = [];

for (let iteration = 0; iteration < 30; iteration += 1) {
  const started = performance.now();
  const stream = source.match(ex(`person-${iteration}`), null, null, null);
  await new Promise<void>((resolve, reject) => {
    stream.on('data', () => undefined);
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  durations.push(performance.now() - started);
}

durations.sort((left, right) => left - right);
const percentile = (value: number) =>
  durations[Math.floor((durations.length - 1) * value)] ?? 0;

console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      datasetQuads: quads.length,
      iterations: durations.length,
      sourceCalls: calls,
      latencyMs: {
        p50: Number(percentile(0.5).toFixed(3)),
        p95: Number(percentile(0.95).toFixed(3)),
      },
    },
    null,
    2,
  ),
);

database.close();
