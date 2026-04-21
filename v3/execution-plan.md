# End-To-End Execution Plan

Last updated: 2026-04-21

This is the authoritative implementation plan for the current `v3` cycle.

Status update:

- `phase 0` is complete in code
- `phase 1` is complete in code
- `phase 2` is complete in code
- `phase 3` is complete in code
- `phase 4` is complete in code
- the remaining execution plan starts at `phase 5`

## Target Outcome

By the end of this plan, the repository should:

- preserve the existing `search` / `execute` contract
- preserve the shipped `resources` and `resource templates`
- add `prompts` and `completions`
- add `sampling`, `elicitation`, and `tasks` without regressing existing workflows
- become registry-ready for remote distribution
- add modern remote auth discovery and scope-aware HTTP behavior
- keep compatibility-aware handling for older Dokploy backends
- keep the current safety, token, and regression advantages

## Non-Goals

- do not make legacy-only MCP compatibility the main project
- do not grow raw endpoint-per-tool surface for its own sake
- do not add new helpers unless they clearly beat direct API composition
- do not regress the current two-tool default UX

## Implementation Principles

1. Capability-first, not endpoint-count-first.
2. Feature-flag risky additions before making them default.
3. Keep each new MCP surface bounded and testable.
4. Reuse existing compatibility-aware gateway logic.
5. Keep outputs token-bounded and secret-aware by default.

## Workstream Overview

| Workstream | Priority | Status | Outcome |
| --- | --- | --- | --- |
| A. MCP capability foundation | P0 | Complete | modular registration for shipped families and clean feature-flag handling |
| B. Resources and templates | P0 | Complete | reusable, token-bounded Dokploy context objects |
| C. Prompts and completions | P0 | Complete | guided workflows, bounded prompt rendering, and low-friction identifier discovery |
| D. Sampling and elicitation | P1 | Complete | interactive, MCP-native workflow composition |
| E. Tasks | P1 | Complete | progress, polling, cancellation, and shutdown-safe cleanup for long-running work |
| F. Remote distribution and auth | P2 | Next | registry-ready metadata and modern remote server behavior |

## Phase 0: Capability Foundation

Status: Complete

### Goal

Refactor server registration so new MCP surfaces can be added cleanly without turning the current
server entry points into another monolith.

### Files

- `src/server.ts`
- `src/codemode/server-codemode.ts`
- `src/rawmode/server-rawmode.ts`
- new `src/mcp/capabilities/*`
- new `src/mcp/registration/*`

### Tasks

- extract capability registration into dedicated modules:
  - tools
  - resources
  - prompts
  - completions
  - task-aware wiring
- keep current mode selection semantics intact
- introduce feature flags for shipped capability families without advertising unimplemented ones
- keep the default `search` / `execute` contract unchanged

### Implementation Closeout

- capability registration is split across `src/mcp/capabilities/*` and `src/mcp/registration/*`
- `resources` is the shipped staged capability family and can be enabled cleanly
- unimplemented later-phase families are no longer reported as active capability flags
- the default `search` / `execute` contract remains unchanged in `codemode`

### Tests

- server construction tests per mode
- capability registration snapshot tests
- feature-flag coverage for enabled vs disabled capability families

### Done When

- the server can enable or disable each capability family cleanly
- `search` and `execute` still behave exactly as before when new capabilities are off

## Phase 1: Resources And Resource Templates

Status: Complete

### Goal

Expose reusable, read-only Dokploy context through MCP resources instead of forcing clients to
reconstruct everything through tools.

### Initial Resource Set

- `dokploy://project/{projectId}/overview`
- `dokploy://project/{projectId}/infrastructure`
- `dokploy://project/{projectId}/logs-overview`
- `dokploy://application/{applicationId}/summary`
- `dokploy://deployment/{deploymentId}/summary`
- `dokploy://server/{serverId}/summary`

### Files

- new `src/mcp/resources/*`
- `src/codemode/virtual-procedures/*`
- `src/codemode/context/*`
- `src/mcp/tool-factory.ts` only if shared annotations/utilities are needed

### Tasks

- define URI shapes and resource metadata
- expose list/read handlers
- add resource templates with variable schemas
- keep outputs bounded and redacted
- reuse helper procedures where they already encode the right summary logic
- return resource links from relevant tool outputs where that improves client UX

### Implementation Closeout

- the planned resource URI set is implemented
- `resources/list`, `resources/read`, and resource template discovery are covered by protocol tests
- resource payloads are bounded and redacted
- helper-backed summaries reuse the existing compatibility-aware gateway behavior
- relevant `execute` results now surface reusable `dokploy://...` links when IDs are present

### Tests

- `resources/list`
- `resources/read`
- invalid URI handling
- version-skew behavior when a summary depends on newer Dokploy endpoints
- redaction and size-bound coverage

### Done When

- the top Dokploy inspection workflows can be served by reusable resources
- resource outputs are smaller and safer than equivalent raw tool call transcripts

## Phase 2: Prompts And Completions

Status: Complete

### Goal

Make high-value Dokploy workflows discoverable and guided.

### Initial Prompt Set

- `deploy-application`
- `diagnose-deployment`
- `review-project-infrastructure`
- `rotate-database-password-preview`
- `triage-project-logs`

### Initial Completion Domains

- `projectId`
- `environmentId`
- `applicationId`
- `serverId`
- `databaseId`
- prompt argument completions where an ID or common enum can be discovered safely

### Files

- new `src/mcp/prompts/*`
- new `src/mcp/completions/*`
- `src/codemode/context/search-context.ts` if prompt or completion discovery reuses search ranking

### Tasks

- add prompt registry and prompt argument schemas
- embed resource references where prompt flows benefit from reusable context
- add completions for common IDs and names
- keep completions read-only and bounded
- make prompt outputs usable with and without the advanced workflow layer

### Tests

- `prompts/list`
- `prompts/get`
- prompt argument validation
- completion matching and fallback coverage
- prompt rendering coverage for missing / invalid / stale IDs

### Implementation Closeout

- the five planned workflow prompts are implemented
- prompt argument completions are shipped for common IDs and bounded enums
- prompt outputs now embed reusable `dokploy://...` links where they add value
- completion handlers stay read-only and bounded
- stale or missing IDs now return guided fallback messaging instead of opaque failures

### Done When

- a client can discover and launch the main Dokploy workflows without relying only on free-form
  prompting
- common ID-heavy flows no longer require manual copy/paste

## Phase 3: Sampling And Elicitation

Status: Complete

### Goal

Add MCP-native interactive workflow composition for clients that support it.

### Policy

- use `sampling` for bounded planning, synthesis, and guided workflow assembly
- use form-mode `elicitation` for non-secret structured user input
- reserve URL-mode `elicitation` for truly sensitive out-of-band interactions
- always keep a fallback path for clients that do not support these capabilities

### Files

- new `src/mcp/sampling/*`
- new `src/mcp/elicitation/*`
- `src/http/*` where capability negotiation or protocol wiring is needed
- `src/codemode/tools/execute.ts` and related runtime modules where fallback orchestration is needed

### Tasks

- implement capability negotiation and safe fallbacks
- add a bounded planner for workflows that benefit from model-side synthesis
- define elicitation schemas for:
  - missing identifiers
  - deployment intent
  - preview vs apply choice
  - bounded rollout options
- keep secret entry and third-party auth out of normal form-mode elicitation

### Tests

- capability-negotiation tests
- `sampling/createMessage` request/response coverage where supported
- `elicitation/create` form-mode coverage
- URL-mode elicitation coverage for out-of-band flows
- fallback coverage when a client does not support these capabilities

### Implementation Closeout

- `sampling` and `elicitation` are now shipped as staged capability flags
- `execute` keeps raw JavaScript code mode and now also accepts a guided `workflow` input for
  `deploy-application`
- the shipped workflow can:
  - resolve missing application targets through bounded search plus optional form elicitation
  - capture deployment intent through form elicitation or a deterministic default
  - ask for preview vs apply explicitly and fail closed to preview when interaction is not
    available
  - collect bounded rollout options through form elicitation for apply flows
  - request URL-mode out-of-band approval handoff instead of collecting sensitive approval input
    in-band
- bounded deploy planning now uses `sampling/createMessage` when the client supports it and
  degrades to a deterministic plan otherwise
- unsupported clients still receive a correct non-interactive preview / needs-input path

### Done When

- the server can safely ask for missing workflow inputs
- the server can use MCP-native planning where it adds value
- unsupported clients still get a correct non-interactive path

## Phase 4: Tasks

Status: Complete

### Goal

Support long-running or multi-step workflows with progress, polling, and cancellation.

### Initial Task Types

- deploy
- redeploy
- rollback
- wait-for-rollout
- log-follow
- batch preview / batch apply

### Files

- new `src/mcp/tasks/*`
- `src/http/*`
- relevant Code Mode runtime modules

### Tasks

- add a task registry with TTL and cancellation support
- define task lifecycle states and status messages
- wire task IDs into long-running workflows
- make polling intervals explicit
- expose cancellation where the underlying action can be stopped safely
- keep the initial implementation in-process but structured for future persistence if needed

### Tests

- task lifecycle tests
- `tasks/list`
- `tasks/get`
- `tasks/cancel`
- task-augmented `sampling` and `elicitation` coverage where supported
- shutdown and cleanup coverage for in-flight tasks

### Implementation Closeout

- `tasks` is now a shipped staged capability family with `tasks/list`, `tasks/get`,
  `tasks/result`, and `tasks/cancel` provided through the SDK task store wiring
- `execute` keeps the default two-tool contract and now also advertises optional task support for
  long-running code runs and guided deploy workflows
- the initial implementation is in-process with bounded TTLs, explicit poll intervals, cancel-safe
  abort controllers, and shutdown cleanup
- guided deploy workflows can now run as task-backed executions while preserving the earlier
  sampling / elicitation behavior for preflight planning
- task-backed raw `execute` runs now cover bounded deploy, redeploy, rollback, log-follow, wait,
  and batch recipes through the existing `dokploy` runtime plus virtual helpers

### Done When

- long-running workflows no longer rely on opaque blocking calls
- clients can observe progress and cancel safely where possible

## Phase 5: Remote Distribution And Auth

### Goal

Make the server feel like a modern remote MCP product, not just a local package with HTTP support.

### Files

- `package.json`
- new `server.json`
- `.github/workflows/*`
- `src/http/*`
- new `src/auth/*` or equivalent HTTP auth modules
- docs and publish scripts as needed

### Tasks

- add `server.json`
- add registry-ready metadata including `remotes`
- add implementation metadata such as `title`, description, and icons where supported
- validate remote URL and metadata shape in CI
- implement modern remote auth discovery:
  - protected resource metadata
  - OIDC discovery integration where relevant
  - scope-aware `WWW-Authenticate` challenges when needed
- validate `Origin` and related HTTP security expectations for remote use
- keep a simple scope model for the first release, for example:
  - read
  - operate
  - admin

### Tests

- metadata validation tests
- HTTP auth discovery tests
- origin validation tests
- challenge / insufficient-scope behavior tests
- remote smoke tests against the HTTP transport

### Done When

- the repository can publish modern metadata cleanly
- remote clients can discover and authenticate against the server predictably

## Phase 6: Final Verification And Rollout

### Goal

Ship the new capability surface without losing the current reliability and token discipline.

### Tasks

- update README and release docs
- add smoke scripts for new MCP surfaces where possible
- extend budget checks if new capability listings materially affect startup or list cost
- perform read-only live verification against an older Dokploy backend
- perform regression verification against the current default `search` / `execute` flows

### Verification Gates

Required after each merged phase:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Required after phases touching protocol/runtime behavior:

- `npm run test:coverage`
- `npm run ci:budgets`

Required before final release:

- `npm run ci:full`

### Done When

- all verification gates are green
- the default user-facing contract still works
- new capability families are documented and tested
- no compatibility regressions appear against older Dokploy backends

## Safe Parallel Split

The remaining plan can be implemented in parallel without overlapping write scopes.

### Worker A

- closed: capability foundation

### Worker B

- closed: resources and resource templates

### Worker C

- closed: prompts and completions

### Worker D

- closed: sampling and elicitation

### Worker E

- closed: tasks

### Worker F

- remote metadata, auth, CI, and docs

## Key Risks And Mitigations

### SDK support may lag the newest MCP capability details

Mitigation:

- implement behind feature flags
- isolate protocol wiring from Dokploy business logic
- prefer modular adapters so low-level fallbacks can be added if needed

### Version skew can break higher-level resources and prompts

Mitigation:

- build everything on top of the existing compatibility-aware gateway behavior
- keep explicit fallback and "not supported on this backend" messaging

### Tasks can become over-engineered too early

Mitigation:

- start with in-process task state plus TTL
- add persistence only if real deployment requirements justify it

## Definition Of Done

The remaining plan is complete only when:

- the server exposes the remaining MCP surfaces described above
- remote metadata and auth discovery are in place
- the default contract remains stable
- verification is green
- the `v3` folder reflects the shipped reality again
