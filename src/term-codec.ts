import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

type EncodedTerm =
  | { t: 'NamedNode' | 'BlankNode' | 'Variable'; v: string }
  | { t: 'Literal'; v: string; l: string; d: string }
  | { t: 'DefaultGraph' }
  | {
      t: 'Quad';
      s: EncodedTerm;
      p: EncodedTerm;
      o: EncodedTerm;
      g: EncodedTerm;
    };

const factory = new DataFactory();

function toEncoded(term: RDF.Term): EncodedTerm {
  switch (term.termType) {
    case 'NamedNode':
    case 'BlankNode':
    case 'Variable':
      return { t: term.termType, v: term.value };
    case 'Literal':
      return {
        t: 'Literal',
        v: term.value,
        l: term.language,
        d: term.datatype.value,
      };
    case 'DefaultGraph':
      return { t: 'DefaultGraph' };
    case 'Quad':
      return {
        t: 'Quad',
        s: toEncoded(term.subject),
        p: toEncoded(term.predicate),
        o: toEncoded(term.object),
        g: toEncoded(term.graph),
      };
    default:
      throw new TypeError(
        `Unsupported RDF term type: ${(term as RDF.Term).termType}`,
      );
  }
}

function fromEncoded(encoded: EncodedTerm): RDF.Term {
  switch (encoded.t) {
    case 'NamedNode':
      return factory.namedNode(encoded.v);
    case 'BlankNode':
      return factory.blankNode(encoded.v);
    case 'Variable':
      return factory.variable(encoded.v);
    case 'Literal':
      return encoded.l
        ? factory.literal(encoded.v, encoded.l)
        : factory.literal(encoded.v, factory.namedNode(encoded.d));
    case 'DefaultGraph':
      return factory.defaultGraph();
    case 'Quad':
      return factory.quad(
        fromEncoded(encoded.s) as RDF.Quad_Subject,
        fromEncoded(encoded.p) as RDF.Quad_Predicate,
        fromEncoded(encoded.o) as RDF.Quad_Object,
        fromEncoded(encoded.g) as RDF.Quad_Graph,
      );
  }
}

export interface StoredTerm {
  key: string;
  json: string;
}

export function encodeTerm(term: RDF.Term): StoredTerm {
  const json = JSON.stringify(toEncoded(term));
  return { key: json, json };
}

export function decodeTerm(json: string): RDF.Term {
  return fromEncoded(JSON.parse(json) as EncodedTerm);
}
