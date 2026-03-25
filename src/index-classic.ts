#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { createClassicServer } from './classic/server-classic.js'

const server = createClassicServer()
const transport = new StdioServerTransport()

server.connect(transport).catch((error: unknown) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
