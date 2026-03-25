#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createCodeModeServer } from './codemode/server-codemode.js'

const server = createCodeModeServer()
const transport = new StdioServerTransport()

server.connect(transport).catch((error: unknown) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
