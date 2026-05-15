'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import {
  Bell,
  Settings,
  History,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BellRing,
  Filter,
  Zap,
  Globe,
  Clock,
  Mail,
  MailOpen,
  ArrowUpRight,
  Wifi,
  WifiOff,
  Radio,
} from 'lucide-react'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// ─── Types (aligned with Prisma schema) ─────────────────────────────────────

interface NotificationItem {
  id: string
  appName: string
  title: string
  message: string
  prefix: string | null
  isRead: boolean
  isFiltered: boolean
  isPushed: boolean
  pushStatus: string
  createdAt: string
  updatedAt: string
}

interface FilterRuleItem {
  id: string
  prefix: string
  matchMode: string // "startsWith" or "contains"
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PushConfigItem {
  id: string
  url: string
  method: string
  headers: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PushLogItem {
  id: string
  notificationId: string
  pushConfigId: string | null
  status: string
  requestBody: string
  responseStatus: number | null
  responseBody: string | null
  errorMessage: string | null
  pushedAt: string
  notification: {
    id: string
    appName: string
    title: string
    message: string
    prefix: string | null
  }
}

type NotificationFilter = 'all' | 'unread' | 'filtered' | 'pushed'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function tryParseJson(str: string): string {
  try {
    const parsed = JSON.parse(str)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return str
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Home() {
  // ── State ───────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState('notifications')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [filterRules, setFilterRules] = useState<FilterRuleItem[]>([])
  const [pushConfigs, setPushConfigs] = useState<PushConfigItem[]>([])
  const [pushLogs, setPushLogs] = useState<PushLogItem[]>([])

  const [notifFilter, setNotifFilter] = useState<NotificationFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Notification detail dialog
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Push log expand
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // WebSocket connection state
  const [isWsConnected, setIsWsConnected] = useState(false)
  const socketRef = useRef<ReturnType<typeof io> | null>(null)

  // Settings forms
  const [newRulePrefix, setNewRulePrefix] = useState('')
  const [newRuleMatchMode, setNewRuleMatchMode] = useState<'contains' | 'startsWith'>('contains')
  const [newConfigUrl, setNewConfigUrl] = useState('')
  const [newConfigMethod, setNewConfigMethod] = useState<'POST' | 'GET'>('POST')
  const [newConfigHeaders, setNewConfigHeaders] = useState('')

  // ── Data Fetching ──────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch {
      // API not yet available
    }
  }, [])

  const fetchFilterRules = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/filter-rules')
      if (res.ok) {
        const data = await res.json()
        setFilterRules(data)
      }
    } catch {
      // API not yet available
    }
  }, [])

  const fetchPushConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/push-config')
      if (res.ok) {
        const data = await res.json()
        setPushConfigs(data)
      }
    } catch {
      // API not yet available
    }
  }, [])

  const fetchPushLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/push-logs')
      if (res.ok) {
        const data = await res.json()
        setPushLogs(data)
      }
    } catch {
      // API not yet available
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchNotifications(),
      fetchFilterRules(),
      fetchPushConfigs(),
      fetchPushLogs(),
    ])
    setLoading(false)
  }, [fetchNotifications, fetchFilterRules, fetchPushConfigs, fetchPushLogs])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── WebSocket Connection ───────────────────────────────────────────────

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 5000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsWsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsWsConnected(false)
    })

    socket.on('notification:created', (data: { appName?: string }) => {
      fetchNotifications()
      toast.info(`New notification from ${data.appName ?? 'Unknown'}`)
    })

    socket.on('notification:filtered', (data: { prefix?: string }) => {
      fetchNotifications()
      toast('Filtered by "' + (data.prefix ?? 'unknown') + '"', {
        icon: <Filter className="size-4 text-amber-500" />,
      })
    })

    socket.on('notification:pushed', (data: { url?: string }) => {
      fetchNotifications()
      fetchPushLogs()
      toast.success('Pushed to ' + (data.url ?? 'endpoint'))
    })

    socket.on('notification:push-failed', (data: { error?: string }) => {
      fetchNotifications()
      fetchPushLogs()
      toast.error('Push failed: ' + (data.error ?? 'Unknown error'))
    })

    socket.on('notifications:bulk-created', (data: { count?: number }) => {
      fetchNotifications()
      toast.info(`${data.count ?? 0} new notifications received`)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [fetchNotifications, fetchPushLogs])

  // ── Actions ────────────────────────────────────────────────────────────

  const handleSimulate = async () => {
    setActionLoading('simulate')
    try {
      const res = await fetch('/api/notifications/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5 }),
      })
      if (res.ok) {
        toast.success('Test notifications generated!')
        await fetchNotifications()
      } else {
        toast.error('Failed to generate notifications')
      }
    } catch {
      toast.error('Failed to connect to server')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePushAll = async () => {
    setActionLoading('push')
    try {
      const res = await fetch('/api/notifications/push', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.total === 0) {
          toast.info('No filtered notifications to push')
        } else {
          toast.success(
            `Pushed: ${data.success ?? 0} success, ${data.failed ?? 0} failed`
          )
        }
        await fetchNotifications()
        await fetchPushLogs()
      } else {
        toast.error('Failed to push notifications')
      }
    } catch {
      toast.error('Failed to connect to server')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkAllRead = async () => {
    setActionLoading('markread')
    try {
      const unread = notifications.filter((n) => !n.isRead)
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/notifications/${n.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          })
        )
      )
      toast.success('All notifications marked as read')
      await fetchNotifications()
    } catch {
      toast.error('Failed to mark as read')
    } finally {
      setActionLoading(null)
    }
  }

  const handleNotificationClick = async (notif: NotificationItem) => {
    setSelectedNotif(notif)
    setDetailOpen(true)
    if (!notif.isRead) {
      try {
        await fetch(`/api/notifications/${notif.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        })
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        )
      } catch {
        // silent fail
      }
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Notification deleted')
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        setDetailOpen(false)
      } else {
        toast.error('Failed to delete notification')
      }
    } catch {
      toast.error('Failed to connect to server')
    }
  }

  const handleAddFilterRule = async () => {
    if (!newRulePrefix.trim()) {
      toast.error('Please enter a prefix')
      return
    }
    setActionLoading('addRule')
    try {
      const res = await fetch('/api/settings/filter-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: newRulePrefix.trim(), matchMode: newRuleMatchMode }),
      })
      if (res.ok) {
        toast.success('Filter rule added!')
        setNewRulePrefix('')
        setNewRuleMatchMode('contains')
        await fetchFilterRules()
        await fetchNotifications()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to add filter rule')
      }
    } catch {
      toast.error('Failed to connect to server')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleFilterRule = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/settings/filter-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (res.ok) {
        setFilterRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isActive } : r))
        )
        await fetchNotifications()
      } else {
        toast.error('Failed to update filter rule')
      }
    } catch {
      toast.error('Failed to connect to server')
    }
  }

  const handleDeleteFilterRule = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/filter-rules/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Filter rule deleted')
        setFilterRules((prev) => prev.filter((r) => r.id !== id))
        await fetchNotifications()
      } else {
        toast.error('Failed to delete filter rule')
      }
    } catch {
      toast.error('Failed to connect to server')
    }
  }

  const handleAddPushConfig = async () => {
    if (!newConfigUrl.trim()) {
      toast.error('Please enter a URL')
      return
    }
    setActionLoading('addConfig')
    try {
      const res = await fetch('/api/settings/push-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newConfigUrl.trim(),
          method: newConfigMethod,
          headers: newConfigHeaders || '{}',
        }),
      })
      if (res.ok) {
        toast.success('Push config added!')
        setNewConfigUrl('')
        setNewConfigMethod('POST')
        setNewConfigHeaders('')
        await fetchPushConfigs()
      } else {
        toast.error('Failed to add push config')
      }
    } catch {
      toast.error('Failed to connect to server')
    } finally {
      setActionLoading(null)
    }
  }

  const handleTogglePushConfig = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/settings/push-config/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (res.ok) {
        setPushConfigs((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive } : c))
        )
      } else {
        toast.error('Failed to update push config')
      }
    } catch {
      toast.error('Failed to connect to server')
    }
  }

  const handleDeletePushConfig = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/push-config/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Push config deleted')
        setPushConfigs((prev) => prev.filter((c) => c.id !== id))
      } else {
        toast.error('Failed to delete push config')
      }
    } catch {
      toast.error('Failed to connect to server')
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const filteredNotifications = notifications.filter((n) => {
    // Filter by category
    if (notifFilter === 'unread' && n.isRead) return false
    if (notifFilter === 'filtered' && !n.isFiltered) return false
    if (notifFilter === 'pushed' && !n.isPushed) return false

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.appName.toLowerCase().includes(q)
      )
    }

    return true
  })

  // Compute match counts for filter rules
  const getMatchCount = useCallback(
    (rulePrefix: string) => {
      return notifications.filter(
        (n) => n.prefix && n.prefix.toLowerCase() === rulePrefix.toLowerCase()
      ).length
    },
    [notifications]
  )

  // ── Loading Skeletons ──────────────────────────────────────────────────

  const NotificationSkeleton = () => (
    <Card className="py-0 gap-0">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardContent>
    </Card>
  )

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-600 text-white">
              <BellRing className="size-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">NotifyPush</h1>
            {/* Live Activity Indicator */}
            <div className="flex items-center gap-1 ml-1">
              <div
                className={`size-2 rounded-full ${
                  isWsConnected
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isWsConnected
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500'
                }`}
              >
                {isWsConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="h-6 min-w-6 flex items-center justify-center rounded-full px-1.5 text-xs"
              >
                {unreadCount}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchAll()}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Connection Status Banner ─────────────────────────────────────── */}
      {!isWsConnected && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <WifiOff className="size-4" />
              <span className="text-xs font-medium">
                Real-time updates disconnected — data may be delayed
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 gap-1"
              onClick={() => {
                if (socketRef.current) {
                  socketRef.current.disconnect()
                  socketRef.current.connect()
                }
              }}
            >
              <Radio className="size-3" />
              Reconnect
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl mx-auto w-full">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col"
        >
          {/* Tab Navigation */}
          <div className="sticky top-[57px] z-30 bg-background border-b">
            <div className="max-w-2xl mx-auto">
              <TabsList className="w-full h-12 rounded-none bg-transparent p-0 gap-0">
                <TabsTrigger
                  value="notifications"
                  className="flex-1 h-12 rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 gap-2 text-sm"
                >
                  <Bell className="size-4" />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-5 flex items-center justify-center rounded-full px-1 text-[10px]"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex-1 h-12 rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 gap-2 text-sm"
                >
                  <Settings className="size-4" />
                  <span>Settings</span>
                </TabsTrigger>
                <TabsTrigger
                  value="logs"
                  className="flex-1 h-12 rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 gap-2 text-sm"
                >
                  <History className="size-4" />
                  <span>Logs</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* ── Tab 1: Notifications ─────────────────────────────────────── */}
          <TabsContent value="notifications" className="flex-1 mt-0 px-4 pb-6">
            {/* Action Bar */}
            <div className="flex flex-col gap-3 py-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'unread', label: 'Unread' },
                    { key: 'filtered', label: 'Filtered' },
                    { key: 'pushed', label: 'Pushed' },
                  ] as const
                ).map((f) => (
                  <Button
                    key={f.key}
                    variant={notifFilter === f.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNotifFilter(f.key)}
                    className={`shrink-0 rounded-full h-8 text-xs ${
                      notifFilter === f.key
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : ''
                    }`}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulate}
                  disabled={actionLoading === 'simulate'}
                  className="gap-1.5"
                >
                  <Zap
                    className={`size-3.5 ${
                      actionLoading === 'simulate' ? 'animate-pulse' : ''
                    }`}
                  />
                  Simulate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePushAll}
                  disabled={actionLoading === 'push'}
                  className="gap-1.5"
                >
                  <Send
                    className={`size-3.5 ${
                      actionLoading === 'push' ? 'animate-pulse' : ''
                    }`}
                  />
                  Retry Failed
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={actionLoading === 'markread'}
                    className="gap-1.5"
                  >
                    <Check className="size-3.5" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <ScrollArea className="max-h-[calc(100vh-280px)]">
              <div className="flex flex-col gap-3 pr-1">
                {loading ? (
                  <>
                    <NotificationSkeleton />
                    <NotificationSkeleton />
                    <NotificationSkeleton />
                  </>
                ) : filteredNotifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Bell className="size-7 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">
                      {notifications.length === 0
                        ? 'No notifications yet'
                        : 'No matching notifications'}
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                      {notifications.length === 0
                        ? 'Click "Simulate" to generate test notifications and see them appear here.'
                        : 'Try adjusting your filters or search query.'}
                    </p>
                    {notifications.length === 0 && (
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={handleSimulate}
                      >
                        <Zap className="size-4" />
                        Generate Test Notifications
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <Card
                      key={notif.id}
                      className={`py-0 gap-0 cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                        !notif.isRead ? 'border-l-4 border-l-emerald-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium"
                            >
                              {notif.appName}
                            </Badge>
                            {!notif.isRead && (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                                <Mail className="size-3 mr-0.5" />
                                Unread
                              </Badge>
                            )}
                            {notif.isFiltered && (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
                                <Filter className="size-3 mr-0.5" />
                                Filtered
                              </Badge>
                            )}
                            {notif.isPushed ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                                <Send className="size-3 mr-0.5" />
                                Pushed
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs text-muted-foreground"
                              >
                                <Clock className="size-3 mr-0.5" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          {!notif.isRead && (
                            <div className="size-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
                          )}
                        </div>
                        <h4
                          className={`text-sm mb-1 ${
                            !notif.isRead ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Notification Count */}
            {!loading && filteredNotifications.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Showing {filteredNotifications.length} of{' '}
                {notifications.length} notifications
              </p>
            )}
          </TabsContent>

          {/* ── Tab 2: Settings ──────────────────────────────────────────── */}
          <TabsContent value="settings" className="flex-1 mt-0 px-4 pb-6">
            <div className="flex flex-col gap-6 py-4">
              {/* Filter Rules Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="size-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold">Filter Rules</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Define keywords or prefixes to automatically filter notifications
                  and push matching messages to your configured URL in real-time.
                  Use &quot;Contains&quot; to match anywhere in the message, or
                  &quot;Starts With&quot; for prefix-only matching.
                </p>

                {/* Add New Rule */}
                <Card className="py-0 gap-0 mb-4">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter prefix (e.g., URGENT, alert:, [DEPLOY])"
                        value={newRulePrefix}
                        onChange={(e) => setNewRulePrefix(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddFilterRule()
                        }}
                        className="flex-1"
                      />
                      <Select
                        value={newRuleMatchMode}
                        onValueChange={(v) =>
                          setNewRuleMatchMode(v as 'contains' | 'startsWith')
                        }
                      >
                        <SelectTrigger className="w-32 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="startsWith">Starts With</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {newRuleMatchMode === 'contains'
                          ? 'Matches if the message contains the prefix anywhere (case-insensitive)'
                          : 'Matches only if the message starts with the prefix (case-insensitive)'}
                      </p>
                      <Button
                        onClick={handleAddFilterRule}
                        disabled={actionLoading === 'addRule'}
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 shrink-0"
                      >
                        <Plus className="size-4" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Rules List */}
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Card key={i} className="py-0 gap-0">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-12" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filterRules.length === 0 ? (
                  <Alert>
                    <AlertCircle className="size-4" />
                    <AlertTitle>No filter rules</AlertTitle>
                    <AlertDescription>
                      Add a prefix above to start filtering notifications
                      automatically.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {filterRules.map((rule) => {
                      const matchCount = getMatchCount(rule.prefix)
                      return (
                        <Card key={rule.id} className="py-0 gap-0">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Switch
                                  checked={rule.isActive}
                                  onCheckedChange={(checked) =>
                                    handleToggleFilterRule(rule.id, checked)
                                  }
                                  className="data-[state=checked]:bg-emerald-600"
                                />
                                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                  <code className="text-sm font-mono font-medium bg-muted px-1.5 py-0.5 rounded">
                                    {rule.prefix}
                                  </code>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-5 px-1.5 shrink-0"
                                  >
                                    {rule.matchMode === 'startsWith'
                                      ? 'Starts With'
                                      : 'Contains'}
                                  </Badge>
                                  {matchCount > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {matchCount} match
                                      {matchCount !== 1 ? 'es' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => handleDeleteFilterRule(rule.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </section>

              <Separator />

              {/* Push Configuration Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="size-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold">Push Configuration</h2>
                  {pushConfigs.some((c) => c.isActive) && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs gap-1">
                      <Zap className="size-3" />
                      Auto-Push
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Filtered notifications are pushed here automatically in
                  real-time. You can also manually push remaining ones.
                </p>

                {/* Add New Config */}
                <Card className="py-0 gap-0 mb-4">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/webhook"
                        value={newConfigUrl}
                        onChange={(e) => setNewConfigUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value={newConfigMethod}
                        onValueChange={(v) =>
                          setNewConfigMethod(v as 'POST' | 'GET')
                        }
                      >
                        <SelectTrigger className="w-24 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="GET">GET</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      placeholder='Custom headers (JSON, e.g. {"Authorization": "Bearer xxx"})'
                      value={newConfigHeaders}
                      onChange={(e) => setNewConfigHeaders(e.target.value)}
                      className="min-h-16 text-xs font-mono"
                    />
                    <Button
                      onClick={handleAddPushConfig}
                      disabled={actionLoading === 'addConfig'}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                    >
                      <Plus className="size-4" />
                      Add Push Config
                    </Button>
                  </CardContent>
                </Card>

                {/* Configs List */}
                {loading ? (
                  <div className="space-y-3">
                    {[1].map((i) => (
                      <Card key={i} className="py-0 gap-0">
                        <CardContent className="p-4">
                          <Skeleton className="h-5 w-48 mb-2" />
                          <Skeleton className="h-4 w-24" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : pushConfigs.length === 0 ? (
                  <Alert>
                    <AlertCircle className="size-4" />
                    <AlertTitle>No push configurations</AlertTitle>
                    <AlertDescription>
                      Add a URL above to start pushing filtered notifications to
                      external services.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {pushConfigs.map((config) => {
                      let displayHeaders = ''
                      try {
                        const parsed = JSON.parse(config.headers)
                        if (Object.keys(parsed).length > 0) {
                          displayHeaders = JSON.stringify(parsed)
                        }
                      } catch {
                        displayHeaders = config.headers
                      }
                      return (
                        <Card key={config.id} className="py-0 gap-0">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Switch
                                  checked={config.isActive}
                                  onCheckedChange={(checked) =>
                                    handleTogglePushConfig(config.id, checked)
                                  }
                                  className="data-[state=checked]:bg-emerald-600"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs font-mono"
                                    >
                                      {config.method}
                                    </Badge>
                                    <p className="text-sm font-medium truncate">
                                      {config.url}
                                    </p>
                                  </div>
                                  {displayHeaders && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      Headers: {displayHeaders}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() =>
                                  handleDeletePushConfig(config.id)
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </TabsContent>

          {/* ── Tab 3: Push Logs ─────────────────────────────────────────── */}
          <TabsContent value="logs" className="flex-1 mt-0 px-4 pb-6">
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="size-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold">Push Logs</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPushLogs}
                  className="gap-1.5"
                >
                  <RefreshCw className="size-3.5" />
                  Refresh
                </Button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="py-0 gap-0">
                      <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : pushLogs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <History className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">No push logs</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Push logs will appear here once you push filtered
                    notifications to a configured endpoint.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[calc(100vh-220px)]">
                  <div className="flex flex-col gap-2 pr-1">
                    {pushLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id
                      const isSuccess = log.status === 'success'
                      return (
                        <Card
                          key={log.id}
                          className={`py-0 gap-0 transition-all ${
                            isSuccess
                              ? 'border-l-4 border-l-emerald-500'
                              : 'border-l-4 border-l-red-500'
                          }`}
                        >
                          <CardContent
                            className="p-4 cursor-pointer"
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log.id)
                            }
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {isSuccess ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs gap-1">
                                      <Check className="size-3" />
                                      Success
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs gap-1">
                                      <X className="size-3" />
                                      Failed
                                    </Badge>
                                  )}
                                  {log.responseStatus && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs font-mono"
                                    >
                                      {log.responseStatus}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium truncate">
                                  {log.notification?.title || 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  → {log.notification?.appName || 'Unknown'}
                                </p>
                              </div>
                              <div className="flex flex-col items-end shrink-0 gap-1">
                                <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                                  {formatRelativeTime(log.pushedAt)}
                                </p>
                                {isExpanded ? (
                                  <ChevronUp className="size-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="size-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t space-y-3">
                                {log.errorMessage && (
                                  <Alert variant="destructive">
                                    <AlertCircle className="size-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>
                                      {log.errorMessage}
                                    </AlertDescription>
                                  </Alert>
                                )}
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    Request Body
                                  </p>
                                  <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                                    {log.requestBody
                                      ? tryParseJson(log.requestBody)
                                      : '(empty)'}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    Response Body
                                  </p>
                                  <pre
                                    className={`text-xs rounded-md p-3 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all ${
                                      isSuccess
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30'
                                        : 'bg-red-50 dark:bg-red-950/30'
                                    }`}
                                  >
                                    {log.responseBody
                                      ? tryParseJson(log.responseBody)
                                      : '(empty)'}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Log count */}
              {!loading && pushLogs.length > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  {pushLogs.length} log {pushLogs.length === 1 ? 'entry' : 'entries'}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t">
        <div className="max-w-2xl mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          NotifyPush — Notification Manager
        </div>
      </footer>

      {/* ── Notification Detail Dialog ──────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedNotif && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {selectedNotif.appName}
                  </Badge>
                  {!selectedNotif.isRead && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                      <MailOpen className="size-3 mr-0.5" />
                      Unread
                    </Badge>
                  )}
                  {selectedNotif.isFiltered && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
                      <Filter className="size-3 mr-0.5" />
                      Filtered
                    </Badge>
                  )}
                  {selectedNotif.isPushed ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                      <ArrowUpRight className="size-3 mr-0.5" />
                      Pushed
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs text-muted-foreground"
                    >
                      <Clock className="size-3 mr-0.5" />
                      Pending
                    </Badge>
                  )}
                  {selectedNotif.prefix && (
                    <Badge
                      variant="outline"
                      className="text-xs font-mono"
                    >
                      {selectedNotif.prefix}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-left">
                  {selectedNotif.title}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {formatRelativeTime(selectedNotif.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {selectedNotif.message}
              </div>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteNotification(selectedNotif.id)}
                  className="gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailOpen(false)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
