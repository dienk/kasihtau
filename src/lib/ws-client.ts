/**
 * WebSocket event emission for server-side.
 * Best-effort - won't throw if WS service is unavailable.
 * Uses a simple fetch-based approach to avoid bundling socket.io-client on the server.
 */

const WS_PORT = process.env.WS_PORT || '3003'

/**
 * Emit a WebSocket event via the WS service's HTTP API.
 * Best-effort - won't throw if WS service is unavailable.
 */
export function emitWsEvent(event: string, data: unknown) {
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
