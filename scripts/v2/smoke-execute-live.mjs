#!/usr/bin/env node

import { executeTool } from '../../dist/codemode/tools/execute.js'

const code = `
async ({ dokploy, helpers }) => {
  const projects = await dokploy.project.search({ limit: 5 })
  helpers.assert(projects && typeof projects === 'object', 'Expected search result object')
  return {
    total: projects.total ?? null,
    items: Array.isArray(projects.items) ? projects.items.length : null,
  }
}
`.trim()

const result = await executeTool.handler({ code })
console.log(JSON.stringify(result, null, 2))
