import { io, Socket } from 'socket.io-client'

// Singleton Socket.io client for server-side event emission
// This allows API routes to emit events to the WebSocket service
let wsClient: Socket | null = null

export function getWsClient(): Socket {
  if (!wsClient) {
    wsClient = io('http://localhost:3003', {
      path: '/',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      timeout: 3000,
    })

    wsClient.on('connect', () => {
      console.log('[WS Client] Connected to WebSocket service')
    })

    wsClient.on('disconnect', () => {
      console.log('[WS Client] Disconnected from WebSocket service')
    })

    wsClient.on('connect_error', (err) => {
      // Silent - WS service might not be running yet
    })
  }

  return wsClient
}

/**
 * Emit a WebSocket event to all connected clients.
 * Best-effort - won't throw if WS service is unavailable.
 */
export function emitWsEvent(event: string, data: unknown) {
  try {
    const client = getWsClient()
    if (client.connected) {
      client.emit(event, data)
    } else {
      // Try to connect and emit
      client.connect()
      client.on('connect', () => {
        client.emit(event, data)
      })
    }
  } catch {
    // Best-effort emission
  }
}
