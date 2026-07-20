# Threat model

## Protected assets

- D1 data confidentiality and integrity
- Worker CPU, memory, subrequests, and database quotas
- Internal network and third-party endpoints reachable through `fetch`
- Authentication tokens and operational telemetry

## Trust boundaries

SPARQL text, HTTP headers, content negotiation, and authentication credentials
are untrusted. The D1 binding and package configuration are trusted host inputs.

## Primary threats and controls

| Threat                  | Default control                                          |
| ----------------------- | -------------------------------------------------------- |
| Unauthorized reads      | Host-provided authentication hook                        |
| Unauthorized writes     | Read-only endpoint; Update requires opt-in               |
| SSRF through federation | `SERVICE` rejected unless explicitly enabled             |
| Query explosion         | Query bytes, algebra depth/operation, and timeout limits |
| Oversized output        | Bounded serialized stream and cancellation               |
| SQL injection           | Fixed SQL structure and bound term keys                  |
| Cross-graph disclosure  | Host owns endpoint authorization and dataset scope       |
| Error disclosure        | Unexpected server errors are redacted by default         |
| Supply-chain compromise | Lockfile, dependency review, CodeQL, audit, Dependabot   |

## Residual risks

Algebra size is only a proxy for execution cost. Small property-path or join
queries can still be expensive. Public deployments should add platform rate
limits, per-principal authorization, logging, and conservative Worker limits.
Enabling `SERVICE` requires a destination allowlist and a fetch policy; the
boolean opt-in alone is not sufficient for an untrusted public endpoint.
