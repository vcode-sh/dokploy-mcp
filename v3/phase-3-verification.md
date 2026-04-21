# Phase 3 Verification

Last updated: 2026-04-21

This document is the acceptance and evidence note for the shipped `phase 3` MCP surface:

- `sampling`
- `elicitation`

## Scope

Phase 3 closes the MCP-native interactive workflow gap by shipping:

- guided `execute.workflow` support for `deploy-application`
- bounded deploy planning through `sampling/createMessage` when the client supports it
- form-mode `elicitation` for:
  - missing application identifiers
  - deployment intent
  - preview vs apply choice
  - bounded rollout options
- URL-mode `elicitation` for out-of-band approval handoff
- deterministic preview and needs-input fallbacks when a client does not support these capabilities

## Verification Matrix

### Unit coverage

- `tests/phase3-runtime.test.ts`
- `tests/phase3-schemas.test.ts`
- `tests/phase3-execute-tool.test.ts`

### Adversarial coverage

- `tests/phase3-adversarial.test.ts`

This file covers the Phase 3 edge cases that are easy to get wrong:

- malformed planner output falls back to the deterministic bounded plan
- invalid elicitation responses fail closed instead of crashing the workflow

### Integration coverage

- `tests/phase3-execute-workflow.test.ts`
- `tests/codemode-execute.integration.test.ts`
- `tests/codemode-contract.test.ts`
- `tests/codemode-protocol.test.ts`
- `tests/codemode-protocol-tools-list.test.ts`
- `tests/codemode-budget.test.ts`
- `tests/server.test.ts`
- `tests/server-entry-options.test.ts`
- `tests/http-options.test.ts`
- `tests/rawmode.test.ts`

These tests verify that the Phase 3 capability layer works across:

- Code Mode
- hybrid mode
- staged capability flags
- promptless `execute` workflows
- capability negotiation vs non-interactive fallback
- form and URL elicitation
- sampling-backed planning
- default contract and tool budget preservation

## Verification Commands

Use the dedicated Phase 3 checks:

```bash
npm run test:phase3
npm run test:phase3:coverage
```

Use the full repository checks:

```bash
npm run lint
npm run typecheck
npm run build
npm run docs:check:facts
npm test
npm run test:coverage
npm run ci:budgets
```

## Latest Evidence

Validated on 2026-04-21 with the following results:

### Phase 3 verification gate

Command:

```bash
npm run test:phase3:coverage
```

Result:

- `14` Phase 3 verification files passed
- `98` tests passed
- coverage on the dedicated Phase 3 slice:
  - statements: `96.56%`
  - branches: `86.05%`
  - functions: `98.92%`
  - lines: `96.54%`

### Fast Phase 3 recheck

Command:

```bash
npm run test:phase3
```

Result:

- `14` test files passed
- `98` tests passed

### Full repository validation

Commands:

```bash
npm run lint
npm run typecheck
npm run build
npm run docs:check:facts
npm test
npm run test:coverage
npm run ci:budgets
```

Results:

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run build`: passed
- `npm run docs:check:facts`: passed
- `npm test`: `41` test files passed, `428` tests passed
- `npm run test:coverage`: full repository coverage after the Phase 3 closeout:
  - statements: `88.68%`
  - branches: `78.06%`
  - functions: `94.17%`
  - lines: `89.21%`
- `npm run ci:budgets`: passed
  - `tools/list` payload: `5349` bytes / `1337` approximate tokens

## Interpretation

The dedicated Phase 3 slice now clears the requested `90%` level for statements, functions, and
lines while covering unit, adversarial, and integration paths for the shipped
`sampling`/`elicitation` surface.

Full-repository coverage remains lower because unrelated modules outside the Phase 3 slice still
carry older coverage debt. That does not block the `phase 3` acceptance claim, but it remains the
main non-Phase-3 coverage gap in the repository.
