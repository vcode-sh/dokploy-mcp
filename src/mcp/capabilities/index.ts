import type { McpCapabilityRegistration } from '../registration/types.js'

import { codeModeCompletionsCapability } from './completions.js'
import { codeModeElicitationCapability } from './elicitation.js'
import { codeModePromptsCapability } from './prompts.js'
import { codeModeResourcesCapability } from './resources.js'
import { codeModeSamplingCapability } from './sampling.js'
import { codeModeTasksCapability } from './tasks.js'
import { codeModeToolsCapability } from './tools.js'

export const codeModeSharedCapabilities: readonly McpCapabilityRegistration[] = [
  codeModeResourcesCapability,
  codeModePromptsCapability,
  codeModeCompletionsCapability,
]

export const codeModeCapabilities: readonly McpCapabilityRegistration[] = [
  codeModeToolsCapability,
  ...codeModeSharedCapabilities,
  codeModeSamplingCapability,
  codeModeElicitationCapability,
]

// Reserved for later phases. These families stay out of the active registration set until they
// expose real MCP behavior.
export const codeModePlannedCapabilities: readonly McpCapabilityRegistration[] = [
  codeModeTasksCapability,
]
