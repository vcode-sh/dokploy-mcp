#!/usr/bin/env node

import {
  buildCatalogTs,
  buildOpenApiIndex,
  ensureGeneratedDir,
  loadResolvedSpec,
  writeJson,
  writeText,
} from './lib.mjs'

ensureGeneratedDir()
const spec = loadResolvedSpec()
const index = buildOpenApiIndex(spec)
const indexPath = writeJson('openapi-index.json', index)
const catalogPath = writeText('dokploy-catalog.ts', buildCatalogTs())

console.log(`Wrote ${indexPath}`)
console.log(`Wrote ${catalogPath}`)
