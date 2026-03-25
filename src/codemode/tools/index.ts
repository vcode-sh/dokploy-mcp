import type { ToolDefinition } from '../../tools/_factory.js'

import { executeTool } from './execute.js'
import { searchTool } from './search.js'

export const codeModeTools: ToolDefinition[] = [searchTool, executeTool]
