# Codex Sites example

Copy the route into a Sites project, set the logical D1 binding to `DB`, apply
the package migration, and configure `SPARQL_TOKEN` through Sites runtime
values. Do not commit the token or place it in `.openai/hosting.json`.

The example deliberately fails closed when no token is configured. A real site
may replace the bearer check with its existing identity and authorization
layer.
