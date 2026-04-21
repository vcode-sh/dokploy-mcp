# Task Matrix

Last updated: 2026-04-21

This matrix distinguishes between work that is already done, work that should be executed next, and
work that can wait.

## Done

| Track | Status | Outcome |
| --- | --- | --- |
| Dokploy API parity | Done | Generated parity reached against the official Dokploy root OpenAPI snapshot |
| Default Code Mode UX | Done | `search` and `execute` remain the default public surface |
| Raw / hybrid modes | Done | Endpoint-per-tool access exists as an opt-in shape |
| Workflow helper foundation | Done | helper layer exists for repeated Dokploy workflows |
| HTTP transport and lifecycle hardening | Done | session-aware Streamable HTTP transport, health endpoint, and shutdown/concurrency coverage |
| Compatibility handling | Done | older Dokploy backends get cleaner behavior and messaging |
| Secret-aware shaping and redaction | Done | safer default output posture |
| `phase 0` capability foundation | Done | modular registration, shipped capability flags, and unchanged default behavior are in place |
| `phase 1` resources and templates | Done | reusable `dokploy://...` resources, template reads/lists, bounded payloads, and execute resource links are shipped |
| `phase 2` prompts and completions | Done | guided workflow prompts, bounded prompt rendering, and ID/enum completions are shipped behind staged capability flags |
| Verification and release hygiene | Done | build, test, lint, typecheck, budgets, docs automation, and release metadata work are in place |

## Next

| Track | Status | Why it matters now |
| --- | --- | --- |
| `sampling` | Next | enables MCP-native planning and synthesis flows |
| `elicitation` | Next | enables asking for missing values during workflows |
| `tasks` | Next | enables long-running deploy, rollback, and wait flows |
| Registry-native remote metadata | Next | improves discovery and remote consumption |
| Modern auth discovery | Next | required for a serious remote MCP product posture |

## Later

| Track | Status | Rule |
| --- | --- | --- |
| Additional helper growth | Later | add only when repeated workflow evidence justifies it |
| Search tuning beyond the current layer | Later | keep improving, but not before the remaining MCP capability gaps are closed |
| Further stress/performance tuning | Later | continue once prompts, workflow, and remote layers are in place |

## Priority Order

1. `sampling` + `elicitation` + `tasks`
2. registry-native remote packaging and auth
