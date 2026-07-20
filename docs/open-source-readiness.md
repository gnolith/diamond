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
- GitHub vulnerability alerts and automated security fixes are enabled.
- Repository text contains no local filesystem paths or private email
  addresses.

## Release gates

- [ ] Authenticate Wrangler and pass the same end-to-end query/update suite
      against a deployed Worker with a real remote D1 binding.
- [ ] Resolve the GitHub-hosted runner `startup_failure` at the account or
      billing-policy level, then require green CI and Security workflows.
- [ ] Enable main-branch protection or a ruleset. GitHub currently returns 403
      for branch protection on this private repository/account plan.
- [ ] Have a second developer follow the Codex Sites example from a fresh
      project and record any documentation corrections.
- [ ] Choose `0.1.0`, remove `private: true`, confirm npm ownership and package
      metadata, and enable the documented provenance-bearing publish step.
- [ ] Review the initial public issue/discussion policy and add a second
      maintainer or explicitly accept the current bus-factor risk.

The first three gates are operational controls, not package correctness claims.
The repository must not advertise production deployment validation until the
remote-D1 gate has actually run.
