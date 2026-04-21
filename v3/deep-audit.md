# Deep Audit

Last updated: 2026-04-21

This audit answers one question:

After closing Dokploy endpoint parity, `phase 0`, `phase 1`, `phase 2`, `phase 3`, `phase 4`, and
`phase 5`,
what is the
highest-value next move for this repository?

## Executive Summary

`v3.0.0` completed the endpoint and hardening agenda.

The repository now also ships the first modern MCP expansion:

- modular capability registration for shipped families
- optional `resources` and `resource templates`
- reusable `dokploy://...` context objects
- execute results that surface resource links when they can be inferred safely
- guided workflow prompts
- bounded prompt argument completions for common IDs and enums
- guided `execute.workflow` deploy orchestration
- `sampling`-backed bounded planning
- form and URL `elicitation` with safe fallbacks
- staged `tasks` capability wiring with polling, cancellation, and shutdown-safe cleanup
- task-aware `execute` runs for long-running code and guided deploy workflows
- root `server.json` metadata with npm package and remote install paths
- request-scoped hosted auth through Dokploy URL plus API key headers
- origin validation and session-bound hosted credential isolation

The next strategic gap is no longer "more Dokploy tools", no longer "basic resources", and no
longer "remote metadata/auth".

The remaining work is now release-oriented:

- final verification and rollout of the shipped remote surface

## Verified Strengths In This Repository

### 1. The Dokploy API surface is no longer the blocker

- generated catalog parity is at `524` procedures and `48` tags
- the repository no longer trails the official Dokploy root OpenAPI snapshot
- remaining API work should be treated as ongoing upstream sync, not unfinished `v3` scope

### 2. Default UX is still better than endpoint-per-tool sprawl

The repository keeps the default public surface to `search` and `execute`, which is still the
right default for agent workflows and token control.

That design remains a strength.

### 3. The repository now has a reusable resource layer

The server is no longer purely tool-only for shipped features.

It now exposes reusable, bounded MCP resources for the main inspection workflows:

- project overview
- project infrastructure
- project logs overview
- application summary
- deployment summary
- server summary

That closes the original `phase 1` token-efficiency gap.

### 4. The repository already has a stronger production posture

Compared to a basic endpoint-per-tool server, this repo already has:

- compatibility-aware version-skew handling
- secret-aware shaping and redaction
- helper procedures for repeated workflows
- hardened HTTP lifecycle coverage
- adversarial subprocess coverage
- protocol budget checks

## Verified Remaining Constraints

### 1. Final rollout still needs compatibility-aware live verification

The first hosted remote release is now implemented, but it still needs the last read-only release
checks against older Dokploy backends before calling the whole `v3` cycle complete.

That matters because the new remote install path still depends on the same compatibility-aware
gateway behavior that protects earlier phases from version skew.

### 2. Dokploy Enterprise SSO is still not the right baseline after phase 5

Dokploy's OIDC/SAML SSO support is an Enterprise feature and is about logging into Dokploy through
an external identity provider.

That is not the same thing as a broadly available authorization layer for this MCP server.

The shipped first remote release should still not depend on:

- Dokploy Enterprise SSO being available on the target installation
- Dokploy acting as the auth foundation for remote MCP access
- a custom OAuth/OIDC layer in this repository before a real hosted use case exists

The shipped remote release instead stays aligned with how Dokploy actually authenticates API
traffic today: URL plus API key.

## Why These Gaps Matter

### Better agent workflows

The shipped `sampling`/`elicitation` plus `tasks` layers now make the server better at multi-step
work:

- asking for missing values
- handling long-running operations
- returning progress and cancellation semantics
- coordinating safe deploy and rollback flows

### Better remote adoption

Remote metadata, registry publication, and a clear auth contract increasingly determine whether a
server is easy to consume in the broader MCP ecosystem, which is why closing `phase 5` mattered.

## Audit Conclusion

The next cycle should not be framed as another endpoint project and should not reopen the resource
phase.

It should now be framed as the release closeout project:

1. final verification and rollout for the shipped remote MCP surface

## Research Inputs

The prioritization above is based on the latest public MCP materials:

- [MCP changelog 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/changelog)
- [MCP changelog 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/changelog)
- [MCP elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)
- [MCP tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)
- [MCP Registry quickstart](https://modelcontextprotocol.io/registry/quickstart)
- [Publishing remote servers](https://modelcontextprotocol.io/registry/remote-servers)
