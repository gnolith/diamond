import { Miniflare } from 'miniflare';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { D1QuadSource, insertQuads } from '../src/d1-source.js';
import type { D1DatabaseLike } from '../src/d1-types.js';
import { initializeStore } from '../src/schema.js';

const factory = new DataFactory();

function collect(stream: RDF.Stream<RDF.Quad>): Promise<RDF.Quad[]> {
  return new Promise((resolve, reject) => {
    const quads: RDF.Quad[] = [];
    stream.on('data', (quad) => quads.push(quad));
    stream.on('end', () => resolve(quads));
    stream.on('error', reject);
  });
}

describe('workerd D1 integration', () => {
  let miniflare: Miniflare;
  let db: D1DatabaseLike;

  beforeAll(async () => {
    miniflare = new Miniflare({
      modules: true,
      script: 'export default { fetch() { return new Response("ok") } }',
      compatibilityDate: '2026-07-19',
      compatibilityFlags: ['nodejs_compat'],
      d1Databases: { DB: 'sparql-d1-test' },
    });
    db = (await miniflare.getD1Database('DB')) as unknown as D1DatabaseLike;
    await initializeStore(db);
  });

  afterAll(async () => miniflare.dispose());

  it('executes schema, transactional writes, and pattern reads through D1', async () => {
    const subject = factory.namedNode('https://example.test/real-d1');
    await insertQuads(db, [
      factory.quad(
        subject,
        factory.namedNode('https://example.test/name'),
        factory.literal('D1'),
      ),
    ]);
    const source = new D1QuadSource(db);
    await expect(source.countQuads(subject)).resolves.toBe(1);
    await expect(collect(source.match(subject))).resolves.toHaveLength(1);
  });
});
