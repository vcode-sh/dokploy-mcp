import { createCapabilityRegistration } from '../registration/types.js'
import { registerCodeModeResources } from '../resources/index.js'

export const codeModeResourcesCapability = createCapabilityRegistration(
  'resources',
  registerCodeModeResources,
)
