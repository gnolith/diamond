# Conformance scope

## Target

- RDF/JS Source and Store interfaces
- RDF 1.2 data model terms used by RDF/JS
- SPARQL 1.1 Query and Update behavior supported by Comunica
- SPARQL Protocol query operations and standard result serialization

## Planned exclusions for the initial release

| Area                          | Reason                                         |
| ----------------------------- | ---------------------------------------------- |
| Entailment regimes            | No inference layer is provided                 |
| Graph Store HTTP Protocol     | The package exposes SPARQL Protocol only       |
| Federated `SERVICE` execution | Disabled by default as an SSRF boundary        |
| Service Description           | Deferred until endpoint capabilities stabilize |

This file is a scope declaration, not yet a conformance report. The release
gate remains incomplete until the manifest runner and machine-readable report
are committed and passing in CI.
