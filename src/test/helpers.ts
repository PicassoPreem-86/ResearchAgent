import { vi } from 'vitest'
import { SAMPLE_SCRAPED_DATA, SAMPLE_REPORT, SAMPLE_OPENAI_RESPONSE } from './fixtures.js'

/**
 * Mock OpenAI so that analyzeCompany returns fixture data without real API calls.
 * Must be called inside vi.mock() or at module level before imports.
 */
export function mockOpenAI() {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: SAMPLE_OPENAI_RESPONSE } }],
          }),
        },
      },
    })),
  }
}

/**
 * Mock the scraper module to return fixture scraped data without real HTTP calls.
 */
export function mockScraper() {
  return {
    scrapeCompany: vi.fn().mockResolvedValue(SAMPLE_SCRAPED_DATA),
  }
}

/**
 * Mock the analyzer module to return a fixture report.
 */
export function mockAnalyzer() {
  return {
    analyzeCompany: vi.fn().mockResolvedValue(SAMPLE_REPORT),
    generateComparison: vi.fn().mockResolvedValue({
      companies: [SAMPLE_REPORT],
      comparison: {
        dimensions: [],
        summary: 'Test comparison summary',
        recommendation: 'Test recommendation',
        overallWinner: 'stripe.com',
        companySummaries: [],
      },
      generatedAt: new Date().toISOString(),
    }),
  }
}

/**
 * Helper to make a JSON request to the Hono app.
 */
export function jsonRequest(
  app: { request: (path: string, init?: RequestInit) => Promise<Response> },
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<Response> {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return app.request(path, init)
}
