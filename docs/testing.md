# Testing strategy

The repository uses layered evidence rather than treating one green suite as
proof of the entire system.

| Layer         | Evidence                                                            |
| ------------- | ------------------------------------------------------------------- |
| Term codec    | Examples plus generated Unicode literal cases                       |
| RDF/JS source | Every one of the 16 quad-pattern binding masks                      |
| Storage       | Strict schema, uniqueness, named/default graph behavior             |
| Differential  | Identical Comunica queries over D1 and an N3 reference store        |
| Protocol      | GET, POST, formats, status codes, limits, auth, federation policy   |
| Update        | Explicit opt-in, transaction completion, subsequent read visibility |
| D1            | Miniflare/workerd D1 binding rather than only a SQL mock            |
| Deployment    | Wrangler Worker dry-run bundle with `nodejs_compat`                 |
| Performance   | Deterministic dataset, p50/p95 latency, source-call count           |

Coverage gates are 90% for statements, branches, functions, and lines. Type
declarations and the export-only barrel are excluded because execution
coverage is not meaningful for them.

Before the first public release, the applicable W3C RDF and SPARQL manifests
must be vendored or fetched by a checksum-pinned conformance job. Every skipped
manifest entry must appear in `docs/conformance.md` with its scope and reason.
