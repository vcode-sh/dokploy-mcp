#!/usr/bin/env node

import { allTools } from '../../dist/tools/index.js'
import { codeModeTools } from '../../dist/codemode/tools/index.js'

function measure(tools) {
  const payload = {
    tools: tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.schema,
      annotations: tool.annotations,
    })),
  }

  const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8')
  return {
    tools: tools.length,
    bytes,
    approxTokensAt4Chars: Math.round(bytes / 4),
  }
}

console.log(
  JSON.stringify(
    {
      classic: measure(allTools),
      codemode: measure(codeModeTools),
    },
    null,
    2,
  ),
)
