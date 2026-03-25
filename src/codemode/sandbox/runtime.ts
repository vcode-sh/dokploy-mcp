export type SandboxRuntime = 'local' | 'subprocess'

export function resolveSandboxRuntime(
  value = process.env.DOKPLOY_MCP_SANDBOX_RUNTIME,
): SandboxRuntime {
  return value === 'local' ? 'local' : 'subprocess'
}
