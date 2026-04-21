export type ElicitationScalar = string | number | boolean | string[]

export interface ElicitationEnumOption {
  const: string
  title: string
}

export type ElicitationPropertySchema =
  | {
      type: 'string'
      title?: string
      description?: string
      minLength?: number
      maxLength?: number
      format?: 'date' | 'uri' | 'email' | 'date-time'
      default?: string
    }
  | {
      type: 'string'
      title?: string
      description?: string
      enum: string[]
      enumNames?: string[]
      default?: string
    }
  | {
      type: 'string'
      title?: string
      description?: string
      oneOf: ElicitationEnumOption[]
      default?: string
    }
  | {
      type: 'array'
      title?: string
      description?: string
      minItems?: number
      maxItems?: number
      items:
        | {
            type: 'string'
            enum: string[]
          }
        | {
            anyOf: ElicitationEnumOption[]
          }
      default?: string[]
    }
  | {
      type: 'boolean'
      title?: string
      description?: string
      default?: boolean
    }
  | {
      type: 'number' | 'integer'
      title?: string
      description?: string
      minimum?: number
      maximum?: number
      default?: number
    }

export interface ElicitationObjectSchema {
  type: 'object'
  properties: Record<string, ElicitationPropertySchema>
  required?: string[]
}

export interface IdentifierCandidate {
  value: string
  title: string
}

export function buildApplicationQuerySchema(defaultQuery?: string): ElicitationObjectSchema {
  return {
    type: 'object',
    properties: {
      applicationQuery: {
        type: 'string',
        title: 'Application Name Or ID',
        description: 'Enter a Dokploy application name, appName, or applicationId.',
        minLength: 1,
        maxLength: 120,
        ...(defaultQuery ? { default: defaultQuery } : {}),
      },
    },
    required: ['applicationQuery'],
  }
}

export function buildApplicationSelectionSchema(
  candidates: IdentifierCandidate[],
  defaultValue?: string,
): ElicitationObjectSchema {
  return {
    type: 'object',
    properties: {
      applicationId: {
        type: 'string',
        title: 'Application',
        description: 'Choose the Dokploy application to deploy.',
        oneOf: candidates.map((candidate) => ({
          const: candidate.value,
          title: candidate.title,
        })),
        ...(defaultValue ? { default: defaultValue } : {}),
      },
    },
    required: ['applicationId'],
  }
}

export function buildDeploymentIntentSchema(defaultIntent?: string): ElicitationObjectSchema {
  return {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        title: 'Deployment Intent',
        description:
          'Briefly describe why this deployment is needed so the planner can stay grounded.',
        minLength: 3,
        maxLength: 160,
        ...(defaultIntent ? { default: defaultIntent } : {}),
      },
    },
    required: ['intent'],
  }
}

export function buildPreviewOrApplySchema(
  defaultAction: 'preview' | 'apply' = 'preview',
): ElicitationObjectSchema {
  return {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        title: 'Execution Mode',
        description: 'Choose whether to preview the workflow or apply the deployment now.',
        oneOf: [
          {
            const: 'preview',
            title: 'Preview only',
          },
          {
            const: 'apply',
            title: 'Apply deployment now',
          },
        ],
        default: defaultAction,
      },
    },
    required: ['action'],
  }
}

export function buildRolloutOptionsSchema(options?: {
  includeProjectLogs?: boolean
  tailLines?: number
}): ElicitationObjectSchema {
  return {
    type: 'object',
    properties: {
      includeProjectLogs: {
        type: 'boolean',
        title: 'Include Project Logs',
        description: 'Collect a bounded project logs snapshot after the deployment call.',
        default: options?.includeProjectLogs ?? true,
      },
      tailLines: {
        type: 'integer',
        title: 'Log Tail Lines',
        description: 'Maximum number of recent log lines to collect per source.',
        minimum: 0,
        maximum: 120,
        default: options?.tailLines ?? 40,
      },
    },
  }
}
