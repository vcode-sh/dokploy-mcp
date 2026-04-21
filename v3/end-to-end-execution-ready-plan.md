# End-To-End Execution Ready Plan

Last updated: 2026-04-21

This document is the execution-ready plan for the next validation cycle after the direct live
comparison of `dokploy-mcp-v2` and `dokploy-mcp-v3`.

It focuses on proving that the real Dokploy mutation paths we claim to cover in `v3` behave
correctly on the production Dokploy server while staying inside a tightly bounded test scope.

## Why This Is The Next Priority

The direct MCP audit already proved that `v3` is meaningfully better than `v2` on the public
tooling surface:

- `v3` supports `catalog.recommend(...)`; `v2` does not
- `v3` exposes newer catalog/runtime procedures such as `settings.checkInfrastructureHealth`
- `v3` supports `execute.workflow`; `v2` rejects `workflow` input entirely
- `v3` returns `resourceLinks` from `execute`; `v2` does not
- `v3` successfully created the dedicated audit project `mcp-test-v3`

What is still missing is the strongest proof that the mutation-heavy paths are correct in real
usage:

- create an application inside the test project
- update CPU and memory reservation / limit fields
- create and verify volume mounts
- deploy the application and validate logs / deployment state

That is now more valuable than adding more planning docs or more abstract protocol work.

## Safety Boundaries

These rules are mandatory for the next execution cycle:

- operate only inside project `mcp-test-v3`
- do not modify, restart, redeploy, remove, or inspect sensitive runtime details from other
  projects unless a read-only list/search call is strictly required
- prefer named `volume` mounts over `bind` mounts for safety on the production host
- do not remove any existing non-test project resources
- any cleanup step must target only resources created during this audit and only inside
  `mcp-test-v3`

## Current Test Scope

Verified so far:

- project creation through `v3`
- readback through `project.one`
- helper readback through `project.overview`
- live comparison of `v2` vs `v3` on `search` and read-only `execute` paths

Not yet verified:

- `application.create`
- `application.update` for CPU and memory tuning
- `mounts.create`
- `mounts.listByServiceId`
- `mounts.update`
- `application.deploy`
- `deployment.latestByType`
- `application.readLogs`
- hosted Streamable HTTP `v3` remote path end-to-end

## Known Test Target

Use the already-created test project:

- project name: `mcp-test-v3`
- project id: `7m9j_C4qfc6thVTQroHSt`
- default environment id: `z602tgn2I7XDFIqw5FCas`

The plan should still start by re-reading the project state in case the environment changed.

## Main Goal

Prove, with end-to-end evidence, that the real `v3` Dokploy mutation flows are correct for:

1. application creation
2. CPU and memory reservation / limit updates
3. volume mounting
4. deployment and runtime verification

## Execution Order

1. baseline inventory and guardrails
2. application creation
3. resource tuning
4. volume mounts
5. deploy and rollout validation
6. remote HTTP / hosted `v3` validation
7. comparison write-up and signoff

## Workstream A: Baseline Inventory

Goal:

Reconfirm the test project state and choose the exact audit resource names before any new mutation.

Tasks:

- [ ] read `project.one({ projectId: "7m9j_C4qfc6thVTQroHSt" })`
- [ ] read `project.overview({ projectId: "7m9j_C4qfc6thVTQroHSt" })`
- [ ] record the current environment id(s)
- [ ] list any existing applications already present in `mcp-test-v3`
- [ ] pick a unique audit application name, for example `mcp-v3-audit-app-01`
- [ ] pick a unique named volume, for example `mcp-v3-audit-volume-01`

Done when:

- we know exactly which environment id to target
- we have unique names that avoid collisions with prior runs

## Workstream B: Application Creation

Goal:

Prove that `v3` can create a real application in the test project and that the created state is
readable and coherent.

Target procedure:

- `application.create`

Expected minimal input:

- `name`
- `environmentId`
- optional `appName`
- optional `description`

Tasks:

- [ ] create the application through `application.create`
- [ ] capture returned `applicationId`
- [ ] read it back through `application.one({ applicationId })`
- [ ] read the project again through `project.overview({ projectId })`
- [ ] compare the newly created app state through both `v2` and `v3`

Done when:

- the application exists in Dokploy
- both `application.one` and `project.overview` reflect the new app
- `v2` can at least read the created app state even if it cannot use newer helper ergonomics

## Workstream C: CPU / Memory Resource Validation

Goal:

Prove that the application resource fields exposed through `application.update` are correct on the
real Dokploy backend.

Target procedure:

- `application.update`

Fields to verify explicitly:

- `memoryReservation`
- `memoryLimit`
- `cpuReservation`
- `cpuLimit`

Important note:

The practical “max” setting in the current Dokploy API surface maps to the limit fields:

- `memoryLimit`
- `cpuLimit`

Tasks:

- [ ] update the app with a small safe baseline, for example:
  - `memoryReservation: "128M"`
  - `memoryLimit: "256M"`
  - `cpuReservation: "0.10"`
  - `cpuLimit: "0.50"`
- [ ] read back the app with `application.one({ applicationId })`
- [ ] verify the exact persisted values
- [ ] run one more update with a different safe matrix to confirm the fields are not write-once
- [ ] read back again and compare old vs new values

Done when:

- each of the 4 resource fields can be written
- each field can be read back exactly
- a second update proves the fields are not silently ignored

## Workstream D: Volume Mount Validation

Goal:

Prove that `v3` can create and inspect mounts safely in the test project.

Target procedures:

- `mounts.create`
- `mounts.listByServiceId`
- `mounts.one`
- `mounts.update`
- optionally `mounts.remove` during cleanup

Safety rule:

Use only `type: "volume"` unless there is a compelling reason to test `file`. Do not use `bind`
mounts against arbitrary host paths on the production server.

Tasks:

- [ ] create a named volume mount for the test application with:
  - `type: "volume"`
  - `serviceType: "application"`
  - `serviceId: applicationId`
  - `mountPath: "/data"`
  - `volumeName: "mcp-v3-audit-volume-01"`
- [ ] verify the mount through `mounts.listByServiceId`
- [ ] verify the mount also appears in `application.one`
- [ ] update the mount through `mounts.update` with a safe path change if Dokploy allows it
- [ ] re-read the mount to confirm the change

Done when:

- the mount exists
- the mount is visible through both mount-specific reads and application reads
- at least one safe mount update is confirmed

## Workstream E: Deploy / Rollout Validation

Goal:

Prove that the created application can be configured into a deployable state and that the deploy
path behaves correctly.

Target procedures:

- `application.update`
- `application.deploy`
- `deployment.latestByType`
- `application.readLogs`
- `project.logsOverview`

Recommended low-risk strategy:

- configure the app to a simple public Docker image path before deploy
- use a tiny benign container image
- keep the test isolated to `mcp-test-v3`

Tasks:

- [ ] determine the minimal valid Docker-image configuration for the created app using:
  - `sourceType: "docker"`
  - `dockerImage`
  - any additional required fields discovered during live validation
- [ ] deploy with `application.deploy({ applicationId, title, description })`
- [ ] poll `deployment.latestByType({ id: applicationId, type: "application" })`
- [ ] read logs through `application.readLogs({ applicationId, tail: 100 })`
- [ ] read the project logs view through `project.logsOverview({ projectId })`
- [ ] confirm the app reaches a sane terminal status or produces an actionable bounded failure

Done when:

- the deploy call returns a deployment object
- the deployment can be observed through `deployment.latestByType`
- logs are readable
- success or failure is clearly attributable and reproducible

## Workstream F: Hosted Remote Validation

Goal:

Prove that the shipped `phase 5` remote path works end-to-end, not just the local direct MCP
integration.

Target surface:

- hosted Streamable HTTP `v3`
- `X-Dokploy-Url`
- `X-Dokploy-Api-Key`
- session-bound credential isolation
- origin handling where relevant

Tasks:

- [ ] connect to hosted `v3` over Streamable HTTP, not local direct MCP
- [ ] validate the health payload and remote auth metadata
- [ ] execute a safe read-only call with the required remote headers
- [ ] verify a second session with different credentials is isolated correctly
- [ ] confirm missing / partial headers fail closed as expected

Done when:

- the hosted remote path is proven with real requests
- the behavior matches the intended `phase 5` contract

## Workstream G: v2 vs v3 Final Comparison

Goal:

Turn the end-to-end mutation results into a final correctness matrix.

Tasks:

- [ ] run matching readbacks through `v2` wherever the older server supports them
- [ ] record every place where:
  - `v2` lacks the procedure entirely
  - `v2` can read but not create / mutate
  - `v3` returns richer metadata such as `resourceLinks`
  - `v3` exposes helper/workflow surfaces that `v2` cannot
- [ ] classify each difference as:
  - compatibility
  - ergonomics
  - correctness
  - remote productization

Done when:

- there is a final pass/fail matrix for the tested mutation paths

## Functional Improvements To Consider Next

These should be considered after the end-to-end correctness pass, not before it.

### 1. Guided workflows for the write paths we are about to validate

Today `v3` has guided `deploy-application`.

Add next:

- `create-application`
- `configure-application-resources`
- `mount-application-volume`
- `deploy-from-image`

Why:

- these are the exact real workflows that still need manual JS in `execute`
- they fit the existing `sampling` / `elicitation` / `tasks` model

### 2. Task-backed progress for longer mutation flows

Leverage SDK `1.29` tasks more aggressively for:

- application bootstrap
- resource tuning plus verification
- mount creation plus verification
- deploy plus rollout polling

Why:

- long-running writes should be cancellable and observable
- this is stronger than opaque blocking `execute` calls

### 3. Capability-enabled deployment variant

The live MCP audit against the currently deployed servers still hit the public tool surface only:

- `search`
- `execute`

We should create a capability-enabled deployment variant or test profile that explicitly enables the
already shipped optional surfaces:

- `resources`
- `prompts`
- `completions`
- `sampling`
- `elicitation`
- `tasks`

Why:

- the code ships these
- the production comparison still needs a real capability-level MCP client audit

### 4. More opinionated search recommendations

`catalog.recommend(...)` already differentiates `v3`.

Improve it further for:

- resource tuning
- mount operations
- deploy verification
- rollback / logs triage

Why:

- this makes the 2-tool public surface more useful without tool sprawl

### 5. Richer post-mutation resource links

After create/update/mount/deploy operations, return more targeted reusable links where safe:

- application summary
- project overview
- project infrastructure
- latest deployment summary

Why:

- this compounds the current `resourceLinks` advantage already observed in the audit

### 6. Remote audit harness using SDK `1.29`

Build a repeatable remote smoke harness around the shipped Streamable HTTP client in SDK `1.29`:

- connect
- send headers
- verify session isolation
- verify tasks and workflow behavior when capability flags are on

Why:

- this directly exercises the remote product surface added in `phase 5`

## Acceptance Criteria For This Plan

This plan is complete only when:

- a real application is created in `mcp-test-v3`
- CPU and memory reservation / limit fields are written and read back correctly
- at least one safe named volume mount is created and verified
- the app is deployed and observed through deployment and log reads
- hosted Streamable HTTP `v3` is verified end-to-end
- the final `v2` vs `v3` comparison is evidence-backed, not inferred

## Immediate Recommendation

The next concrete action should be:

1. create one disposable application in `mcp-test-v3`
2. prove `application.update` for CPU / memory fields
3. prove `mounts.create` + `mounts.listByServiceId`
4. prove `application.deploy` + `application.readLogs`

Only after that should we claim that the API coverage we already “have” is also proven correct in
end-to-end production-safe usage.
