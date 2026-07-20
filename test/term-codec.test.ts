import { DataFactory } from 'rdf-data-factory';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeTerm, encodeTerm } from '../src/term-codec.js';

const factory = new DataFactory();

describe('term codec', () => {
  const terms = [
    factory.namedNode('https://example.test/resource/é'),
    factory.blankNode('b1'),
    factory.literal('plain'),
    factory.literal('bonjour', 'fr'),
    factory.literal(
      '42',
      factory.namedNode('http://www.w3.org/2001/XMLSchema#integer'),
    ),
    factory.defaultGraph(),
    factory.quad(
      factory.namedNode('https://example.test/s'),
      factory.namedNode('https://example.test/p'),
      factory.literal('quoted'),
    ),
  ];

  it.each(terms)('round-trips $termType terms', (term) => {
    const decoded = decodeTerm(encodeTerm(term).json);
    expect(decoded.equals(term)).toBe(true);
  });

  it('uses the encoded representation as a stable equality key', () => {
    const first = factory.literal('chat', 'fr');
    const second = factory.literal('chat', 'fr');
    const different = factory.literal('chat', 'en');
    expect(encodeTerm(first).key).toBe(encodeTerm(second).key);
    expect(encodeTerm(first).key).not.toBe(encodeTerm(different).key);
  });

  it('round-trips arbitrary Unicode literal values and language tags', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom('en', 'fr', 'zh-Hant'),
        (value, language) => {
          const term = factory.literal(value, language);
          expect(decodeTerm(encodeTerm(term).json).equals(term)).toBe(true);
        },
      ),
      { numRuns: 250 },
    );
  });
});
