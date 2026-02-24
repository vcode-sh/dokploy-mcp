# dokploy-mcp

MCP server for the Dokploy API. 224 tools. Zero opinions about your infrastructure choices.

Your AI can now deploy, destroy, and redeploy your apps faster than you can say "who approved that PR?"

## What is this

An MCP (Model Context Protocol) server that lets Claude, Cursor, VS Code, and anything else that speaks MCP talk directly to your Dokploy instance. Every API endpoint. No exceptions.

The old version had 67 tools and called it a day. This one has **224 tools** across **24 modules** because half-measures are for people who still write Dockerfiles by hand.

## What you need

- Node.js >= 18 (you probably have this, it's not 2019)
- A Dokploy server running somewhere
- An API key from said server (Settings > API in your Dokploy dashboard)
- An MCP client (Claude Code, Claude Desktop, Cursor, VS Code, Windsurf, whatever)

## Setup

### Claude Code

Drop this in your project's `.mcp.json` or `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["-y", "dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://your-dokploy-server.com/api",
        "DOKPLOY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

`Settings` > `Cursor Settings` > `MCP` > `Add new global MCP server`

Same JSON as above. Put it in `~/.cursor/mcp.json` or `.cursor/mcp.json` in your project.

### VS Code

Same energy, different file. `.vscode/mcp.json`:

```json
{
  "servers": {
    "dokploy": {
      "command": "npx",
      "args": ["-y", "dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://your-dokploy-server.com/api",
        "DOKPLOY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Local dev

```bash
git clone <this-repo>
npm install
npm run build
```

Then point your MCP client at the local build:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "node",
      "args": ["/path/to/dokploy-mcp/dist/index.js"],
      "env": {
        "DOKPLOY_URL": "https://your-dokploy-server.com/api",
        "DOKPLOY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Testing with MCP Inspector

```bash
DOKPLOY_URL=https://your-server.com/api DOKPLOY_API_KEY=your-key npx @modelcontextprotocol/inspector node dist/index.js
```

Opens a browser UI where you can poke every tool individually. Very satisfying.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DOKPLOY_URL` | Yes | Your Dokploy API URL. Ends with `/api`. |
| `DOKPLOY_API_KEY` | Yes | API key from Dokploy Settings > API. |
| `DOKPLOY_TIMEOUT` | No | Request timeout in ms. Default: `30000`. |

## All 224 tools

Organized by what they break.

### Projects (6)
`project-all` `project-one` `project-create` `project-update` `project-duplicate` `project-remove`

### Applications (26)
`application-create` `application-one` `application-update` `application-delete` `application-move` `application-deploy` `application-redeploy` `application-start` `application-stop` `application-cancelDeployment` `application-reload` `application-markRunning` `application-cleanQueues` `application-refreshToken` `application-saveBuildType` `application-saveEnvironment` `application-saveGithubProvider` `application-saveGitlabProvider` `application-saveBitbucketProvider` `application-saveGiteaProvider` `application-saveGitProvider` `application-saveDockerProvider` `application-disconnectGitProvider` `application-readAppMonitoring` `application-readTraefikConfig` `application-updateTraefikConfig`

### Docker Compose (17)
`compose-create` `compose-one` `compose-update` `compose-delete` `compose-deploy` `compose-redeploy` `compose-stop` `compose-cleanQueues` `compose-allServices` `compose-randomizeCompose` `compose-getDefaultCommand` `compose-generateSSHKey` `compose-refreshToken` `compose-removeSSHKey` `compose-deployTemplate` `compose-templates` `compose-saveEnvironment`

### Domains (9)
`domain-create` `domain-one` `domain-byApplicationId` `domain-byComposeId` `domain-update` `domain-delete` `domain-validateDomain` `domain-generateDomain` `domain-generateWildcard`

### PostgreSQL (13)
`postgres-one` `postgres-create` `postgres-update` `postgres-remove` `postgres-move` `postgres-deploy` `postgres-start` `postgres-stop` `postgres-reload` `postgres-rebuild` `postgres-changeStatus` `postgres-saveExternalPort` `postgres-saveEnvironment`

### MySQL (13)
`mysql-one` `mysql-create` `mysql-update` `mysql-remove` `mysql-move` `mysql-deploy` `mysql-start` `mysql-stop` `mysql-reload` `mysql-rebuild` `mysql-changeStatus` `mysql-saveExternalPort` `mysql-saveEnvironment`

### MariaDB (13)
`mariadb-one` `mariadb-create` `mariadb-update` `mariadb-remove` `mariadb-move` `mariadb-deploy` `mariadb-start` `mariadb-stop` `mariadb-reload` `mariadb-rebuild` `mariadb-changeStatus` `mariadb-saveExternalPort` `mariadb-saveEnvironment`

### MongoDB (13)
`mongo-one` `mongo-create` `mongo-update` `mongo-remove` `mongo-move` `mongo-deploy` `mongo-start` `mongo-stop` `mongo-reload` `mongo-rebuild` `mongo-changeStatus` `mongo-saveExternalPort` `mongo-saveEnvironment`

### Redis (13)
`redis-one` `redis-create` `redis-update` `redis-remove` `redis-move` `redis-deploy` `redis-start` `redis-stop` `redis-reload` `redis-rebuild` `redis-changeStatus` `redis-saveExternalPort` `redis-saveEnvironment`

### Deployments (2)
`deployment-all` `deployment-allByCompose`

### Docker (4)
`docker-getContainers` `docker-getConfig` `docker-getContainersByAppNameMatch` `docker-getContainersByAppLabel`

### Certificates (4)
`certificates-all` `certificates-one` `certificates-create` `certificates-remove`

### Registry (7)
`registry-all` `registry-one` `registry-create` `registry-update` `registry-remove` `registry-testRegistry` `registry-enableSelfHostedRegistry`

### Destinations / S3 (6)
`destination-all` `destination-one` `destination-create` `destination-update` `destination-remove` `destination-testConnection`

### Backups (8)
`backup-one` `backup-create` `backup-update` `backup-remove` `backup-manualBackupPostgres` `backup-manualBackupMySql` `backup-manualBackupMariadb` `backup-manualBackupMongo`

### Mounts (4)
`mounts-one` `mounts-create` `mounts-update` `mounts-remove`

### Ports (4)
`port-one` `port-create` `port-update` `port-delete`

### Redirects (4)
`redirects-one` `redirects-create` `redirects-update` `redirects-delete`

### Security (4)
`security-one` `security-create` `security-update` `security-delete`

### Cluster (4)
`cluster-getNodes` `cluster-addWorker` `cluster-addManager` `cluster-removeWorker`

### Settings (24)
`settings-reloadServer` `settings-reloadTraefik` `settings-cleanUnusedImages` `settings-cleanUnusedVolumes` `settings-cleanStoppedContainers` `settings-cleanDockerBuilder` `settings-cleanDockerPrune` `settings-cleanAll` `settings-cleanMonitoring` `settings-saveSSHPrivateKey` `settings-cleanSSHPrivateKey` `settings-assignDomainServer` `settings-updateDockerCleanup` `settings-readTraefikConfig` `settings-updateTraefikConfig` `settings-readWebServerTraefikConfig` `settings-updateWebServerTraefikConfig` `settings-readMiddlewareTraefikConfig` `settings-updateMiddlewareTraefikConfig` `settings-checkAndUpdateImage` `settings-updateServer` `settings-getDokployVersion` `settings-readDirectories` `settings-getOpenApiDocument`

### Auth (14)
`auth-createAdmin` `auth-createUser` `auth-login` `auth-get` `auth-logout` `auth-update` `auth-generateToken` `auth-one` `auth-updateByAdmin` `auth-generate2FASecret` `auth-verify2FASetup` `auth-verifyLogin2FA` `auth-disable2FA` `auth-verifyToken`

### Admin (9)
`admin-one` `admin-createUserInvitation` `admin-removeUser` `admin-getUserByToken` `admin-assignPermissions` `admin-cleanGithubApp` `admin-getRepositories` `admin-getBranches` `admin-haveGithubConfigured`

### Users (3)
`user-all` `user-byAuthId` `user-byUserId`

## Architecture

Two dependencies. That's it. `@modelcontextprotocol/sdk` and `zod`.

No axios. No express. No logger library that weighs more than your app. Native `fetch` because it's not 2021 anymore.

```
src/
  index.ts          # Entry point. 10 lines. You're welcome.
  server.ts         # Creates MCP server, registers tools.
  api/
    client.ts       # fetch wrapper with error handling.
  tools/
    _factory.ts     # postTool(), getTool(), createTool() helpers.
    project.ts      # 6 tools
    application.ts  # 26 tools
    compose.ts      # 17 tools
    ...             # 21 more module files
    index.ts        # Wires everything together.
```

Every tool gets Zod schema validation, typed error handling, and MCP annotations (read-only, destructive, idempotent hints). The AI knows which tools are safe to call without asking.

## Getting your API key

1. Open your Dokploy dashboard
2. Go to Settings > Profile > API/CLI section
3. Generate a token
4. Try not to commit it to a public repo

## License

MIT. Do whatever you want. Deploy responsibly. Or don't. I'm a README, not a cop.
