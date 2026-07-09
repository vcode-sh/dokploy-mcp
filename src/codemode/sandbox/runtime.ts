export type SandboxRuntime = 'local' | 'subprocess'

let warnedLocalRuntime = false

export function resolveSandboxRuntime(
  value = process.env.DOKPLOY_MCP_SANDBOX_RUNTIME,
): SandboxRuntime {
  return value === 'local' ? 'local' : 'subprocess'
}

export function warnIfLocalRuntime() {
  if (resolveSandboxRuntime() !== 'local' || warnedLocalRuntime) {
    return
  }

  warnedLocalRuntime = true
  console.error(
    'dokploy-mcp: DOKPLOY_MCP_SANDBOX_RUNTIME=local runs generated code in the credential-holding process. Dev/test only -- use the default subprocess runtime in production.',
  )
}

export function resetLocalRuntimeWarningForTests() {
  warnedLocalRuntime = false
}
