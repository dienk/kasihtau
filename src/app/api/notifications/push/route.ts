import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// POST /api/notifications/push - Push filtered but unpushed notifications
export async function POST() {
  try {
    // Get the active push config
    const pushConfig = await db.pushConfig.findFirst({
      where: { isActive: true },
    })

    if (!pushConfig) {
      return NextResponse.json(
        { error: 'No active push configuration found' },
        { status: 400 }
      )
    }

    // Get all filtered but unpushed notifications
    const notifications = await db.notification.findMany({
      where: {
        isFiltered: true,
        isPushed: false,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (notifications.length === 0) {
      return NextResponse.json({
        message: 'No notifications to push',
        total: 0,
        success: 0,
        failed: 0,
        results: [],
      })
    }

    // Parse headers from config
    let headers: Record<string, string> = {}
    try {
      headers = JSON.parse(pushConfig.headers || '{}')
    } catch {
      headers = {}
    }

    const results = []
    let successCount = 0
    let failedCount = 0

    for (const notification of notifications) {
      const requestBody = {
        id: notification.id,
        appName: notification.appName,
        title: notification.title,
        message: notification.message,
        prefix: notification.prefix,
        filteredAt: notification.updatedAt.toISOString(),
        timestamp: new Date().toISOString(),
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
          successCount++

          // Update notification as pushed
          await db.notification.update({
            where: { id: notification.id },
            data: {
              isPushed: true,
              pushStatus: 'success',
            },
          })
        } else {
          logData.status = 'failed'
          logData.responseStatus = response.status
          logData.responseBody = responseText.substring(0, 5000)
          failedCount++

          await db.notification.update({
            where: { id: notification.id },
            data: {
              pushStatus: 'failed',
            },
          })
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logData.status = 'failed'
        logData.errorMessage = errorMessage
        failedCount++

        await db.notification.update({
          where: { id: notification.id },
          data: {
            pushStatus: 'failed',
          },
        })
      }

      // Create push log entry
      await db.pushLog.create({ data: logData })

      results.push({
        notificationId: notification.id,
        title: notification.title,
        status: logData.status,
      })
    }

    return NextResponse.json({
      message: 'Push completed',
      total: notifications.length,
      success: successCount,
      failed: failedCount,
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
