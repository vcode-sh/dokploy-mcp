import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { remoteDokployHeaderInputs } from '../src/http/security.js'

const repoRoot = resolve(import.meta.dirname, '..')
const packageJsonPath = resolve(repoRoot, 'package.json')
const serverJsonPath = resolve(repoRoot, 'server.json')

const headerSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    isRequired: z.boolean().optional(),
    isSecret: z.boolean().optional(),
    placeholder: z.string().optional(),
  })
  .strict()

const inputSchema = z
  .object({
    description: z.string().min(1),
    default: z.string().optional(),
    isRequired: z.boolean().optional(),
    placeholder: z.string().optional(),
  })
  .strict()

const serverMetadataSchema = z
  .object({
    $schema: z.string().url(),
    name: z.string().regex(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/),
    title: z.string().min(1),
    description: z.string().min(1).max(100),
    version: z.string().min(1),
    websiteUrl: z.string().url(),
    repository: z
      .object({
        url: z.string().url(),
        source: z.string().min(1),
      })
      .strict(),
    icons: z
      .array(
        z
          .object({
            src: z.string().url(),
            mimeType: z.enum([
              'image/png',
              'image/jpeg',
              'image/jpg',
              'image/svg+xml',
              'image/webp',
            ]),
            sizes: z.array(z.string()).optional(),
          })
          .strict(),
      )
      .min(1),
    packages: z
      .array(
        z
          .object({
            registryType: z.literal('npm'),
            registryBaseUrl: z.string().url(),
            identifier: z.string().min(1),
            version: z.string().min(1),
            runtimeHint: z.literal('npx'),
            transport: z.object({ type: z.literal('stdio') }).strict(),
            environmentVariables: z.array(headerSchema).min(2),
          })
          .strict(),
      )
      .min(1),
    remotes: z
      .array(
        z
          .object({
            type: z.literal('streamable-http'),
            url: z.string().min(1),
            variables: z
              .object({
                remoteHost: inputSchema,
                mcpPath: inputSchema,
              })
              .strict(),
            headers: z.array(headerSchema).min(2),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

describe('phase 5 metadata', () => {
  it('keeps server.json aligned with the published package metadata', () => {
    const packageJson = readJson(packageJsonPath)
    const serverJson = serverMetadataSchema.parse(readJson(serverJsonPath))

    expect(serverJson.$schema).toBe(
      'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
    )
    expect(serverJson.name).toBe('io.github.vcode-sh/dokploy-mcp')
    expect(serverJson.version).toBe(packageJson.version)
    expect(serverJson.packages[0]?.identifier).toBe(packageJson.name)
    expect(serverJson.packages[0]?.version).toBe(packageJson.version)
    expect(serverJson.repository).toEqual({
      url: 'https://github.com/vcode-sh/dokploy-mcp',
      source: 'github',
    })
    expect(serverJson.packages[0]?.environmentVariables).toEqual([
      {
        name: 'DOKPLOY_URL',
        description:
          'Optional when local Dokploy credentials already exist. Otherwise provide the Dokploy panel URL.',
        placeholder: 'https://panel.example.com',
      },
      {
        name: 'DOKPLOY_API_KEY',
        description:
          'Optional when local Dokploy credentials already exist. Otherwise provide the Dokploy API key.',
        isSecret: true,
        placeholder: 'dokp_...',
      },
      {
        name: 'DOKPLOY_PROFILES_JSON',
        description:
          'Optional JSON object of named Dokploy targets. Use this when you want explicit named profiles in addition to the local default target.',
        isSecret: true,
        placeholder: '{"redivo":{"url":"https://redivo.example.com","apiKey":"dokp_redivo"}}',
      },
    ])
  })

  it('declares the remote HTTP contract expected by the phase 5 runtime', () => {
    const serverJson = serverMetadataSchema.parse(readJson(serverJsonPath))
    const remote = serverJson.remotes[0]

    expect(remote?.url).toBe('https://{remoteHost}{mcpPath}')
    expect(remote?.variables).toEqual({
      remoteHost: {
        description: 'Hostname of your hosted dokploy-mcp server without the https:// prefix.',
        isRequired: true,
        placeholder: 'mcp.example.com',
      },
      mcpPath: {
        description: 'MCP HTTP path exposed by the hosted server.',
        default: '/mcp',
        placeholder: '/mcp',
      },
    })
    expect(remote?.headers).toEqual(remoteDokployHeaderInputs)
  })

  it('ships icon metadata for registry-aware clients', () => {
    const serverJson = serverMetadataSchema.parse(readJson(serverJsonPath))

    expect(serverJson.icons).toEqual([
      {
        src: 'https://raw.githubusercontent.com/vcode-sh/dokploy-mcp/main/docs/assets/dokploy-mcp-icon.svg',
        mimeType: 'image/svg+xml',
        sizes: ['any'],
      },
    ])
  })
})
