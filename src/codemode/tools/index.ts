import type { ToolDefinition } from '../../mcp/tool-factory.js'

import { executeTool } from './execute.js'
import { listProfilesTool } from './list-profiles.js'
import { searchTool } from './search.js'

export const codeModeTools: ToolDefinition[] = [searchTool, executeTool, listProfilesTool]
