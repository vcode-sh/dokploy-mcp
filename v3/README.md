# v3 Plan Package

Last updated: 2026-04-21

This folder is the authoritative planning and audit package for the current `v3` execution cycle.

It now reflects the shipped state after closing `phase 0`, `phase 1`, `phase 2`, `phase 3`,
`phase 4`, and `phase 5` in code.

## Current State

- package version: `3.0.0`
- generated Dokploy catalog: `524` procedures across `48` tags
- endpoint parity vs the official Dokploy root OpenAPI snapshot: reached
- default public MCP surface: `search`, `execute`
- optional server modes: `raw`, `hybrid`
- transports: `stdio`, `http`
- shipped staged MCP capability families: `resources`, `prompts`, `completions`, `sampling`,
  `elicitation`, `tasks`
- shipped remote packaging surface: `server.json`, npm package metadata, Streamable HTTP `remotes`
- shipped pragmatic remote auth contract: `X-Dokploy-Url` + `X-Dokploy-Api-Key`
- phase 5 verification command: `npm run test:phase5:coverage`
- latest measured phase 5 slice coverage: `97.79%` statements, `91.66%` branches, `95.91%`
  functions, `99.61%` lines
- docs fact sync status: current via `npm run docs:check:facts` after a successful build

## What Is Done

- Dokploy API catalog parity and generated SDK/runtime artifacts
- token-efficient default Code Mode with `search` and `execute`
- raw and hybrid endpoint-per-tool modes
- hardened Streamable HTTP transport and health endpoint
- compatibility-aware handling for older Dokploy backends
- broad regression, adversarial, integration, and budget coverage
- helper layer for repeated Dokploy workflows
- `phase 0` capability foundation:
  - modular capability registration
  - feature-flagged shipped capability families
  - unchanged default two-tool contract
- `phase 1` resources and resource templates:
  - reusable `dokploy://...` resources
  - bounded and redacted resource payloads
  - resource links surfaced from relevant execute results
- `phase 2` prompts and completions:
  - five guided Dokploy workflow prompts
  - prompt argument completions for common IDs and enums
  - bounded prompt rendering with reusable `dokploy://...` links
  - compatibility-aware fallback messaging for stale or missing IDs
- `phase 3` sampling and elicitation:
  - guided `execute.workflow` support for `deploy-application`
  - bounded deploy planning through `sampling/createMessage`
  - form-mode elicitation for missing targets, deployment intent, preview/apply choice, and
    bounded rollout options
  - URL-mode elicitation for out-of-band approval handoff
  - safe preview and needs-input fallbacks when a client does not support interactive capabilities
- `phase 4` tasks:
  - staged `tasks` capability wiring with `tasks/list`, `tasks/get`, `tasks/result`, and
    `tasks/cancel`
  - in-process task runtime with bounded TTLs, explicit poll intervals, and shutdown cleanup
  - task-aware `execute` support for long-running code runs and guided `deploy-application`
    workflows
  - cancellation-safe workflow execution for bounded deploy polling and task-backed raw execute
    recipes
- `phase 5` remote distribution and pragmatic auth:
  - registry-ready root `server.json` with npm package metadata and Streamable HTTP `remotes`
  - hosted remote header contract for Dokploy URL plus API key
  - request-scoped remote credential resolution with session-bound isolation
  - HTTP origin validation, preflight handling, and optional local config fallback for
    single-tenant deployments
  - dedicated metadata, adversarial, integration, and coverage verification for the remote surface

## What Is Not Done

The remaining `v3` work is no longer about missing MCP capability families.

It is the release closeout phase:

- final rollout and publication hygiene
- read-only live verification against older Dokploy backends after the remote changes
- final release packaging and communication

## Top 3 Priorities

1. Close `phase 6`: final verification, rollout, and release follow-through.
2. Keep expanding workflow ergonomics only when repeated evidence justifies more helpers.
3. Continue compatibility-aware live verification against older Dokploy backends.

## Execution Order

1. `phase 6`: final verification and rollout

## Documents

- [deep-audit.md](./deep-audit.md): current repo strengths, shipped capability coverage, and the
  remaining strategic gaps
- [capability-comparison.md](./capability-comparison.md): this repo vs the official Dokploy MCP and
  vs the current modern MCP target state
- [endpoint-gap.md](./endpoint-gap.md): why Dokploy endpoint parity and resources are no longer the
  bottleneck
- [live-verification.md](./live-verification.md): backend version-skew evidence that must still
  shape the implementation
- [task-matrix.md](./task-matrix.md): done vs next vs later workstreams
- [execution-plan.md](./execution-plan.md): implementation plan with shipped phase status and the
  remaining phases
- [phase-2-verification.md](./phase-2-verification.md): acceptance evidence, coverage command, and
  the verification matrix for the shipped prompt/completion surface
- [phase-3-verification.md](./phase-3-verification.md): acceptance evidence, coverage command, and
  the verification matrix for the shipped sampling/elicitation workflow surface
- [phase-4-verification.md](./phase-4-verification.md): acceptance evidence, coverage command, and
  the verification matrix for the shipped task surface
- [phase-5-verification.md](./phase-5-verification.md): acceptance evidence, coverage command, and
  the verification matrix for the shipped remote metadata and pragmatic auth surface

## Planning Rule

Do not reopen `phase 0`, `phase 1`, `phase 2`, `phase 3`, `phase 4`, or `phase 5` scope unless a
real regression is found.

The next cycle starts at `phase 6`: final verification, rollout, and release follow-through.
