# Deployed Codex Sites validation

On 2026-07-19, the package was installed from its packed artifact into an
owner-only Codex Site and exercised against that site's managed D1 binding at
<https://sparql-d1-e2e-probe.kcsfelty.chatgpt.site/api/sparql>.

The acceptance sequence crossed the production HTTP and storage boundary on
every operation:

| Check                                                                     | Result                            |
| ------------------------------------------------------------------------- | --------------------------------- |
| SPARQL Update inserts a language-tagged literal into a named graph        | HTTP 204                          |
| SELECT reads it in a later request with value, language, and graph intact | HTTP 200, one binding             |
| CONSTRUCT serializes it as N-Triples                                      | HTTP 200, expected triple present |
| A federated SERVICE query without a policy is rejected                    | HTTP 403                          |
| DROP removes the temporary graph                                          | HTTP 204                          |

The first deployment exposed a Worker-only compatibility defect: a transitive
Comunica dependency evaluated Node's bare `__dirname` during module startup.
The endpoint now loads Comunica's static engine entry lazily after installing
the Workers-compatible global. A second saved version passed the complete
sequence. This failure is retained here because it demonstrates why a real
deployment test is part of the release process.

Warm Worker telemetry for the successful run recorded:

| Operation        | CPU time | Wall time |
| ---------------- | -------: | --------: |
| INSERT           |    10 ms |    132 ms |
| SELECT           |     8 ms |     89 ms |
| CONSTRUCT        |    12 ms |     94 ms |
| Rejected SERVICE |     3 ms |      3 ms |
| DROP cleanup     |     6 ms |    106 ms |

An earlier cold INSERT used 303 ms CPU and 626 ms wall time while the lazy
engine initialized. These numbers are observations from one private validation
deployment, not service-level guarantees. Worker logs did not expose heap or
D1 `rows_read`; the deterministic local benchmark reports heap, D1 calls,
returned rows, and latency separately.

Run the same destructive-but-self-cleaning probe against an authorized test
endpoint with:

```sh
SPARQL_ENDPOINT=https://example.test/api/sparql npm run test:deployed
```

For an authenticated endpoint, also set `SPARQL_AUTH_HEADER` and
`SPARQL_AUTH_TOKEN`. The script generates a unique graph and attempts cleanup
in `finally`. Do not point it at a read-only or production-data endpoint.
