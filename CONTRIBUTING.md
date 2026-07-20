# Contributing

The project is private during its initial development. External contribution
instructions become active when the repository is opened.

## Development workflow

1. Create a focused branch from `main`.
2. Add or update tests before changing observable behavior.
3. Run `npm run check` and `npm run benchmark`.
4. Update architecture, security, conformance, and changelog documents when
   their contracts change.
5. Open a pull request explaining the behavior, evidence, risks, and any
   compatibility implications.

Changes to storage keys, migration history, RDF semantics, public exports,
security defaults, or result formats require maintainer review. Performance
optimizations must be compared with the reference path through differential
tests.

Contributions are accepted under the repository's MIT License. Contributors
certify that they have the right to submit their work under that license.
