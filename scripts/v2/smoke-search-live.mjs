#!/usr/bin/env node

import { searchTool } from '../../dist/codemode/tools/search.js'

const result = await searchTool.handler({
  code: 'async ({ catalog }) => catalog.getByTag("notification").slice(0, 5).map((entry) => entry.procedure)',
})

console.log(JSON.stringify(result, null, 2))
