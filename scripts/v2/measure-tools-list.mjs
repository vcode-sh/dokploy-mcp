#!/usr/bin/env node

import { allTools } from '../../dist/tools/index.js'

const payload = {
  tools: allTools.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.schema,
    annotations: tool.annotations,
  })),
}

const json = JSON.stringify(payload)
const bytes = Buffer.byteLength(json, 'utf8')

console.log(
  JSON.stringify(
    {
      toolCount: allTools.length,
      bytes,
      approxTokensAt4Chars: Math.round(bytes / 4),
    },
    null,
    2,
  ),
)
