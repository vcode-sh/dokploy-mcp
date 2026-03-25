export interface GatewayErrorPayload {
  ok: false
  type: 'dokploy_error' | 'validation_error' | 'sandbox_error'
  status?: number
  procedure?: string
  message: string
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
