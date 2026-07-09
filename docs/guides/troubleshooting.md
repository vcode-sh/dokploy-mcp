# Troubleshooting

The short version: ask better questions, read the logs, stop trusting green-looking config.

## `No container or service found`

Usually means one of these:

- the app never deployed
- the service is idle
- you are asking for logs before the workload exists

Use:

- `deployment.latestByType`
- `application.one` or `compose.one`
- then `*.readLogs`

In that order. Not as abstract art.

## Compose Deploy Fails Immediately

Check the source mode first.

- inline Compose: `sourceType: "raw"` plus `composeFile`
- GitHub-backed Compose: `sourceType: "github"` plus `githubId`, `owner`, `repository`, `branch`,
  `composePath`

If you mix those two stories, Dokploy will usually punish you faster than the docs will save you.

## HTTPS Is Saved But The Live Cert Is Still Wrong

That can happen.

You can have:

- a saved domain record
- `https: true`
- `certificateType: "letsencrypt"`
- and still get `TRAEFIK DEFAULT CERT` on the wire

So test both:

- Dokploy domain state
- real TLS handshake

## Database Deploy Fails With Weird CPU Errors

In the live audit, `postgres.deploy` failed for `cpuLimit: "1.00"` with:

```text
invalid cpu value 1e-09: Must be at least 0.001
```

`cpuLimit: "0.75"` worked immediately after.

Treat that as an upstream edge case until proven otherwise.

## Build Succeeds, Runtime Still Looks Dead

Deployment status and runtime health are not the same thing.

The buildpack audit produced a `done` deployment and then runtime logs showing:

```text
Error: Cannot find module 'express'
```

So after any non-trivial deploy:

1. check latest deployment
2. read the logs
3. only then pretend it is healthy

## Sandbox Worker Exits Under Load

Subprocess sandbox workers run with a V8 old-space cap.

`DOKPLOY_MCP_SANDBOX_WORKER_MEMORY_MB` controls that cap. Default: `256`.

If generated code exceeds it, the `execute` call fails with a worker-exit error. Raise it only for
trusted workloads that need larger in-memory results.

## Sandbox Is At Capacity

`DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT` controls concurrent subprocess sandbox runs. Default: `4`.

When all slots and the bounded wait queue are full, calls fail with `Sandbox is at capacity`.
Hosted deployments serving many clients should raise this only with matching CPU and memory headroom.

## Reusing Sandbox Workers

`DOKPLOY_MCP_SANDBOX_WORKER_REUSE=1` keeps one warm subprocess per mode after successful runs. It
can reduce repeated `search` and `execute` startup cost in single-user stdio sessions.

Each run still gets a fresh VM context, but the process is retained between successful runs. Timeout,
abort, IPC, and execution-error paths discard the worker. Hosted or multi-tenant deployments should
leave this unset to keep strict fork-per-call process isolation.

## Redacted Logs Are Still Sensitive

Log and response redaction is pattern-based and best-effort. `includeSecrets: true` deliberately
bypasses response redaction. Review redacted logs before publishing them outside your team.
