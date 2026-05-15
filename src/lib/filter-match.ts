/**
 * Shared filter matching logic for notification messages.
 * Used by all API routes that apply filter rules.
 */

export type MatchMode = 'startsWith' | 'contains'

export interface FilterRuleLike {
  prefix: string
  matchMode?: string | null
}

/**
 * Check if a notification message matches a filter rule.
 *
 * - `startsWith`: message must start with the prefix (case-insensitive)
 * - `contains`: prefix must appear anywhere in the message (case-insensitive)
 *
 * Both modes are case-insensitive.
 */
export function matchesFilterRule(
  message: string,
  rule: FilterRuleLike
): boolean {
  const mode: MatchMode =
    rule.matchMode === 'startsWith' ? 'startsWith' : 'contains'

  const msg = message.toLowerCase()
  const pfx = rule.prefix.toLowerCase()

  if (mode === 'startsWith') {
    return msg.startsWith(pfx)
  }

  // contains mode
  return msg.includes(pfx)
}

/**
 * Find the first matching filter rule from a list of active rules.
 * Returns the matched rule, or null if no match.
 */
export function findMatchingRule(
  message: string,
  rules: FilterRuleLike[]
): FilterRuleLike | null {
  for (const rule of rules) {
    if (matchesFilterRule(message, rule)) {
      return rule
    }
  }
  return null
}
