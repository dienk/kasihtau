import { db } from '@/lib/db'
import { emitWsEvent } from './ws-client'

/**
 * Auto-push a filtered notification to ALL active push config URLs.
 * Called automatically when a notification matches a filter rule.
 * Also emits WebSocket events for real-time UI updates.
 */
export async function autoPushNotification(notification: {
  id: string
  appName: string
  title: string
  message: string
  prefix: string | null
  updatedAt: Date
}) {
  // Emit notification:filtered event
  emitWsEvent('notification:filtered', {
    id: notification.id,
    appName: notification.appName,
    title: notification.title,
    prefix: notification.prefix,
  })

  // Get ALL active push configs
  const pushConfigs = await db.pushConfig.findMany({
    where: { isActive: true },
  })

  if (pushConfigs.length === 0) {
    // No active push config - notification stays filtered but not pushed
    return { pushed: false, reason: 'no_active_config' }
  }

  const requestBody = {
    id: notification.id,
    appName: notification.appName,
    title: notification.title,
    message: notification.message,
    prefix: notification.prefix,
    filteredAt: notification.updatedAt.toISOString(),
    timestamp: new Date().toISOString(),
  }

  let anySuccess = false
  let anyAttempt = false

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

    anyAttempt = true

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
        anySuccess = true

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
    } finally {
      await db.pushLog.create({ data: logData })
    }
  }

  // Update the notification push status based on results
  if (anySuccess) {
    await db.notification.update({
      where: { id: notification.id },
      data: {
        isPushed: true,
        pushStatus: 'success',
      },
    })
  } else if (anyAttempt) {
    await db.notification.update({
      where: { id: notification.id },
      data: {
        pushStatus: 'failed',
      },
    })
  }

  return {
    pushed: anyAttempt,
    status: anySuccess ? 'success' : 'failed',
    configsPushed: pushConfigs.length,
  }
}
