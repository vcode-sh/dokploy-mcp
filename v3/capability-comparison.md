# Capability Comparison

Last updated: 2026-04-21

This comparison answers two different questions:

1. Are we still behind the official Dokploy MCP on Dokploy coverage?
2. What still separates us from the best next-step MCP shape after closing `phase 0`,
   `phase 1`, `phase 2`, `phase 3`, and `phase 4`?

## Short Answer

On Dokploy API coverage, this repository no longer meaningfully trails the official Dokploy MCP.

On modern MCP capability breadth, this repo now ships a stronger resource plus prompt/completion
story, a guided `sampling`/`elicitation` workflow layer, staged `tasks`, and the first remote MCP
product surface through registry-ready metadata plus pragmatic remote auth.

## Side-By-Side

| Dimension | This repo | Official Dokploy MCP | Strategic implication |
| --- | --- | --- | --- |
| Generated Dokploy API coverage | `524` procedures / `48` tags | useful upstream signal, but not ahead at the root OpenAPI level | endpoint count is no longer the main story |
| Default public surface | `search` + `execute` | endpoint-per-tool default | this repo keeps the better default UX |
| Raw endpoint-per-tool mode | yes: `raw`, `hybrid` | yes | parity on this shape is already good enough |
| Workflow helpers | yes | not the main design | this repo already leads on workflow ergonomics |
| Transport | `stdio` + `http` | `http` and MCP transports present upstream | transport is no longer the main differentiator |
| Compatibility handling for older Dokploy backends | yes | not the main focus | keep this advantage |
| Secret-aware shaping and redaction | yes | narrower posture | keep this advantage |
| Test depth and regression guards | strong | historically lighter | keep this advantage |
| `resources` and `resource templates` | implemented as an optional staged capability | not observed as a differentiator in the audit | `phase 0` and `phase 1` are no longer the gap |
| Resource links from tool outputs | implemented for relevant execute results | not part of the audited advantage | improves reuse of bounded context |
| `prompts` | implemented as an optional staged capability | not observed as a differentiator in the audit | `phase 2` is closed |
| `completions` | implemented through completable prompt arguments and staged capability wiring | not observed as a differentiator in the audit | `phase 2` is closed |
| `sampling` | implemented as an optional staged capability behind guided `execute.workflow` flows | not observed as a differentiator in the audit | `phase 3` is closed |
| `elicitation` | implemented as an optional staged capability behind guided `execute.workflow` flows | not observed as a differentiator in the audit | `phase 3` is closed |
| `tasks` | implemented as an optional staged capability behind task-aware `execute` runs | not observed as a differentiator in the audit | `phase 4` is closed |
| Registry-ready `server.json` / `remotes` | yes: shipped in `phase 5` | not part of the audited advantage | this repo now leads on remote discoverability |
| Pragmatic remote auth for self-hosted Dokploy | yes: shipped in `phase 5` through Dokploy URL + API key headers | not part of the audited advantage | this repo now closes the first remote auth gap without custom OAuth/OIDC |

## What This Means

The official Dokploy MCP claim of "more tools" is no longer the right benchmark.

The better benchmark is now:

- better agent workflow support
- better remote discoverability
- better token efficiency through reusable bounded context

## Bottom Line

This repo should keep its current advantages:

- token-efficient default UX
- helper-driven workflows
- reusable resources
- stronger tests
- stronger safety and compatibility posture

The next step is no longer "ship resources", no longer "ship prompts", no longer "ship
sampling / elicitation", no longer "ship tasks", and no longer "ship remote metadata/auth".

The next step is to keep the new remote surface release-ready through final verification and
rollout discipline.
