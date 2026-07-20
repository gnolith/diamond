import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const mode = process.argv[2] ?? 'summary';
assert.ok(['summary', 'earl'].includes(mode), `Unsupported output: ${mode}`);

const expected = 490;
const cache = '.rdf-test-suite-cache/';
const skip =
  '(entailment|service|federat|/protocol/|http-rdf-update|' +
  'agg-empty-group-count-graph|bindings/manifest#graph|constructwhere04|' +
  'exists03|exists-graph-variable|property-path/manifest#pp34|' +
  'property-path/manifest#pp35|subquery/manifest#subquery02)';

mkdirSync(cache, { recursive: true });

const args = [
  '-r',
  './conformance/preload-fetch.cjs',
  'node_modules/rdf-test-suite/bin/Runner.js',
  'conformance/engine.cjs',
  'https://w3c.github.io/rdf-tests/sparql/sparql11/manifest-all.ttl',
  '-c',
  cache,
  '-o',
  mode,
  '-d',
  '15000',
  '--skip',
  skip,
];

if (mode === 'earl') {
  args.push('-p', 'conformance/earl-meta.json');
}

const run = spawnSync(process.execPath, args, {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

if (run.stderr) process.stderr.write(run.stderr);
assert.equal(run.status, 0, `rdf-test-suite exited with ${run.status}`);

if (mode === 'summary') {
  process.stdout.write(run.stdout);
  assert.match(
    run.stdout,
    new RegExp(`${expected} / ${expected} tests succeeded!`),
    'Conformance suite did not execute the expected number of cases',
  );
} else {
  const passed = run.stdout.match(/earl:passed/g)?.length ?? 0;
  const failed = run.stdout.match(/earl:failed/g)?.length ?? 0;
  assert.equal(passed, expected, 'EARL report has an unexpected pass count');
  assert.equal(failed, 0, 'EARL report contains failed assertions');
  writeFileSync('conformance-earl.ttl', run.stdout);
  console.log(`wrote ${passed} passing EARL assertions`);
}
