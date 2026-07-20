import { DataFactory } from 'rdf-data-factory';
import type { QueryEngine } from '@comunica/query-sparql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSparqlHandler } from '../src/endpoint.js';
import { D1QuadSource, insertQuads } from '../src/d1-source.js';
import { initializeStore } from '../src/schema.js';
import { MemoryD1 } from './memory-d1.js';

const factory = new DataFactory();
const ex = (value: string) =>
  factory.namedNode(`https://example.test/${value}`);

describe('SPARQL HTTP handler', () => {
  let db: MemoryD1;
  let handle: ReturnType<typeof createSparqlHandler>;

  beforeEach(async () => {
    db = new MemoryD1();
    await initializeStore(db);
    await insertQuads(db, [
      factory.quad(ex('alice'), ex('name'), factory.literal('Alice')),
    ]);
    handle = createSparqlHandler({ db, exposeErrors: true });
  });

  afterEach(() => db.close());

  it('executes GET queries and serializes SPARQL Results JSON', async () => {
    const query = encodeURIComponent(
      'SELECT ?name WHERE { ?s <https://example.test/name> ?name }',
    );
    const response = await handle(
      new Request(`https://site.test/api/sparql?query=${query}`),
    );
    expect(response.status, await response.clone().text()).toBe(200);
    expect(response.headers.get('content-type')).toContain(
      'application/sparql-results+json',
    );
    const body = (await response.json()) as {
      results: { bindings: Array<{ name: { value: string } }> };
    };
    expect(body.results.bindings[0]?.name.value).toBe('Alice');
  });

  it('supports application/sparql-query POST requests', async () => {
    const response = await handle(
      new Request('https://site.test/api/sparql', {
        method: 'POST',
        headers: { 'content-type': 'application/sparql-query' },
        body: 'ASK { <https://example.test/alice> ?p ?o }',
      }),
    );
    expect(response.status, await response.clone().text()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ boolean: true });
  });

  it('negotiates RDF graph output', async () => {
    const query = encodeURIComponent('CONSTRUCT WHERE { ?s ?p ?o }');
    const response = await handle(
      new Request(`https://site.test/api/sparql?query=${query}`, {
        headers: { accept: 'application/n-triples' },
      }),
    );
    expect(response.status, await response.clone().text()).toBe(200);
    expect(response.headers.get('content-type')).toContain(
      'application/n-triples',
    );
    expect(await response.text()).toContain('https://example.test/alice');
  });

  it('is read-only by default', async () => {
    const response = await handle(
      new Request('https://site.test/api/sparql', {
        method: 'POST',
        headers: { 'content-type': 'application/sparql-update' },
        body: 'INSERT DATA { <x:s> <x:p> <x:o> }',
      }),
    );
    expect(response.status).toBe(403);
  });

  it('executes transactional updates only when explicitly enabled', async () => {
    handle = createSparqlHandler({ db, readOnly: false, exposeErrors: true });
    const update = await handle(
      new Request('https://site.test/api/sparql', {
        method: 'POST',
        headers: { 'content-type': 'application/sparql-update' },
        body: 'INSERT DATA { <https://example.test/bob> <https://example.test/name> "Bob" }',
      }),
    );
    expect(update.status, await update.clone().text()).toBe(204);
    await expect(new D1QuadSource(db).countQuads(ex('bob'))).resolves.toBe(1);

    const query = encodeURIComponent(
      'ASK { <https://example.test/bob> <https://example.test/name> "Bob" }',
    );
    const response = await handle(
      new Request(`https://site.test/api/sparql?query=${query}`),
    );
    await expect(response.json()).resolves.toMatchObject({ boolean: true });
  });

  it('rejects SERVICE clauses by default', async () => {
    const query = encodeURIComponent(
      'SELECT * WHERE { SERVICE <https://example.test/sparql> { ?s ?p ?o } }',
    );
    const response = await handle(
      new Request(`https://site.test/api/sparql?query=${query}`),
    );
    expect(response.status).toBe(403);
  });

  it('enforces authentication hooks', async () => {
    handle = createSparqlHandler({ db, authenticate: () => false });
    const response = await handle(
      new Request('https://site.test/api/sparql?query=ASK%20%7B%7D'),
    );
    expect(response.status).toBe(401);
  });

  it('allows authentication hooks to return a complete response', async () => {
    handle = createSparqlHandler({
      db,
      authenticate: () => new Response('rate limited', { status: 429 }),
    });
    const response = await handle(
      new Request('https://site.test/api/sparql?query=ASK%20%7B%7D'),
    );
    expect(response.status).toBe(429);
    await expect(response.text()).resolves.toBe('rate limited');
  });

  it('enforces query-size limits', async () => {
    handle = createSparqlHandler({ db, maxQueryBytes: 5 });
    const response = await handle(
      new Request('https://site.test/api/sparql?query=ASK%20%7B%7D'),
    );
    expect(response.status).toBe(413);
  });

  it('rejects unsupported result media types', async () => {
    const response = await handle(
      new Request('https://site.test/api/sparql?query=ASK%20%7B%7D', {
        headers: { accept: 'image/png' },
      }),
    );
    expect(response.status).toBe(406);
  });

  it('supports form-encoded queries and rejects form-encoded updates', async () => {
    const queryResponse = await handle(
      new Request('https://site.test/api/sparql', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ query: 'ASK {}' }),
      }),
    );
    expect(queryResponse.status).toBe(200);

    const updateResponse = await handle(
      new Request('https://site.test/api/sparql', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          update: 'INSERT DATA { <x:s> <x:p> <x:o> }',
        }),
      }),
    );
    expect(updateResponse.status).toBe(403);
  });

  it.each([
    [new Request('https://site.test/api/sparql'), 400],
    [new Request('https://site.test/api/sparql', { method: 'PUT' }), 405],
    [
      new Request('https://site.test/api/sparql', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'ASK {}',
      }),
      415,
    ],
  ] as const)(
    'returns protocol errors for malformed requests %#',
    async (request, status) => {
      await expect(handle(request)).resolves.toMatchObject({ status });
    },
  );

  it('rejects update query parameters in read-only mode', async () => {
    const update = encodeURIComponent('INSERT DATA { <x:s> <x:p> <x:o> }');
    const response = await handle(
      new Request(`https://site.test/api/sparql?update=${update}`),
    );
    expect(response.status).toBe(403);
  });

  it('rejects updates disguised with a query media type', async () => {
    const response = await handle(
      new Request('https://site.test/api/sparql', {
        method: 'POST',
        headers: { 'content-type': 'application/sparql-query' },
        body: 'INSERT DATA { <x:s> <x:p> <x:o> }',
      }),
    );
    expect(response.status).toBe(403);
  });

  it('enforces algebra operation and depth limits', async () => {
    const request = () =>
      new Request(
        'https://site.test/api/sparql?query=SELECT%20*%20WHERE%20%7B%3Fs%20%3Fp%20%3Fo%7D',
      );
    handle = createSparqlHandler({ db, maxAlgebraOperations: 0 });
    expect((await handle(request())).status).toBe(422);
    handle = createSparqlHandler({ db, maxAlgebraDepth: 1 });
    expect((await handle(request())).status).toBe(422);
  });

  it('classifies invalid SPARQL as a client error', async () => {
    const response = await handle(
      new Request('https://site.test/api/sparql?query=SELECT%20%7B'),
    );
    expect(response.status).toBe(400);
  });

  it('terminates serialized results at the configured byte limit', async () => {
    handle = createSparqlHandler({ db, maxResultBytes: 1 });
    const response = await handle(
      new Request(
        'https://site.test/api/sparql?query=SELECT%20*%20WHERE%20%7B%3Fs%20%3Fp%20%3Fo%7D',
      ),
    );
    expect(response.status).toBe(200);
    await expect(response.text()).rejects.toThrow('configured size limit');
  });

  it('times out stalled engine work and redacts unexpected errors', async () => {
    const stalled = {
      explain: () => new Promise(() => undefined),
    } as unknown as QueryEngine;
    handle = createSparqlHandler({ db, engine: stalled, timeoutMs: 1 });
    expect(
      (
        await handle(
          new Request('https://site.test/api/sparql?query=ASK%20%7B%7D'),
        )
      ).status,
    ).toBe(504);

    const broken = {
      explain: async () => {
        throw new Error('sensitive database detail');
      },
    } as unknown as QueryEngine;
    handle = createSparqlHandler({ db, engine: broken });
    const response = await handle(
      new Request('https://site.test/api/sparql?query=ASK%20%7B%7D'),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'SPARQL query execution failed',
    });
  });

  it('reports request observations', async () => {
    const observations: Array<{ status: number }> = [];
    handle = createSparqlHandler({
      db,
      observe: (observation) => observations.push(observation),
    });
    await handle(
      new Request('https://site.test/api/sparql?query=ASK%20%7B%7D'),
    );
    expect(observations).toMatchObject([{ status: 200 }]);
  });
});
