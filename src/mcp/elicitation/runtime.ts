import { getSupportedElicitationModes } from '@modelcontextprotocol/sdk/client/index.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import type { McpCapabilityFlags } from '../registration/types.js'
import type { ElicitationObjectSchema, ElicitationScalar } from './schemas.js'

export interface ElicitationSupport {
  enabled: boolean
  supportsForm: boolean
  supportsUrl: boolean
}

export type ElicitationContent = Record<string, ElicitationScalar>

export type SafeElicitationResult<T extends ElicitationContent = ElicitationContent> =
  | {
      status: 'accepted'
      content: T
    }
  | {
      status: 'declined' | 'cancelled' | 'unsupported' | 'error'
      error?: string
    }

function formatInteractionError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export function getElicitationSupport(
  server: McpServer,
  capabilityFlags?: McpCapabilityFlags,
): ElicitationSupport {
  const enabled = capabilityFlags?.elicitation === true
  if (!enabled) {
    return {
      enabled: false,
      supportsForm: false,
      supportsUrl: false,
    }
  }

  const clientCapabilities = server.server.getClientCapabilities()?.elicitation
  const { supportsFormMode, supportsUrlMode } = getSupportedElicitationModes(clientCapabilities)

  return {
    enabled,
    supportsForm: supportsFormMode,
    supportsUrl: supportsUrlMode,
  }
}

export async function safeFormElicitation<T extends ElicitationContent>(
  server: McpServer,
  capabilityFlags: McpCapabilityFlags | undefined,
  options: {
    message: string
    requestedSchema: ElicitationObjectSchema
  },
): Promise<SafeElicitationResult<T>> {
  const support = getElicitationSupport(server, capabilityFlags)
  if (!support.supportsForm) {
    return {
      status: 'unsupported',
    }
  }

  try {
    const result = await server.server.elicitInput({
      mode: 'form',
      message: options.message,
      requestedSchema: options.requestedSchema as never,
    })

    if (result.action === 'accept' && result.content) {
      return {
        status: 'accepted',
        content: result.content as T,
      }
    }

    if (result.action === 'decline') {
      return {
        status: 'declined',
      }
    }

    return {
      status: 'cancelled',
    }
  } catch (error) {
    return {
      status: 'error',
      error: formatInteractionError(error),
    }
  }
}

export async function safeUrlElicitation(
  server: McpServer,
  capabilityFlags: McpCapabilityFlags | undefined,
  options: {
    elicitationId: string
    message: string
    url: string
  },
): Promise<SafeElicitationResult> {
  const support = getElicitationSupport(server, capabilityFlags)
  if (!support.supportsUrl) {
    return {
      status: 'unsupported',
    }
  }

  try {
    const result = await server.server.elicitInput({
      mode: 'url',
      elicitationId: options.elicitationId,
      message: options.message,
      url: options.url,
    })

    if (result.action === 'accept') {
      return {
        status: 'accepted',
        content: (result.content ?? {}) as ElicitationContent,
      }
    }

    if (result.action === 'decline') {
      return {
        status: 'declined',
      }
    }

    return {
      status: 'cancelled',
    }
  } catch (error) {
    return {
      status: 'error',
      error: formatInteractionError(error),
    }
  }
}
