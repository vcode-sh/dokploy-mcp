# Setup Wizard

If you want the shortest path from "I have a Dokploy URL and a key" to "the client is connected",
this is it.

Run:

```bash
npx @vibetools/dokploy-mcp setup
```

## What It Does

The wizard:

1. checks existing Dokploy credentials from env, local config, or Dokploy CLI config
2. lets you reuse them or enter new ones
3. validates them against the real Dokploy API
4. asks whether to save them locally
5. prints ready-to-use blocks for Cursor, Claude Desktop, Codex, and Claude Code

So yes, it now behaves like a setup flow rather than a ceremonial slap.

## Interactive Flow

Default behavior:

```bash
npx @vibetools/dokploy-mcp setup
```

You get prompted for:

- Dokploy server URL
- Dokploy API key

If validation fails, the wizard lets you retry instead of kicking you back into the shell.

If validation succeeds, it asks whether to save the credentials into the local `dokploy-mcp`
config file.

## Non-Interactive Flow

Use `--yes` when you already know what you want:

```bash
npx @vibetools/dokploy-mcp setup --yes --url https://panel.example.com --api-key dokp_...
```

Behavior:

- if you pass `--url` and `--api-key`, the wizard validates those
- if you omit them, the wizard tries existing configured credentials
- if neither exists, it fails with a clear error instead of pretending this is fine

By default, `--yes` saves validated credentials locally.

Validation only:

```bash
npx @vibetools/dokploy-mcp setup --yes --url https://panel.example.com --api-key dokp_... --no-save
```

Force save:

```bash
npx @vibetools/dokploy-mcp setup --yes --url https://panel.example.com --api-key dokp_... --save
```

## Existing Credentials

The wizard checks credentials in this order:

1. `DOKPLOY_URL` and `DOKPLOY_API_KEY`
2. local `dokploy-mcp` config file
3. Dokploy CLI config

If it finds something, it tells you where it came from and lets you reuse it.

If the saved config already matches the validated panel URL and API key, it does not rewrite the
file just to look busy.

## What Gets Saved

Saved credentials go into the local `dokploy-mcp` config file.

That matters because:

- saved credentials let client config stay shorter
- unsaved credentials make the wizard print env-based client blocks instead

## When To Use It

Use the wizard when:

- this is your first setup
- you want the local config file done properly
- you want client-ready config without stitching docs together like a ransom note

Skip it when:

- you already manage MCP config exactly how you want
- you are automating everything in scripts and do not need prompts

## Related Docs

- [Getting Started](../getting-started.md)
- [Codex](../clients/codex.md)
- [Claude Code](../clients/claude-code.md)
- [Cursor](../clients/cursor.md)
- [Claude Desktop](../clients/claude-desktop.md)
