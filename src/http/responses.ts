import type { IncomingMessage, ServerResponse } from 'node:http'

export function writeJson(
  req: IncomingMessage,
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
) {
  const body = JSON.stringify(payload)
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json')
  res.setHeader('content-length', Buffer.byteLength(body, 'utf8'))

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  res.end(body)
}

export function writeJsonRpcError(
  req: IncomingMessage,
  res: ServerResponse,
  statusCode: number,
  message: string,
  code = -32603,
) {
  writeJson(req, res, statusCode, {
    jsonrpc: '2.0',
    error: {
      code,
      message,
    },
    id: null,
  })
}

export function writeBadRequest(req: IncomingMessage, res: ServerResponse, message: string) {
  writeJsonRpcError(req, res, 400, message, -32000)
}

export function writeSessionNotFound(req: IncomingMessage, res: ServerResponse) {
  writeJsonRpcError(req, res, 404, 'Session not found', -32001)
}
