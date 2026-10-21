import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { getOrCreateChatSessionId } from '@/lib/chat-session'

describe('Chat Session Management (2026-09-30 Regression Guard)', () => {
  test('returns "server" when window is undefined', () => {
    // In Node test environment, window is undefined
    const id = getOrCreateChatSessionId()
    assert.equal(id, 'server')
  })

  test('generates and persists web session id when window.sessionStorage is present', () => {
    // Mock browser sessionStorage
    const storage = new Map<string, string>()
    const mockWindow = {
      sessionStorage: {
        getItem: (k: string) => storage.get(k) || null,
        setItem: (k: string, v: string) => storage.set(k, v),
      },
    }

    // Set global window cleanly without any
    const globalScope = globalThis as unknown as { window?: typeof mockWindow }
    globalScope.window = mockWindow

    try {
      const id1 = getOrCreateChatSessionId()
      assert.ok(id1.startsWith('web-'), 'Session id should start with web-')

      // Second call must return the exact same session id
      const id2 = getOrCreateChatSessionId()
      assert.equal(id1, id2, 'Must reuse same session id from sessionStorage')
    } finally {
      delete globalScope.window
    }
  })
})
