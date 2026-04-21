# Compose

This is the guide for the part people break first.

There are two very different Compose stories:

## 1. Inline Compose

You already have the Compose content.

Use:

- `sourceType: "raw"`
- `composeFile`

That is the safest MCP path.

Example:

```js
await dokploy.compose.update({
  composeId: 'compose-1',
  sourceType: 'raw',
  composeType: 'docker-compose',
  composeFile: [
    'services:',
    '  whoami:',
    '    image: traefik/whoami:v1.10',
  ].join('\n'),
})
```

## 2. GitHub-Backed Compose

You want Dokploy to pull a Compose file from GitHub.

Treat this as:

- `sourceType: "github"`
- `githubId`
- `owner`
- `repository`
- `branch`
- `composePath`

Example:

```js
await dokploy.compose.update({
  composeId: 'compose-1',
  sourceType: 'github',
  githubId: 'github-provider-id',
  owner: 'docker',
  repository: 'awesome-compose',
  branch: 'master',
  composePath: 'flask-redis/compose.yaml',
})
```

## What Not To Do

Do not assume this is enough:

- `compose.create(...)`
- `composeFile`
- `compose.deploy(...)`

That shell may still persist as a Git-backed record and then fail at deploy time.

The MCP server now preflights this path and tells you what is missing before it throws you into a
blind rollout.

## Live Lessons From The Audit

- Raw Compose only became reliable once `sourceType` was forced to `raw`.
- GitHub-backed Compose only became reliable once a real `githubId` was present alongside
  `owner/repository/branch/composePath`.
- `compose.readLogs` needs a real container id. No container means no log tail, just pain with more
  punctuation.
