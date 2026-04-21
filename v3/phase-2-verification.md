# Phase 2 Verification

Last updated: 2026-04-21

This document is the acceptance and evidence note for the shipped `phase 2` MCP surface:

- `prompts`
- `completions`

## Scope

Phase 2 closes the guided workflow and prompt-entry gap for Dokploy by shipping:

- five guided prompts:
  - `deploy-application`
  - `diagnose-deployment`
  - `review-project-infrastructure`
  - `rotate-database-password-preview`
  - `triage-project-logs`
- bounded prompt argument completions for common Dokploy identifiers and enums
- reusable `dokploy://...` resource links inside prompt outputs where they add value
- stale-target fallback guidance instead of opaque prompt failures

## Verification Matrix

### Unit coverage

- `tests/completions-runtime.test.ts`
- `tests/prompts-runtime.test.ts`

### Adversarial coverage

- `tests/phase2-adversarial.test.ts`

This file covers the Phase 2 edge cases that are easy to get wrong:

- unsupported `kind` + `passwordType` combinations fail closed before backend access
- `passwordType` completions disappear for database kinds that do not support them
- non-dotted preview procedures still render a safe `dokploy.call(...)` snippet
- preview input templates are redacted even when the backend preview metadata includes a password
- plain `not found` errors still degrade into stale-target guidance

### Integration coverage

- `tests/prompts-protocol.test.ts`
- `tests/codemode-protocol.test.ts`
- `tests/server.test.ts`
- `tests/server-entry-options.test.ts`
- `tests/http-options.test.ts`
- `tests/http-server.test.ts`
- `tests/rawmode.test.ts`

These tests verify that the Phase 2 capability layer works across:

- Code Mode
- raw mode
- hybrid mode
- HTTP transport
- staged capability flags
- prompt discovery, rendering, validation, and completion requests

## Verification Commands

Use the dedicated Phase 2 checks:

```bash
npm run test:phase2
npm run test:phase2:coverage
```

Use the full repository checks:

```bash
npm test
npm run test:coverage
npm run lint
npm run typecheck
```

## Latest Evidence

Validated on 2026-04-21 with the following results:

### Phase 2 verification gate

Command:

```bash
npm run test:phase2:coverage
```

Result:

- `10` Phase 2 verification files passed
- `109` tests passed
- coverage on the dedicated Phase 2 slice:
  - statements: `92.64%`
  - branches: `83.75%`
  - functions: `92.48%`
  - lines: `92.97%`

### Fast Phase 2 recheck

Command:

```bash
npm run test:phase2
```

Result:

- `10` test files passed
- `109` tests passed

### Full repository validation

Commands:

```bash
npm run test:coverage
npm run lint
npm run typecheck
```

Results:

- `npm run test:coverage`: `36` test files passed, `389` tests passed
- full repository coverage after this Phase 2 closeout:
  - statements: `88.02%`
  - branches: `77.39%`
  - functions: `93.59%`
  - lines: `88.59%`
- `npm run lint`: passed
- `npm run typecheck`: passed

## Interpretation

The dedicated Phase 2 slice now clears the requested `90%` level for statements, functions, and
lines while covering unit, adversarial, and integration paths for the shipped prompt/completion
surface.

The broader repository still includes unrelated modules below that bar, so the full-repo coverage
number remains lower than the Phase 2 verification slice. That does not block the `phase 2`
acceptance claim, but it is the main coverage gap left outside this scope.
