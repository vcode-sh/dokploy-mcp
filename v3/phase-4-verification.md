# Phase 4 Verification

Last updated: 2026-04-21

This document is the acceptance and evidence note for the shipped `phase 4` MCP surface:

- `tasks`

## Scope

Phase 4 closes the long-running workflow gap by shipping:

- staged `tasks` capability wiring with `tasks/list`, `tasks/get`, `tasks/result`, and
  `tasks/cancel`
- in-process task storage with bounded TTLs and explicit poll intervals
- task-aware `execute` support for:
  - long-running raw JavaScript `execute.code` runs
  - guided `execute.workflow` deploy runs
- safe cancellation and shutdown cleanup for in-flight task-backed work
- task-aware deploy rollout polling plus documented raw execute task recipes for redeploy,
  rollback, log-follow, wait, and batch flows

## Verification Matrix

### Unit coverage

- `tests/phase4-runtime.test.ts`
- `tests/phase4-execute-tool.test.ts`

These files cover:

- task TTL and poll interval normalization
- cancellation result shaping
- shutdown cleanup of in-flight tasks
- task handler fallback behavior without a bound server runtime
- task-backed raw `execute.code` runs respecting the configured sandbox runtime instead of
  hard-forcing subprocess execution
- task metadata on the public `execute` tool contract

### Adversarial coverage

- `tests/phase4-adversarial.test.ts`

This file covers the Phase 4 edge cases that are easy to get wrong:

- sandbox task failures store fetchable failed task results instead of crashing the runtime
- guided deploy task failures after task creation still terminate cleanly and return bounded errors

### Integration coverage

- `tests/phase4-execute-workflow.test.ts`
- `tests/http-server.test.ts`
- `tests/server.test.ts`
- `tests/rawmode.test.ts`
- `tests/server-entry-options.test.ts`
- `tests/http-options.test.ts`
- `tests/codemode-contract.test.ts`
- `tests/codemode-protocol.test.ts`
- `tests/codemode-protocol-tools-list.test.ts`
- `tests/codemode-budget.test.ts`
- `tests/codemode-execute.integration.test.ts`

These tests verify that the Phase 4 capability layer works across:

- Code Mode and hybrid mode registration
- staged capability flag parsing and health serialization
- Streamable HTTP transport
- task-backed raw execute runs
- guided deploy workflows with task-aware preflight and rollout polling
- `tasks/list`, `tasks/get`, `tasks/result`, and `tasks/cancel`
- shutdown-safe cleanup for in-flight task state
- default contract and tools/list budget preservation

## Verification Commands

Use the dedicated Phase 4 checks:

```bash
npm run test:phase4
npm run test:phase4:coverage
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

## Latest Evidence

Validated on 2026-04-21 with the following results:

### Phase 4 verification gate

Command:

```bash
npm run test:phase4:coverage
```

Result:

- `19` verification files passed
- `152` tests passed
- coverage on the dedicated Phase 4 slice:
  - statements: `97.01%`
  - branches: `88.96%`
  - functions: `100%`
  - lines: `97.00%`

The dedicated Phase 4 coverage slice intentionally focuses on the new task runtime plus the
protocol wiring that makes the staged `tasks` capability observable and controllable. The broader
task-backed `execute` and deploy workflow behavior is still covered by the integration and
adversarial tests listed above.

### Fast Phase 4 recheck

Command:

```bash
npm run test:phase4
```

Result:

- `19` test files passed
- `152` tests passed

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
- `npm test`: `45` test files passed, `447` tests passed
- `npm run test:coverage`: full repository coverage after the Phase 4 closeout:
  - statements: `88.75%`
  - branches: `78.02%`
  - functions: `93.98%`
  - lines: `89.28%`
- `npm run ci:budgets`: passed
  - `tools/list` payload: `5829` bytes / `1457` approximate tokens

## Interpretation

The dedicated Phase 4 slice clears the requested `90%` level for statements, functions, and lines,
and clears the `85%` branch bar while covering unit, adversarial, integration, HTTP transport, and
protocol registration paths for the shipped `tasks` surface.

Full-repository coverage remains lower because unrelated modules outside the dedicated Phase 4 slice
still carry older coverage debt. That does not block the `phase 4` acceptance claim, but it
remains the main non-Phase-4 coverage gap in the repository.
