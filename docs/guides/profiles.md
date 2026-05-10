# Profiles

Multi-profile support exists so one MCP server can talk to more than one Dokploy target without
turning the config into performance art.

Credit where due: the push for proper multi-profile Code Mode support was inspired by
@nggurbanov in [PR #25](https://github.com/vcode-sh/dokploy-mcp/pull/25). A surprisingly
reasonable idea, which is always slightly suspicious in tech.

The core idea is simple:

- keep one `default` target for the panel you use most
- add named profiles only for the extra panels
- let agents switch explicitly when they mean it

## What Counts As `default`

The implicit `default` target still follows the normal local precedence:

1. `DOKPLOY_URL` plus `DOKPLOY_API_KEY`
2. local `dokploy-mcp` config file
3. Dokploy CLI config

That means adding `DOKPLOY_PROFILES_JSON` does not silently replace the thing that already worked.

## Named Profiles

Named profiles come from `DOKPLOY_PROFILES_JSON`:

```json
{
  "redivo": {
    "url": "https://redivo.example.com",
    "apiKey": "dokp_redivo"
  },
  "mezon": {
    "url": "https://mezon.example.com",
    "apiKey": "dokp_mezon"
  }
}
```

Use them when you want an explicit target:

```json
{
  "profile": "mezon",
  "code": "return await dokploy.project.all()"
}
```

## How The Agent Should Behave

- `list_profiles` shows the available targets without exposing API keys
- omit `profile` to use `default`
- pass `profile` only when you want a named target

If only one named profile exists and no local default config exists, it can still act as the
default target.

## Hosted HTTP Boundary

Hosted HTTP sessions using request-scoped remote headers are intentionally isolated.

That means:

- the session stays bound to the remote header credentials
- local named profiles are not exposed inside that session
- `profile` switching is for local config targets, not for escaping a remote session boundary

If you deliberately enable local fallback for single-tenant hosted use, the local `default` plus
named profiles remain available there.

## Guard Rails

The resolver now rejects or warns on the boring ways people break this:

- invalid `DOKPLOY_PROFILES_JSON` is ignored with a warning
- profile URLs must be absolute URLs
- the profile name `default` is reserved
- duplicate trimmed profile names are rejected

If the config still feels clever after reading this, it is probably too clever.
