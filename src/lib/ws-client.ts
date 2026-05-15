/**
 * WebSocket event emission for server-side.
 * Best-effort - won't throw if WS service is unavailable.
 * Uses a simple fetch-based approach to avoid bundling socket.io-client on the server.
 *
 * In serverless deployments (Vercel), the WebSocket service won't be available,
 * so events are silently skipped. Real-time updates will work via polling instead.
 */

const WS_PORT = process.env.WS_PORT || '3003'

/**
 * Check if we're running in a serverless environment (like Vercel)
 */
function isServerless(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY
  )
}

/**
 * Emit a WebSocket event via the WS service's HTTP API.
 * Best-effort - won't throw if WS service is unavailable.
 * In serverless environments, this is a no-op.
 */
export function emitWsEvent(event: string, data: unknown) {
  // Skip in serverless environments - WebSocket service won't be available
  if (isServerless()) {
    return
  }

  // Fire and forget - use fetch to the WS service
  try {
    fetch(`http://localhost:${WS_PORT}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    }).catch(() => {
      // Best-effort
    })
  } catch {
    // Best-effort
  }
}
