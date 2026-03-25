#!/usr/bin/env node

import { buildProcedureSchemas, buildSchemasTs, ensureGeneratedDir, loadResolvedSpec, writeText } from './lib.mjs'

ensureGeneratedDir()
const spec = loadResolvedSpec()
const procedureSchemas = buildProcedureSchemas(spec)
const outputPath = writeText('dokploy-schemas.ts', buildSchemasTs(procedureSchemas))

console.log(`Wrote ${outputPath}`)
