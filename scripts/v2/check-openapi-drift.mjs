#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeOpenApiSource } from './lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')
const defaultSourcePath = path.join(rootDir, 'scripts', 'v2', 'official-openapi-root.json')
const primaryUrl = 'https://raw.githubusercontent.com/Dokploy/mcp/main/openapi.json'
const secondaryUrl = 'https://docs.dokploy.com/openapi.json'
const fetchTimeoutMs = 15_000
const httpMethods = new Set(['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'])

function parseArgs(argv) {
  const options = {
    sourcePath: defaultSourcePath,
    strictSecondary: process.env.DOKPLOY_OPENAPI_DRIFT_STRICT_SECONDARY === '1',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--source') {
      const value = argv[index + 1]
      if (!value) {
        throw new Error('--source requires a file path')
      }
      options.sourcePath = path.isAbsolute(value) ? value : path.resolve(rootDir, value)
      index += 1
      continue
    }

    if (arg === '--strict-secondary') {
      options.strictSecondary = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

function readSpecFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  return {
    raw,
    spec: normalizeOpenApiSource(JSON.parse(raw)),
  }
}

async function fetchSpec(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeoutMs) })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  const raw = await response.text()
  return {
    raw,
    spec: normalizeOpenApiSource(JSON.parse(raw)),
  }
}

function listOperationKeys(spec) {
  const keys = []

  for (const [pathKey, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of Object.keys(pathItem ?? {})) {
      if (!httpMethods.has(method.toLowerCase())) continue
      keys.push(`${method.toUpperCase()} ${pathKey}`)
    }
  }

  return keys.sort()
}

function listPrimaryTags(spec) {
  const tags = new Set()

  for (const pathItem of Object.values(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(pathItem ?? {})) {
      if (!httpMethods.has(method.toLowerCase())) continue
      tags.add(op.tags?.[0] ?? 'other')
    }
  }

  return [...tags].sort()
}

function summarize(raw, spec) {
  const operations = listOperationKeys(spec)
  const tags = listPrimaryTags(spec)

  return {
    operations,
    operationSet: new Set(operations),
    sha256: crypto.createHash('sha256').update(raw).digest('hex'),
    tagSet: new Set(tags),
    tags,
    version: spec.info?.version ?? 'unknown',
  }
}

function diffSets(left, right) {
  return [...left].filter((entry) => !right.has(entry)).sort()
}

function printList(label, values) {
  if (values.length === 0) return
  console.log(`${label}:`)
  for (const value of values) {
    console.log(`  ${value}`)
  }
}

function compareSummaries(label, vendored, remote) {
  const addedOperations = diffSets(remote.operationSet, vendored.operationSet)
  const removedOperations = diffSets(vendored.operationSet, remote.operationSet)
  const addedTags = diffSets(remote.tagSet, vendored.tagSet)
  const removedTags = diffSets(vendored.tagSet, remote.tagSet)

  console.log(
    `${label}: vendored ${vendored.operations.length} ops / ${vendored.tags.length} tags; remote ${remote.operations.length} ops / ${remote.tags.length} tags`,
  )
  printList('  + added operations', addedOperations)
  printList('  - removed operations', removedOperations)
  printList('  + added tags', addedTags)
  printList('  - removed tags', removedTags)

  return {
    addedOperations,
    addedTags,
    hasDrift:
      addedOperations.length > 0 ||
      removedOperations.length > 0 ||
      addedTags.length > 0 ||
      removedTags.length > 0,
    removedOperations,
    removedTags,
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`Usage error: ${errorMessage(error)}`)
    process.exitCode = 2
    return
  }

  let vendored
  try {
    const { raw, spec } = readSpecFile(options.sourcePath)
    vendored = summarize(raw, spec)
  } catch (error) {
    console.error(`Local snapshot error: ${errorMessage(error)}`)
    process.exitCode = 2
    return
  }

  console.log(`Vendored source: ${path.relative(rootDir, options.sourcePath)}`)
  console.log(`Vendored sha256: ${vendored.sha256}`)

  let primary
  let secondary
  try {
    const primarySource = await fetchSpec(primaryUrl)
    primary = summarize(primarySource.raw, primarySource.spec)
    const secondarySource = await fetchSpec(secondaryUrl)
    secondary = summarize(secondarySource.raw, secondarySource.spec)
  } catch (error) {
    console.error(`OpenAPI drift check could not fetch public specs: ${errorMessage(error)}`)
    process.exitCode = 2
    return
  }

  const primaryDiff = compareSummaries('Primary Dokploy/mcp main', vendored, primary)
  const secondaryDiff = compareSummaries('Secondary docs.dokploy.com', vendored, secondary)

  if (primaryDiff.hasDrift) {
    console.error('OpenAPI drift detected against primary Dokploy/mcp main.')
    process.exitCode = 1
    return
  }

  const secondaryHasAdditions =
    secondaryDiff.addedOperations.length > 0 || secondaryDiff.addedTags.length > 0
  if (options.strictSecondary && secondaryDiff.hasDrift) {
    console.error('OpenAPI drift detected against secondary docs.dokploy.com.')
    process.exitCode = 1
    return
  }
  if (secondaryHasAdditions) {
    console.error('OpenAPI drift detected: secondary docs source is ahead of the vendored snapshot.')
    process.exitCode = 1
    return
  }
  if (secondaryDiff.hasDrift) {
    console.warn(
      'Secondary docs source differs but is not ahead of the vendored snapshot; treating it as a non-blocking docs lag.',
    )
  }

  console.log('OpenAPI drift check passed.')
}

await main()
