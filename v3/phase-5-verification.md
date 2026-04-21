# Phase 5 Verification

Last updated: 2026-04-21

This document is the acceptance and evidence note for the shipped `phase 5` MCP surface:

- registry-native remote metadata
- pragmatic remote auth for Streamable HTTP

## Scope

Phase 5 closes the remote productization gap by shipping:

- root `server.json` metadata with:
  - npm package install metadata for local `stdio`
  - Streamable HTTP `remotes` metadata for hosted use
  - registry-facing title, website, repository, and icon metadata
- a declared hosted credential contract based on:
  - `X-Dokploy-Url`
  - `X-Dokploy-Api-Key`
- request-scoped HTTP credential resolution that keeps local `stdio` behavior unchanged
- session-bound credential isolation for hosted HTTP clients
- origin validation and preflight handling for browser-based hosted clients
- optional local config fallback for single-tenant HTTP deployments

## Verification Matrix

### Unit coverage

- `tests/phase5-metadata.test.ts`
- `tests/phase5-adversarial.test.ts`
- `tests/client.test.ts`
- `tests/config.test.ts`
- `tests/config-types.unit.test.ts`
- `tests/http-options.test.ts`
- `tests/http-request-handler.test.ts`
- `tests/http-request-handler-phase5-errors.test.ts`
- `tests/server-entry-options.test.ts`

These files cover:

- `server.json` shape, version sync, remote URL variables, and header metadata
- request-scoped config overrides and fallback precedence
- API client cache isolation per resolved Dokploy credential set
- remote auth parser behavior for HTTP options and CLI/env startup flags
- origin validation, preflight handling, malformed header input, and fail-closed auth behavior

### Adversarial coverage

- `tests/phase5-adversarial.test.ts`

This file covers the Phase 5 edge cases that are easy to get wrong:

- malformed remote URL headers fail closed before the request reaches the runtime
- missing browser `Origin` data on preflight requests is rejected explicitly
- wildcard / allowlisted origin behavior stays bounded
- session-bound credentials reject mismatched follow-up requests instead of silently switching

### Integration coverage

- `tests/http-server.test.ts`
- `tests/server.test.ts`
- `tests/rawmode.test.ts`
- `tests/codemode-contract.test.ts`
- `tests/codemode-protocol.test.ts`
- `tests/codemode-protocol-tools-list.test.ts`
- `tests/codemode-budget.test.ts`

These tests verify that the Phase 5 remote layer works across:

- Code Mode and hybrid mode
- Streamable HTTP session creation, reuse, reconnect, and shutdown
- remote header precedence over local HTTP fallback config
- isolation between concurrent sessions with different Dokploy credentials
- browser-origin rejection and explicit allowlist-based preflight success
- unchanged default `search` / `execute` contract and `tools/list` budget posture

## Verification Commands

Use the dedicated Phase 5 checks:

```bash
npm run test:phase5
npm run test:phase5:coverage
```

Use the full repository checks:

```bash
npm run typecheck
npm run lint
npm run build
npm run docs:check:facts
npm test
npm run test:coverage
npm run ci:budgets
```

## Operator Documentation

The public operator guide for the shipped remote surface lives in
[../docs/remote-http.md](../docs/remote-http.md).

## Latest Evidence

Validated on 2026-04-21 with the following results:

### Phase 5 verification gate

Command:

```bash
npm run test:phase5:coverage
```

Result:

- `16` verification files passed
- `175` tests passed
- coverage on the dedicated Phase 5 slice:
  - statements: `97.79%`
  - branches: `91.66%`
  - functions: `95.91%`
  - lines: `99.61%`

### Fast Phase 5 recheck

Command:

```bash
npm run test:phase5
```

Result:

- `16` test files passed
- `175` tests passed

### Full repository validation

Commands:

```bash
npm run typecheck
npm run lint
npm run build
npm run docs:check:facts
npm test
npm run test:coverage
npm run ci:budgets
```

Results:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run docs:check:facts`: passed
- `npm test`: `49` test files passed, `495` tests passed
- `npm run test:coverage`: full repository coverage after the Phase 5 closeout:
  - statements: `90.07%`
  - branches: `79.45%`
  - functions: `94.23%`
  - lines: `90.48%`
- `npm run ci:budgets`: passed
  - `tools/list` payload: `5829` bytes / `1457` approximate tokens

## Interpretation

The dedicated Phase 5 slice is now well above the requested `90%` bar across statements, branches,
functions, and lines while covering unit, adversarial, integration, remote metadata, origin
validation, credential precedence, and concurrent hosted-session isolation paths.

The full repository also now clears `90%` for statements and lines, while branch coverage remains
lower because of older debt outside the Phase 5 scope.
