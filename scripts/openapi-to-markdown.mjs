#!/usr/bin/env node
/**
 * Converts OpenAPI 3 spec (JSON) to a nicely sorted Markdown API reference.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const specPath = path.join(__dirname, '../docs/api.md')
const outputPath = path.join(__dirname, '../docs/api-dokploy.md')

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))

// Logical sort order for tags (matches MCP tool organization)
const TAG_ORDER = [
  'admin',
  'project',
  'application',
  'compose',
  'domain',
  'postgres',
  'mysql',
  'mariadb',
  'mongo',
  'redis',
  'deployment',
  'docker',
  'certificates',
  'registry',
  'destination',
  'backup',
  'mounts',
  'port',
  'redirects',
  'security',
  'cluster',
  'settings',
  'user',
  'ai',
  'environment',
  'gitProvider',
  'gitea',
  'github',
  'gitlab',
  'bitbucket',
  'organization',
  'sso',
  'notification',
  'licenseKey',
  'stripe',
  'schedule',
  'rollback',
  'previewDeployment',
  'server',
  'volumeBackups',
  'sshKey',
]

const METHOD_ORDER = ['get', 'post', 'put', 'patch', 'delete']

function humanizeId(id) {
  if (!id || typeof id !== 'string') return id
  return id
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function formatParam(p) {
  const req = p.required ? '**required**' : 'optional'
  const type = p.schema?.type || ''
  const desc = p.description ? ` — ${p.description}` : ''
  return `- \`${p.name}\` (${type}) ${req}${desc}`
}

function formatSchema(schema, indent = 0) {
  if (!schema) return ''
  const prefix = '  '.repeat(indent)
  const lines = []
  if (schema.type === 'object' && schema.properties) {
    for (const [k, v] of Object.entries(schema.properties)) {
      const req = schema.required?.includes(k) ? '**required**' : 'optional'
      const type = v.type || v.$ref?.split('/').pop() || 'any'
      const desc = v.description ? ` — ${v.description}` : ''
      lines.push(`${prefix}- \`${k}\` (${type}) ${req}${desc}`)
    }
  }
  return lines.join('\n')
}

function getMethod(op) {
  return Object.keys(op).find((m) => METHOD_ORDER.includes(m))
}

// Group paths by primary tag
const byTag = {}
for (const [pathKey, pathItem] of Object.entries(spec.paths || {})) {
  const methods = Object.entries(pathItem).filter(([k]) =>
    METHOD_ORDER.includes(k)
  )
  for (const [method, op] of methods) {
    const tag = (op.tags && op.tags[0]) || 'other'
    if (!byTag[tag]) byTag[tag] = []
    byTag[tag].push({
      path: pathKey,
      method: method.toUpperCase(),
      operationId: op.operationId,
      summary: op.summary || humanizeId(op.operationId) || pathKey,
      description: op.description,
      parameters: op.parameters || [],
      requestBody: op.requestBody,
      responses: op.responses,
    })
  }
}

// Sort paths within each tag (by path string, then method)
for (const tag of Object.keys(byTag)) {
  byTag[tag].sort((a, b) => {
    const pa = a.path.toLowerCase()
    const pb = b.path.toLowerCase()
    if (pa !== pb) return pa.localeCompare(pb)
    return METHOD_ORDER.indexOf(a.method.toLowerCase()) - METHOD_ORDER.indexOf(b.method.toLowerCase())
  })
}

// Build markdown
const lines = []

// Front matter
lines.push('# Dokploy API Reference')
lines.push('')
lines.push(
  `Generated from OpenAPI ${spec.openapi || '3.0'} — ${spec.info?.title || 'Dokploy API'} v${spec.info?.version || '1.0.0'}`
)
lines.push('')
if (spec.info?.description) {
  lines.push(spec.info.description)
  lines.push('')
}
if (spec.servers?.[0]?.url) {
  lines.push(`**Base URL:** \`${spec.servers[0].url}\``)
  lines.push('')
}
lines.push('---')
lines.push('')

// Table of contents
const sortedTags = [
  ...TAG_ORDER.filter((t) => t in byTag),
  ...Object.keys(byTag).filter((t) => !TAG_ORDER.includes(t)).sort(),
]

lines.push('## Table of Contents')
lines.push('')
for (const tag of sortedTags) {
  const slug = tag.replace(/\s+/g, '-').toLowerCase()
  const count = byTag[tag].length
  const label = tag.charAt(0).toUpperCase() + tag.slice(1)
  const unit = count === 1 ? 'endpoint' : 'endpoints'
  lines.push(`- [${label}](#${slug}) (${count} ${unit})`)
}
lines.push('')
lines.push('---')
lines.push('')

// Sections by tag
for (const tag of sortedTags) {
  const label = tag.charAt(0).toUpperCase() + tag.slice(1)
  lines.push(`## ${label}`)
  lines.push('')

  for (const ep of byTag[tag]) {
    lines.push(`### \`${ep.method} ${ep.path}\``)
    lines.push('')
    lines.push(`**${ep.summary}**`)
    if (ep.description) {
      lines.push('')
      lines.push(ep.description)
    }
    lines.push('')
    if (ep.parameters.length > 0) {
      lines.push('**Parameters:**')
      lines.push('')
      for (const p of ep.parameters) {
        lines.push(formatParam(p))
      }
      lines.push('')
    }
    if (ep.requestBody?.content?.['application/json']?.schema) {
      const schema = ep.requestBody.content['application/json'].schema
      lines.push('**Request body:**')
      lines.push('')
      const bodyLines = formatSchema(schema)
      if (bodyLines) lines.push(bodyLines)
      else lines.push('- JSON object (see OpenAPI spec for schema)')
      lines.push('')
    }
    if (ep.responses?.['200']) {
      lines.push('**Response:** 200 OK')
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }
}

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
console.log(`Wrote ${outputPath}`)
