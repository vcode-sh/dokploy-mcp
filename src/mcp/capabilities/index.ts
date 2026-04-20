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
  codeModeSamplingCapability,
  codeModeElicitationCapability,
  codeModeTasksCapability,
]

export const codeModeCapabilities: readonly McpCapabilityRegistration[] = [
  codeModeToolsCapability,
  ...codeModeSharedCapabilities,
]
