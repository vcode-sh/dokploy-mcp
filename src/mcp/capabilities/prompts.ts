import { registerCodeModePrompts } from '../prompts/index.js'
import { createCapabilityRegistration } from '../registration/types.js'

export const codeModePromptsCapability = createCapabilityRegistration(
  'prompts',
  registerCodeModePrompts,
)
