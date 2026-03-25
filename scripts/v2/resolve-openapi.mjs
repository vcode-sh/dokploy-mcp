#!/usr/bin/env node

import { ensureGeneratedDir, resolveOpenApiSpec, writeJson } from './lib.mjs'

ensureGeneratedDir()
const resolvedSpec = resolveOpenApiSpec()
const outputPath = writeJson('openapi-resolved.json', resolvedSpec)

console.log(`Wrote ${outputPath}`)
