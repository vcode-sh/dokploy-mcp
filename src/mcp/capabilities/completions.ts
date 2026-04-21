import { registerCodeModeCompletions } from '../completions/index.js'
import { createCapabilityRegistration } from '../registration/types.js'

export const codeModeCompletionsCapability = createCapabilityRegistration(
  'completions',
  registerCodeModeCompletions,
)
