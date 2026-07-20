# Open-source readiness

This repository remains private and intentionally uses version `0.0.0` with
`private: true`. Do not publish it until every open gate below is closed.

## Completed review

- MIT license, contribution guide, code of conduct, governance, security,
  support, roadmap, changelog, maintainer policy, issue forms, and CODEOWNERS
  are present.
- The public API, storage format, threat model, performance limitations, and
  W3C exclusions are documented.
- A clean Windows clone completes `npm ci && npm run check`; line endings are
  repository-controlled.
- The npm name `sparql-d1` was unclaimed when checked on 2026-07-19.
- `npm audit` reports zero known vulnerabilities, the production dependency
  license allowlist passes, and Gitleaks 8.30.1 finds no secrets in history.
- GitHub Actions dependencies are pinned to immutable commit SHAs.
- Package metadata names the exact source repository, public access policy,
  and provenance setting; tagged releases verify SemVer/changelog alignment,
  generate an SBOM and checksums, attest all artifacts, and publish only after
  the repository becomes public.
- GitHub vulnerability alerts and automated security fixes are enabled.
- Repository text contains no local filesystem paths or private email
  addresses. Required public files, immutable Action references, local-path
  hygiene, and release wiring are enforced by `npm run readiness:check`.
- A packed artifact passed the query/update acceptance sequence in a private
  Codex Site against its real managed D1 binding.
- GitHub-hosted CI and Security workflows pass on the current private main
  branch, including Node 22 and 24, W3C conformance, benchmarks, audit,
  Gitleaks, and CodeQL SARIF verification with zero findings.

## Release gates

- [x] Pass the end-to-end query/update suite in a deployed Codex Site with a
      real managed D1 binding; evidence is in `docs/deployed-e2e.md`.
- [x] Require green GitHub-hosted CI and Security workflows. While private code
      scanning publication is unavailable, CI retains CodeQL SARIF as an
      artifact and fails if it contains findings; publication switches on
      automatically when the repository becomes public.
- [ ] Enable main-branch protection or a ruleset. GitHub currently returns 403
      for branch protection on this private repository/account plan.
- [ ] Have a second developer follow the Codex Sites example from a fresh
      project using `docs/integration-validation.md` and record any corrections.
- [ ] Choose `0.1.0`, remove `private: true`, confirm npm ownership and package
      trusted-publisher configuration. The provenance-bearing publish step is
      already gated on public repository visibility.
- [ ] Review the initial public issue/discussion policy and add a second
      maintainer or explicitly accept the current bus-factor risk.

The remaining operational gates are not package correctness claims.
