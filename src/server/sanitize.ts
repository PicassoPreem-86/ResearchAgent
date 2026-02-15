/**
 * Sanitize scraped text before passing to AI models.
 * Removes common prompt injection patterns from untrusted web content.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /ignore\s+(all\s+)?above\s+instructions?/gi,
  /disregard\s+(all\s+)?previous/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+(a\s+)?/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /system\s*:\s*/gi,
  /assistant\s*:\s*/gi,
  /user\s*:\s*/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<<\/SYS>>/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /\bDAN\s+mode/gi,
  /jailbreak/gi,
  /bypass\s+(safety|filter|content)/gi,
]

export function sanitizeForAI(text: string): string {
  if (!text) return ''

  let sanitized = text

  // Strip any remaining HTML tags (belt + suspenders with cheerio)
  sanitized = sanitized.replace(/<[^>]*>/g, ' ')

  // Remove prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  }

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s{3,}/g, '  ')

  // Truncate to reasonable size (25k chars max per field)
  if (sanitized.length > 25000) {
    sanitized = sanitized.slice(0, 25000) + '... [truncated]'
  }

  return sanitized.trim()
}

export function sanitizeScrapedData(data: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = typeof value === 'string' ? sanitizeForAI(value) : value
  }
  return sanitized
}
