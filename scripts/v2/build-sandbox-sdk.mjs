#!/usr/bin/env node

import {
  buildProcedureSchemas,
  buildSdkDeclaration,
  buildSdkRuntime,
  ensureGeneratedDir,
  loadResolvedSpec,
  writeText,
} from './lib.mjs'

ensureGeneratedDir()
const spec = loadResolvedSpec()
const procedureSchemas = buildProcedureSchemas(spec)
const declarationsPath = writeText('dokploy-sdk.d.ts', buildSdkDeclaration(procedureSchemas))
const runtimePath = writeText('dokploy-sdk.ts', buildSdkRuntime(procedureSchemas))

console.log(`Wrote ${declarationsPath}`)
console.log(`Wrote ${runtimePath}`)
