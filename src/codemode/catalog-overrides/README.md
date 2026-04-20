# Catalog Overrides Module

This folder contains the internal hint inventory behind
[src/codemode/overrides/catalog-overrides.ts](../overrides/catalog-overrides.ts).

Design rules:

- `src/codemode/overrides/catalog-overrides.ts` remains the stable facade
- files here should stay grouped by hint concern, not by arbitrary size
- changes must preserve search and catalog discovery behavior

Structure:

- `types.ts`: shared hint types
- `builders.ts`: shared hint construction helpers
- `core-hints.ts`: application, project, deployment, compose, and other core API hints
- `security-hints.ts`: secret-bearing and security-related read hints
- `settings-hints.ts`: settings and infrastructure hints
- `runtime-hints.ts`: logs, runtime status, and AI hints
- `index.ts`: assembled hint map and exported helpers
