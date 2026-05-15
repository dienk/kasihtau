import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Store recent events for new connections
interface RecentEvent {
  type: string
  data: unknown
  timestamp: string
}

const recentEvents: RecentEvent[] = []
const MAX_RECENT = 50

function addRecentEvent(type: string, data: unknown) {
  recentEvents.push({ type, data, timestamp: new Date().toISOString() })
  if (recentEvents.length > MAX_RECENT) {
    recentEvents.shift()
  }
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Send recent events to newly connected client
  socket.emit('recent-events', recentEvents)

  // Handle test events
  socket.on('test', (data) => {
    console.log('Received test message:', data)
    socket.emit('test-response', {
      message: 'Server received test message',
      data: data,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle manual push trigger (from API routes)
  socket.on('notification:created', (data) => {
    addRecentEvent('notification:created', data)
    io.emit('notification:created', data)
  })

  socket.on('notification:filtered', (data) => {
    addRecentEvent('notification:filtered', data)
    io.emit('notification:filtered', data)
  })

  socket.on('notification:pushed', (data) => {
    addRecentEvent('notification:pushed', data)
    io.emit('notification:pushed', data)
  })

  socket.on('notification:push-failed', (data) => {
    addRecentEvent('notification:push-failed', data)
    io.emit('notification:push-failed', data)
  })

  socket.on('notifications:bulk-created', (data) => {
    addRecentEvent('notifications:bulk-created', data)
    io.emit('notifications:bulk-created', data)
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`NotifyPush WebSocket server running on port ${PORT}`)
})

// Export io for use in API routes (via emit helper)
export { io }

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})
