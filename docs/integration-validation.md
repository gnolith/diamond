# Independent Codex Sites integration validation

This checklist is intentionally executable by an independent validator who did
not author the package. A context-free agent in a separate task is acceptable
for the experimental `0.1.0` technical sign-off when it receives only the
artifact and public documentation. Record whether the validator is a person or
agent, the date, package commit and hash, Sites starter version, and every
documentation correction in the pull request or issue used for sign-off.

## Maintainer preparation

From the release-candidate commit, the maintainer runs:

```sh
npm ci
npm run check
npm pack
```

The last command creates `sparql-d1-0.1.0.tgz`. Record its SHA-256, then give
the validator only the archive and the repository's public-facing README,
example, and documentation. Do not give the validator an existing source
checkout, configured Site, implementation discussion, or unpublished
workaround.

## Validator setup

Start in a fresh directory and new Codex task with no inherited project
context. Copy the supplied archive into a `vendor/` directory in a new Codex
Sites project and install it:

```sh
npm install ./vendor/sparql-d1-0.1.0.tgz
```

Do not use `npm install sparql-d1` until the package has actually been
published. Do not install the Git repository directly; generated `dist` files
are deliberately not committed.

An agent validator should receive the prompt in `docs/clean-room-agent-prompt.md`
verbatim, with only the artifact path and evidence-output location filled in.

## Add the endpoint

Copy these paths from `examples/codex-site`, preserving their relative paths:

- `.openai/hosting.json`
- `app/api/sparql/route.ts`
- `app/api/sparql/admin/route.ts` only for temporary writable validation
- `drizzle/0000_rdf_quads.sql`

Set the secret runtime value `SPARQL_TOKEN`. Keep the site owner-only during
validation, then build and deploy through the normal Codex Sites workflow.

## Acceptance checks

Record evidence for each item:

- The site builds without Node-only module initialization errors.
- An unauthenticated query receives HTTP 401.
- An authenticated `ASK {}` receives HTTP 200 and SPARQL Results JSON.
- A `SERVICE <https://example.invalid/>` query receives HTTP 403.
- A remote `LOAD <https://example.invalid/data.ttl>` update receives HTTP 403,
  including on the temporary writable validation route.
- D1 contains the strict `rdf_quads` table and four covering indexes.
- If testing the authenticated admin route, a named-graph insert is visible to
  a later SELECT and can be removed. Configure its distinct
  `SPARQL_ADMIN_TOKEN`, then remove the route after validation unless the site
  requires an owner-only administrative endpoint.

For a temporary write-enabled validation endpoint, run the repository's
`scripts/deployed-e2e.mjs` as documented in `docs/deployed-e2e.md`.

## Sign-off record

- Validator and type (person / independent agent):
- Date:
- Package commit:
- Package SHA-256:
- Sites starter/version:
- Deployment URL or evidence location:
- Corrections made:
- Result: pass / fail
