import { NextResponse } from 'next/server'
import {
  getActivePushConfigs,
  getFilteredUnpushedNotifications,
  createPushLog,
  updateNotification,
} from '@/lib/supabase-db'
import { emitWsEvent } from '@/lib/ws-client'

// POST /api/notifications/push - Push filtered but unpushed notifications to ALL active push configs
export async function POST() {
  try {
    // Get ALL active push configs
    const pushConfigs = await getActivePushConfigs()

    if (pushConfigs.length === 0) {
      return NextResponse.json(
        { error: 'No active push configuration found' },
        { status: 400 }
      )
    }

    // Get all filtered but unpushed notifications
    const notifications = await getFilteredUnpushedNotifications()

    if (notifications.length === 0) {
      return NextResponse.json({
        message: 'No notifications to push',
        total: 0,
        success: 0,
        failed: 0,
        results: [],
      })
    }

    const results = []
    let successCount = 0
    let failedCount = 0

    for (const notification of notifications) {
      const updatedStr = notification.updatedAt instanceof Date
        ? notification.updatedAt.toISOString()
        : String(notification.updatedAt)

      const requestBody = {
        id: notification.id,
        appName: notification.appName,
        title: notification.title,
        message: notification.message,
        prefix: notification.prefix,
        filteredAt: updatedStr,
        timestamp: new Date().toISOString(),
      }

      let notifAnySuccess = false
      let notifAnyAttempt = false

      // Push to ALL active push configs
      for (const pushConfig of pushConfigs) {
        // Parse headers from config
        let headers: Record<string, string> = {}
        try {
          headers = JSON.parse(pushConfig.headers || '{}')
        } catch {
          headers = {}
        }

        const logData: {
          notificationId: string
          pushConfigId: string
          status: string
          requestBody: string
          responseStatus?: number
          responseBody?: string
          errorMessage?: string
        } = {
          notificationId: notification.id,
          pushConfigId: pushConfig.id,
          status: 'pending',
          requestBody: JSON.stringify(requestBody),
        }

        notifAnyAttempt = true

        try {
          const fetchOptions: RequestInit = {
            method: pushConfig.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
          }

          if (pushConfig.method !== 'GET') {
            fetchOptions.body = JSON.stringify(requestBody)
          }

          const response = await fetch(pushConfig.url, fetchOptions)
          const responseText = await response.text()

          if (response.ok) {
            logData.status = 'success'
            logData.responseStatus = response.status
            logData.responseBody = responseText.substring(0, 5000)
            notifAnySuccess = true

            // Emit push success event
            emitWsEvent('notification:pushed', {
              id: notification.id,
              title: notification.title,
              prefix: notification.prefix,
              pushUrl: pushConfig.url,
              responseStatus: response.status,
            })
          } else {
            logData.status = 'failed'
            logData.responseStatus = response.status
            logData.responseBody = responseText.substring(0, 5000)

            // Emit push failed event
            emitWsEvent('notification:push-failed', {
              id: notification.id,
              title: notification.title,
              prefix: notification.prefix,
              pushUrl: pushConfig.url,
              responseStatus: response.status,
              error: responseText.substring(0, 200),
            })
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          logData.status = 'failed'
          logData.errorMessage = errorMessage

          // Emit push failed event
          emitWsEvent('notification:push-failed', {
            id: notification.id,
            title: notification.title,
            prefix: notification.prefix,
            pushUrl: pushConfig.url,
            error: errorMessage,
          })
        }

        // Create push log entry
        await createPushLog(logData)
      }

      // Update notification status
      if (notifAnySuccess) {
        successCount++
        await updateNotification(notification.id, {
          isPushed: true,
          pushStatus: 'success',
        })
      } else if (notifAnyAttempt) {
        failedCount++
        await updateNotification(notification.id, {
          pushStatus: 'failed',
        })
      }

      results.push({
        notificationId: notification.id,
        title: notification.title,
        status: notifAnySuccess ? 'success' : ('failed' as string),
        configsPushed: pushConfigs.length,
      } as Record<string, unknown>)
    }

    return NextResponse.json({
      message: 'Push completed',
      total: notifications.length,
      success: successCount,
      failed: failedCount,
      configsUsed: pushConfigs.length,
      results,
    })
  } catch (error) {
    console.error('Error pushing notifications:', error)
    return NextResponse.json(
      { error: 'Failed to push notifications' },
      { status: 500 }
    )
  }
}
