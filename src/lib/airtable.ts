/**
 * Airtable integration helper.
 * Pushes filtered notification records to an Airtable base.
 */

export interface AirtableRecord {
  NotifId: string
  AppName: string
  Title: string
  Message: string
  Prefix: string | null
  FilteredAt: string
  Timestamp: string
}

export interface AirtablePushResult {
  success: boolean
  recordId?: string
  error?: string
}

/**
 * Push a notification record to Airtable.
 */
export async function pushToAirtable(
  config: { baseId: string; token: string; tableName: string },
  record: AirtableRecord
): Promise<AirtablePushResult> {
  const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          NotifId: record.NotifId,
          AppName: record.AppName,
          Title: record.Title,
          Message: record.Message,
          Prefix: record.Prefix || '',
          FilteredAt: record.FilteredAt,
          Timestamp: record.Timestamp,
        },
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, recordId: data.id }
    } else {
      const errorText = await response.text()
      return { success: false, error: `Airtable ${response.status}: ${errorText.substring(0, 200)}` }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

/**
 * Test Airtable connection by trying to list records (limit 1).
 */
export async function testAirtableConnection(
  config: { baseId: string; token: string; tableName: string }
): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}?maxRecords=1`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    })

    if (response.ok) {
      return { ok: true }
    } else {
      const errorText = await response.text()
      return { ok: false, error: `Airtable ${response.status}: ${errorText.substring(0, 200)}` }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: errorMessage }
  }
}
