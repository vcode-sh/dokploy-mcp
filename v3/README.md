# v3 Plan Package

Last updated: 2026-04-21

This folder is the authoritative planning and audit package for the current `v3` execution cycle.

It now reflects the shipped state after closing `phase 0`, `phase 1`, `phase 2`, `phase 3`, and
`phase 4` in code.

## Current State

- package version: `3.0.0`
- generated Dokploy catalog: `524` procedures across `48` tags
- endpoint parity vs the official Dokploy root OpenAPI snapshot: reached
- default public MCP surface: `search`, `execute`
- optional server modes: `raw`, `hybrid`
- transports: `stdio`, `http`
- shipped staged MCP capability families: `resources`, `prompts`, `completions`, `sampling`,
  `elicitation`, `tasks`
- phase 4 verification command: `npm run test:phase4:coverage`
- latest measured phase 4 slice coverage: `97.01%` statements, `88.96%` branches, `100%`
  functions, `97.00%` lines
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

## What Is Not Done

The remaining gaps are no longer about Dokploy endpoint coverage or resources.

They are about the final modern MCP phase:

- registry-native remote packaging and metadata
- pragmatic remote auth for Streamable HTTP without custom OAuth/OIDC

## Top 3 Priorities

1. Add `phase 5`: registry metadata, `server.json`, remotes, and pragmatic remote auth.
2. Keep expanding workflow ergonomics only when repeated evidence justifies more helpers.
3. Continue compatibility-aware live verification against older Dokploy backends.

## Execution Order

1. `phase 5`: remote distribution and pragmatic auth

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

## Planning Rule

Do not reopen `phase 0`, `phase 1`, `phase 2`, `phase 3`, or `phase 4` scope unless a real
regression is found.

The next cycle starts at `phase 5`: remote packaging, metadata, and pragmatic auth.
