export interface GatewayErrorPayload {
  ok: false
  type: 'dokploy_error' | 'validation_error' | 'sandbox_error'
  status?: number
  procedure?: string
  message: string
}

export function formatCompatibilityNotFoundMessage(input: {
  procedure: string
  backendVersion: string
  minimumVersion: string
}): string {
  return [
    `Dokploy API error (404): Procedure ${input.procedure} exists in the generated MCP catalog but is not available on connected Dokploy server ${input.backendVersion}.`,
    `It requires Dokploy ${input.minimumVersion} or newer.`,
    'Upgrade Dokploy or avoid this endpoint on older servers.',
  ].join(' ')
}

export function formatGatewayError(input: {
  type: GatewayErrorPayload['type']
  message: string
  status?: number
  procedure?: string
}): GatewayErrorPayload {
  return {
    ok: false,
    type: input.type,
    status: input.status,
    procedure: input.procedure,
    message: input.message,
  }
}
