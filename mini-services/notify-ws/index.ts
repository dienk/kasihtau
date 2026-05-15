import { createServer, IncomingMessage, ServerResponse } from 'http'
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

// HTTP endpoint for emitting events from API routes
httpServer.on('request', (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'POST' && req.url === '/emit') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { event, data } = JSON.parse(body)
        if (event && typeof event === 'string') {
          addRecentEvent(event, data)
          io.emit(event, data)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }))
      }
    })
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

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
