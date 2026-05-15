'use client'

import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Globe,
  Filter,
  Send,
  Zap,
  Trash2,
  Clock,
  Copy,
  Check,
  ArrowRight,
  Bell,
  Radio,
  Database,
} from 'lucide-react'
import { CatLogo } from '@/components/cat-logo'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ─── Types ──────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface EndpointData {
  method: HttpMethod
  path: string
  description: string
  requestBody?: string
  responseBody: string
  curlCommand: string
  queryParams?: string
}

// ─── Method Badge Colors ────────────────────────────────────────────────────

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-sky-600 text-white',
  POST: 'bg-emerald-600 text-white',
  PATCH: 'bg-amber-600 text-white',
  DELETE: 'bg-red-600 text-white',
}

const methodBorderColors: Record<HttpMethod, string> = {
  GET: 'border-l-sky-600',
  POST: 'border-l-emerald-600',
  PATCH: 'border-l-amber-600',
  DELETE: 'border-l-red-600',
}

// ─── Code Block Component ───────────────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [code])

  return (
    <div className="relative group">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            {label}
          </span>
        </div>
      )}
      <div className="relative">
        <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 text-xs leading-relaxed overflow-x-auto font-mono">
          <code>{code}</code>
        </pre>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Endpoint Card Component ────────────────────────────────────────────────

function EndpointCard({ endpoint }: { endpoint: EndpointData }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card
        className={`py-0 gap-0 border-l-4 ${methodBorderColors[endpoint.method]} transition-shadow hover:shadow-sm`}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    className={`${methodColors[endpoint.method]} text-xs font-bold px-2.5 py-0.5 rounded shrink-0`}
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm font-mono font-semibold text-foreground truncate">
                    {endpoint.path}
                  </code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block max-w-[200px] truncate">
                    {endpoint.description}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 sm:hidden">
                {endpoint.description}
              </p>
            </CardContent>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <Separator />
            <p className="text-sm text-muted-foreground">
              {endpoint.description}
            </p>
            {endpoint.queryParams && (
              <div>
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Query Parameters
                </span>
                <div className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md p-3 font-mono">
                  {endpoint.queryParams}
                </div>
              </div>
            )}
            {endpoint.requestBody && (
              <CodeBlock code={endpoint.requestBody} label="Request Body" />
            )}
            <CodeBlock code={endpoint.responseBody} label="Response" />
            <CodeBlock code={endpoint.curlCommand} label="cURL" />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ─── Pipeline Flow Component ────────────────────────────────────────────────

function PipelineFlow() {
  const steps = [
    {
      icon: Bell,
      label: 'Notification Received',
      detail: 'POST /api/notifications',
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-100 dark:bg-sky-900/30',
      border: 'border-sky-200 dark:border-sky-800',
    },
    {
      icon: Filter,
      label: 'Auto-Filter',
      detail: 'Match against active filter rules',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      border: 'border-amber-200 dark:border-amber-800',
    },
    {
      icon: Send,
      label: 'Auto-Push',
      detail: 'POST to active webhook URLs',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      icon: Database,
      label: 'Log Result',
      detail: 'Store push status in logs',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      border: 'border-purple-200 dark:border-purple-800',
    },
  ]

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, index) => {
        const Icon = step.icon
        return (
          <div key={step.label}>
            <div
              className={`flex items-center gap-3 p-3 rounded-lg border ${step.border} ${step.bg}`}
            >
              <div className="flex items-center justify-center size-9 rounded-md bg-background shrink-0">
                <Icon className={`size-5 ${step.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {step.detail}
                </p>
              </div>
              <div className="ml-auto shrink-0">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${step.color} border-current/20`}
                >
                  Step {index + 1}
                </Badge>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowRight className="size-4 text-muted-foreground rotate-90" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Endpoint Data ──────────────────────────────────────────────────────────

const notificationEndpoints: EndpointData[] = [
  {
    method: 'GET',
    path: '/api/notifications',
    description: 'List all notifications with optional filtering and search',
    queryParams:
      '?filter=filtered|unfiltered|pushed|unread\n?search=keyword',
    responseBody: `[
  {
    "id": "9500b5f6-60ae-414d-b70a-7049d946cbb6",
    "appName": "Slack",
    "title": "Alert from Slack",
    "message": "[URGENT] Server is down",
    "prefix": "[URGENT]",
    "isRead": false,
    "isFiltered": true,
    "isPushed": true,
    "pushStatus": "success",
    "createdAt": "2026-05-15T14:27:27.057+00:00",
    "updatedAt": "2026-05-15T14:27:28.124+00:00"
  }
]`,
    curlCommand:
      'curl http://localhost:3000/api/notifications\n\n# With filters\ncurl "http://localhost:3000/api/notifications?filter=filtered&search=URGENT"',
  },
  {
    method: 'POST',
    path: '/api/notifications',
    description:
      'Create a new notification. Automatically applies filter rules and pushes to webhooks if matched.',
    requestBody: `{
  "appName": "Slack",
  "title": "Alert from Slack",
  "message": "[URGENT] Server is down"
}`,
    responseBody: `{
  "id": "9500b5f6-60ae-414d-b70a-7049d946cbb6",
  "appName": "Slack",
  "title": "Alert from Slack",
  "message": "[URGENT] Server is down",
  "prefix": "[URGENT]",
  "isRead": false,
  "isFiltered": true,
  "isPushed": false,
  "pushStatus": "pending",
  "createdAt": "2026-05-15T14:27:27.057+00:00",
  "updatedAt": "2026-05-15T14:27:27.057+00:00",
  "autoPushResult": {
    "pushed": true,
    "status": "success",
    "configsPushed": 1
  }
}`,
    curlCommand: `curl -X POST http://localhost:3000/api/notifications \\
  -H "Content-Type: application/json" \\
  -d '{"appName":"Slack","title":"Alert from Slack","message":"[URGENT] Server is down"}'`,
  },
  {
    method: 'DELETE',
    path: '/api/notifications',
    description: 'Clear all notifications from the database',
    responseBody: `{
  "message": "Cleared 24 notifications",
  "deletedCount": 24
}`,
    curlCommand:
      'curl -X DELETE http://localhost:3000/api/notifications',
  },
  {
    method: 'POST',
    path: '/api/notifications/simulate',
    description:
      'Generate random test notifications for development and testing',
    requestBody: `{
  "count": 5
}`,
    responseBody: `{
  "message": "Generated 5 simulated notifications",
  "count": 5,
  "filtered": 2,
  "autoPushed": 2,
  "notifications": ["..."]
}`,
    curlCommand: `curl -X POST http://localhost:3000/api/notifications/simulate \\
  -H "Content-Type: application/json" \\
  -d '{"count":5}'`,
  },
  {
    method: 'POST',
    path: '/api/notifications/push',
    description:
      'Manually push all filtered and unpushed notifications to all active webhook endpoints',
    responseBody: `{
  "message": "Push completed",
  "total": 3,
  "success": 2,
  "failed": 1,
  "configsUsed": 2,
  "results": [
    {
      "notificationId": "9500b5f6-...",
      "title": "Alert from Slack",
      "status": "success",
      "configsPushed": 2
    }
  ]
}`,
    curlCommand:
      'curl -X POST http://localhost:3000/api/notifications/push',
  },
]

const filterRuleEndpoints: EndpointData[] = [
  {
    method: 'GET',
    path: '/api/settings/filter-rules',
    description: 'List all configured filter rules',
    responseBody: `[
  {
    "id": "c31a9583-f799-4dcf-98e9-204afbb71805",
    "prefix": "[URGENT]",
    "matchMode": "startsWith",
    "isActive": true,
    "createdAt": "2026-05-15T14:18:43.84+00:00",
    "updatedAt": "2026-05-15T14:18:43.84+00:00"
  }
]`,
    curlCommand:
      'curl http://localhost:3000/api/settings/filter-rules',
  },
  {
    method: 'POST',
    path: '/api/settings/filter-rules',
    description: 'Create a new filter rule',
    requestBody: `{
  "prefix": "[URGENT]",
  "matchMode": "startsWith",
  "isActive": true
}`,
    responseBody: `{
  "id": "c31a9583-f799-4dcf-98e9-204afbb71805",
  "prefix": "[URGENT]",
  "matchMode": "startsWith",
  "isActive": true,
  "createdAt": "2026-05-15T14:18:43.84+00:00",
  "updatedAt": "2026-05-15T14:18:43.84+00:00"
}`,
    curlCommand: `curl -X POST http://localhost:3000/api/settings/filter-rules \\
  -H "Content-Type: application/json" \\
  -d '{"prefix":"[URGENT]","matchMode":"startsWith","isActive":true}'`,
  },
  {
    method: 'PATCH',
    path: '/api/settings/filter-rules/:id',
    description: 'Update a filter rule (e.g., toggle active status)',
    requestBody: `{
  "isActive": false
}`,
    responseBody: `{
  "id": "c31a9583-f799-4dcf-98e9-204afbb71805",
  "prefix": "[URGENT]",
  "matchMode": "startsWith",
  "isActive": false,
  "createdAt": "2026-05-15T14:18:43.84+00:00",
  "updatedAt": "2026-05-15T14:20:00.00+00:00"
}`,
    curlCommand: `curl -X PATCH http://localhost:3000/api/settings/filter-rules/c31a9583-... \\
  -H "Content-Type: application/json" \\
  -d '{"isActive":false}'`,
  },
  {
    method: 'DELETE',
    path: '/api/settings/filter-rules/:id',
    description: 'Delete a filter rule permanently',
    responseBody: `{
  "message": "Filter rule deleted"
}`,
    curlCommand:
      'curl -X DELETE http://localhost:3000/api/settings/filter-rules/c31a9583-...',
  },
]

const pushConfigEndpoints: EndpointData[] = [
  {
    method: 'GET',
    path: '/api/settings/push-config',
    description: 'List all push configuration endpoints',
    responseBody: `[
  {
    "id": "630b9954-b62a-4f76-bbd7-5da25b2bd263",
    "url": "https://your-webhook.com/endpoint",
    "method": "POST",
    "headers": "{}",
    "isActive": true,
    "createdAt": "2026-05-15T13:52:44.309+00:00",
    "updatedAt": "2026-05-15T13:52:44.309+00:00"
  }
]`,
    curlCommand:
      'curl http://localhost:3000/api/settings/push-config',
  },
  {
    method: 'POST',
    path: '/api/settings/push-config',
    description: 'Create a new push configuration (webhook endpoint)',
    requestBody: `{
  "url": "https://your-webhook.com/endpoint",
  "method": "POST",
  "headers": "{}"
}`,
    responseBody: `{
  "id": "630b9954-b62a-4f76-bbd7-5da25b2bd263",
  "url": "https://your-webhook.com/endpoint",
  "method": "POST",
  "headers": "{}",
  "isActive": true,
  "createdAt": "2026-05-15T13:52:44.309+00:00",
  "updatedAt": "2026-05-15T13:52:44.309+00:00"
}`,
    curlCommand: `curl -X POST http://localhost:3000/api/settings/push-config \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://your-webhook.com/endpoint","method":"POST","headers":"{}"}'`,
  },
  {
    method: 'PATCH',
    path: '/api/settings/push-config/:id',
    description: 'Update a push configuration (e.g., toggle active status)',
    requestBody: `{
  "isActive": false
}`,
    responseBody: `{
  "id": "630b9954-b62a-4f76-bbd7-5da25b2bd263",
  "url": "https://your-webhook.com/endpoint",
  "method": "POST",
  "headers": "{}",
  "isActive": false,
  "createdAt": "2026-05-15T13:52:44.309+00:00",
  "updatedAt": "2026-05-15T14:00:00.00+00:00"
}`,
    curlCommand: `curl -X PATCH http://localhost:3000/api/settings/push-config/630b9954-... \\
  -H "Content-Type: application/json" \\
  -d '{"isActive":false}'`,
  },
  {
    method: 'DELETE',
    path: '/api/settings/push-config/:id',
    description: 'Delete a push configuration permanently',
    responseBody: `{
  "message": "Push configuration deleted"
}`,
    curlCommand:
      'curl -X DELETE http://localhost:3000/api/settings/push-config/630b9954-...',
  },
]

const logEndpoints: EndpointData[] = [
  {
    method: 'GET',
    path: '/api/push-logs',
    description: 'Retrieve push history logs with optional limit',
    queryParams: '?limit=1-100 (default: 50)',
    responseBody: `[
  {
    "id": "c6692314-...",
    "notificationId": "9500b5f6-...",
    "pushConfigId": "630b9954-...",
    "status": "success",
    "requestBody": "{...}",
    "responseStatus": 200,
    "responseBody": "OK",
    "errorMessage": null,
    "pushedAt": "2026-05-15T14:27:28.124+00:00",
    "notification": {
      "id": "9500b5f6-...",
      "appName": "Slack",
      "title": "Alert from Slack",
      "message": "[URGENT] Server is down",
      "prefix": "[URGENT]"
    }
  }
]`,
    curlCommand:
      'curl http://localhost:3000/api/push-logs?limit=20',
  },
]

// ─── Webhook Payload Data ───────────────────────────────────────────────────

const webhookPayload = `{
  "id": "9500b5f6-60ae-414d-b70a-7049d946cbb6",
  "appName": "Slack",
  "title": "Alert from Slack",
  "message": "[URGENT] Server is down",
  "prefix": "[URGENT]",
  "filteredAt": "2026-05-15T14:27:27.057+00:00",
  "timestamp": "2026-05-15T14:27:28.124Z"
}`

// ─── Main Component ─────────────────────────────────────────────────────────

export function ApiDocs() {
  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="px-4 pb-8 pt-4 space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center h-8 w-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30">
              <CatLogo className="size-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">API Documentation</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Complete reference for the NPush REST API. All endpoints are
            relative to <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">http://localhost:3000</code>
          </p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {(['GET', 'POST', 'PATCH', 'DELETE'] as HttpMethod[]).map((method) => (
              <div key={method} className="flex items-center gap-1.5">
                <Badge className={`${methodColors[method]} text-[10px] font-bold px-1.5 py-0 rounded`}>
                  {method}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {method === 'GET' && 'Read'}
                  {method === 'POST' && 'Create'}
                  {method === 'PATCH' && 'Update'}
                  {method === 'DELETE' && 'Delete'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* ── Pipeline Flow ───────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Radio className="size-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Pipeline Flow</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            When a notification is created via <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">POST /api/notifications</code>,
            it automatically passes through the filter-and-push pipeline:
          </p>
          <PipelineFlow />
        </section>

        <Separator />

        {/* ── Webhook Payload ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Send className="size-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Push Webhook JSON</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            When a filtered notification is pushed, this is the exact JSON payload
            sent to each active webhook endpoint via <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">POST</code>:
          </p>
          <CodeBlock
            code={webhookPayload}
            label="Webhook Payload"
          />
          <div className="mt-3 bg-muted/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Zap className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  The <code className="font-mono bg-muted px-1 rounded">filteredAt</code> field
                  indicates when the notification matched a filter rule.
                </p>
                <p>
                  The <code className="font-mono bg-muted px-1 rounded">timestamp</code> field
                  indicates when the push was initiated.
                </p>
                <p>
                  Custom headers from the push configuration will be included in the request.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Notifications Endpoints ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="size-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Create, read, and manage notifications. Creating a notification
            triggers the auto-filter and auto-push pipeline automatically.
          </p>
          <div className="flex flex-col gap-3">
            {notificationEndpoints.map((ep) => (
              <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Filter Rules Endpoints ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="size-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Filter Rules</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Define prefix-based rules to automatically filter incoming
            notifications. Active rules are checked against every new notification.
          </p>
          <div className="flex flex-col gap-3">
            {filterRuleEndpoints.map((ep) => (
              <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Push Config Endpoints ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="size-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Push Configurations</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Manage webhook endpoints where filtered notifications are pushed.
            Each config defines a URL, HTTP method, and optional custom headers.
          </p>
          <div className="flex flex-col gap-3">
            {pushConfigEndpoints.map((ep) => (
              <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Push Logs Endpoints ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Push Logs</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            View the history of push attempts, including status codes, response
            bodies, and error messages for troubleshooting.
          </p>
          <div className="flex flex-col gap-3">
            {logEndpoints.map((ep) => (
              <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Data Models ─────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Database className="size-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Data Models</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Reference for the key data structures returned by the API.
          </p>
          <div className="flex flex-col gap-4">
            <CodeBlock
              label="Notification Object"
              code={`{
  "id": "9500b5f6-60ae-414d-b70a-7049d946cbb6",
  "appName": "Slack",
  "title": "Alert from Slack",
  "message": "[URGENT] Server is down",
  "prefix": "[URGENT]",           // Matched filter prefix, or null
  "isRead": false,
  "isFiltered": true,             // True if matched any active filter rule
  "isPushed": true,               // True if successfully pushed to webhooks
  "pushStatus": "success",        // "success" | "failed" | "pending"
  "createdAt": "2026-05-15T14:27:27.057+00:00",
  "updatedAt": "2026-05-15T14:27:28.124+00:00"
}`}
            />
            <CodeBlock
              label="Filter Rule Object"
              code={`{
  "id": "c31a9583-f799-4dcf-98e9-204afbb71805",
  "prefix": "[URGENT]",           // The text pattern to match
  "matchMode": "startsWith",      // "startsWith" | "contains"
  "isActive": true,               // Only active rules are evaluated
  "createdAt": "2026-05-15T14:18:43.84+00:00",
  "updatedAt": "2026-05-15T14:18:43.84+00:00"
}`}
            />
            <CodeBlock
              label="Push Config Object"
              code={`{
  "id": "630b9954-b62a-4f76-bbd7-5da25b2bd263",
  "url": "https://your-webhook.com/endpoint",
  "method": "POST",               // "POST" | "GET"
  "headers": "{}",                // JSON string of custom headers
  "isActive": true,               // Only active configs receive pushes
  "createdAt": "2026-05-15T13:52:44.309+00:00",
  "updatedAt": "2026-05-15T13:52:44.309+00:00"
}`}
            />
            <CodeBlock
              label="Push Log Object"
              code={`{
  "id": "c6692314-...",
  "notificationId": "9500b5f6-...",
  "pushConfigId": "630b9954-...",
  "status": "success",            // "success" | "failed"
  "requestBody": "{...}",         // The JSON payload sent
  "responseStatus": 200,          // HTTP status from webhook, or null
  "responseBody": "OK",           // Response from webhook, or null
  "errorMessage": null,           // Error details if push failed
  "pushedAt": "2026-05-15T14:27:28.124+00:00",
  "notification": {               // Embedded notification summary
    "id": "9500b5f6-...",
    "appName": "Slack",
    "title": "Alert from Slack",
    "message": "[URGENT] Server is down",
    "prefix": "[URGENT]"
  }
}`}
            />
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            NPush API v1.0 -- All endpoints accept and return JSON.
          </p>
        </div>
      </div>
    </ScrollArea>
  )
}
