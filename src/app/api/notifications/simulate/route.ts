import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { autoPushNotification } from '@/lib/auto-push'
import { emitWsEvent } from '@/lib/ws-client'

const APP_NAMES = [
  'Slack',
  'GitHub',
  'Jira',
  'Gmail',
  'Stripe',
  'Shopify',
  'Notion',
  'Figma',
  'Linear',
  'Vercel',
]

const MESSAGE_TEMPLATES = [
  '[URGENT] Server is down - immediate attention required',
  '[DEPLOY] Production deployment completed successfully',
  '[ALERT] High CPU usage detected on server-01',
  '[INFO] New user signup from referral program',
  '[PAYMENT] Invoice #1234 has been paid',
  '[BUG] Critical bug reported in checkout flow',
  '[REVIEW] Pull request #567 needs your review',
  '[RELEASE] Version 2.1.0 has been published',
  '[SECURITY] Unusual login attempt detected',
  '[TASK] New task assigned: Update API documentation',
  'Weekly digest: 23 new messages in your inbox',
  'Your subscription will renew in 3 days',
  'New comment on your design file',
  'Build completed with 2 warnings',
  'Meeting reminder: Team standup in 15 minutes',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const count = body.count || 5

    if (count < 1 || count > 50) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 50' },
        { status: 400 }
      )
    }

    // Get active filter rules to apply during creation
    const activeRules = await db.filterRule.findMany({
      where: { isActive: true },
    })

    const notifications = []
    let autoPushedCount = 0

    for (let i = 0; i < count; i++) {
      const appName = APP_NAMES[Math.floor(Math.random() * APP_NAMES.length)]
      const message =
        MESSAGE_TEMPLATES[Math.floor(Math.random() * MESSAGE_TEMPLATES.length)]
      const title = `Notification from ${appName}`

      // Check against filter rules
      let isFiltered = false
      let matchedPrefix: string | null = null

      for (const rule of activeRules) {
        if (message.toLowerCase().startsWith(rule.prefix.toLowerCase())) {
          isFiltered = true
          matchedPrefix = rule.prefix
          break
        }
      }

      const notification = await db.notification.create({
        data: {
          appName,
          title,
          message,
          isFiltered,
          prefix: matchedPrefix,
        },
      })

      notifications.push(notification)

      // Auto-push if filtered
      if (isFiltered) {
        // Run auto-push asynchronously (don't await to avoid blocking)
        autoPushNotification(notification).then((result) => {
          if (result.pushed) autoPushedCount++
        })
      }
    }

    // Emit bulk created event
    emitWsEvent('notifications:bulk-created', {
      count: notifications.length,
      filtered: notifications.filter((n) => n.isFiltered).length,
      appNames: [...new Set(notifications.map((n) => n.appName))],
    })

    return NextResponse.json(
      {
        message: `Generated ${count} simulated notifications`,
        count: notifications.length,
        filtered: notifications.filter((n) => n.isFiltered).length,
        autoPushed: autoPushedCount,
        notifications,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error simulating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to simulate notifications' },
      { status: 500 }
    )
  }
}
