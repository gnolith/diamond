import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  expectedStoreIndexes,
  initializeStore,
  inspectStoreSchema,
} from '../src/schema.js';
import { MemoryD1 } from './memory-d1.js';

describe('store schema inspection', () => {
  let db: MemoryD1;

  beforeEach(() => {
    db = new MemoryD1();
  });

  afterEach(() => db.close());

  it('verifies the strict table and every covering index in catalog order', async () => {
    await initializeStore(db);
    await expect(inspectStoreSchema(db)).resolves.toEqual({
      table: {
        name: 'rdf_quads',
        sql: expect.stringMatching(/\)\s*STRICT$/u),
        strict: true,
      },
      indexes: expectedStoreIndexes,
      valid: true,
      errors: [],
    });
  });

  it('reports missing and malformed catalog objects', async () => {
    const missing = await inspectStoreSchema(db);
    expect(missing.valid).toBe(false);
    expect(missing.errors).toContain('rdf_quads table is missing');

    await initializeStore(db);
    await db.prepare('DROP INDEX rdf_quads_spog_idx').run();
    const malformed = await inspectStoreSchema(db);
    expect(malformed.valid).toBe(false);
    expect(malformed.errors).toContain(
      'rdf_quads_spog_idx has columns [], expected [subject_key, predicate_key, object_key, graph_key]',
    );
  });
});
