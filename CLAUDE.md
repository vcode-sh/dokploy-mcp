# CLAUDE.md

Read [AGENTS.md](./AGENTS.md) -- it is the single source of truth for project context,
architecture, code style, testing, and review guidelines. Everything there applies to Claude Code
sessions in this repo.

Quick orientation: this is the Dokploy MCP server, v2 "Code Mode" -- three public MCP tools
(`search`, `execute`, `list_profiles`) over 500+ generated Dokploy procedures, with a sandboxed
runtime for model-written code. TypeScript, ES modules, Node >= 24, Biome, Vitest.
