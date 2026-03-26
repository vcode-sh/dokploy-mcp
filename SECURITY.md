# Security Policy

I take security seriously. Yes, I know that sentence usually precedes a data breach announcement, but I actually mean it.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.2.x   | Yes       |
| < 2.2   | No        |

Only the latest release gets patches. Running something older? Update first.

## Reporting a Vulnerability

**Do NOT open a public GitHub issue.** I will be very cross.

Email **hello@vcode.sh** with:

- **What** -- describe the vulnerability.
- **How** -- steps to reproduce it.
- **So what** -- what an attacker could actually do with this.
- **Fix** -- if you've got one. Not required, but I'll owe you a coffee.

### Response Times

- **48 hours** -- I'll acknowledge your report.
- **7 days** -- critical vulnerabilities get patched.
- **30 days** -- everything else gets a fix or a documented workaround.

If I go silent, follow up. I'm one person with a keyboard, not a 24/7 SOC team.

## What I've Already Thought About

So you don't have to:

- **API keys never logged or cached** -- the `x-api-key` header is used for Dokploy API requests but never written to logs, debug output, or disk (beyond the encrypted config file you explicitly created). MCP tool responses never echo credentials back.
- **Git provider secrets redacted by default** -- responses from `application.one`, `github.one`, `gitea.one`, `gitlab.one`, `bitbucket.one`, `gitProvider.getAll`, and `github.githubProviders` automatically replace secret values (`privateKey`, `clientSecret`, `webhookSecret`, `accessToken`, `refreshToken`, `appPassword`, etc.) with `[REDACTED]`. If you genuinely need the raw values, pass `includeSecrets: true` -- but think twice before doing that in an AI-assisted session.
- **Config file permissions** -- `~/.config/dokploy-mcp/config.json` stores your API key locally. It's your machine, your filesystem permissions. We don't store credentials anywhere else.
- **No arbitrary code execution** -- this server reads JSON schemas, makes HTTP requests to your Dokploy instance, and returns structured data. That's it. No eval(), no shell commands from user input, no postinstall scripts.
- **Input validation everywhere** -- every tool parameter goes through Zod strict schemas before hitting the API. Malformed input is rejected before it leaves your machine.
- **Timeout on every request** -- AbortController with configurable timeout (default 30s). No hanging connections, no resource leaks.
- **Destructive operation annotations** -- tools that delete, stop, or clean resources are annotated with `destructiveHint: true` so MCP clients can warn before executing them.

## Disclosure

Once a fix ships, I publish a security advisory on GitHub with full details. Credit goes to the reporter unless they prefer to remain anonymous. Fame is optional, good security isn't.
