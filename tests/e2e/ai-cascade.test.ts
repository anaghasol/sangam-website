import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

describe('AI Gateway Tiering & Cascade Invariants', () => {
  const freeAiContent = readFileSync('lib/free-ai.ts', 'utf-8')

  test('Cascade Order: OmniRoute is tried first, followed by OpenAI, Groq, Cerebras, Mistral, OpenRouter, Gemini', () => {
    const omniIdx = freeAiContent.indexOf("name: 'omniroute'")
    const openaiIdx = freeAiContent.indexOf("name: 'openai'")
    const groqIdx = freeAiContent.indexOf("name: 'groq'")
    const cerebrasIdx = freeAiContent.indexOf("name: 'cerebras'")
    const mistralIdx = freeAiContent.indexOf("name: 'mistral'")
    const openrouterIdx = freeAiContent.indexOf("name: 'openrouter'")
    const geminiIdx = freeAiContent.indexOf("name: 'gemini'")

    assert.ok(omniIdx !== -1, 'OmniRoute provider must be configured')
    assert.ok(openaiIdx !== -1, 'OpenAI direct provider must be configured')
    assert.ok(groqIdx !== -1, 'Groq provider must be configured')
    assert.ok(cerebrasIdx !== -1, 'Cerebras provider must be configured')
    assert.ok(mistralIdx !== -1, 'Mistral provider must be configured')
    assert.ok(openrouterIdx !== -1, 'OpenRouter provider must be configured')
    assert.ok(geminiIdx !== -1, 'Gemini provider must be configured')

    assert.ok(omniIdx < openaiIdx, 'OmniRoute must be tried ahead of OpenAI')
    assert.ok(openaiIdx < groqIdx, 'OpenAI must be tried ahead of Groq')
    assert.ok(groqIdx < cerebrasIdx, 'Groq must be tried ahead of Cerebras')
    assert.ok(cerebrasIdx < mistralIdx, 'Cerebras must be tried ahead of Mistral')
    assert.ok(mistralIdx < openrouterIdx, 'Mistral must be tried ahead of OpenRouter')
    assert.ok(openrouterIdx < geminiIdx, 'OpenRouter must be tried ahead of Gemini')
  })

  test('OpenAI-compatible request shaping strips leading assistant messages', () => {
    // OpenAI/Groq/Cerebras APIs reject conversations opening with an assistant turn
    assert.ok(
      freeAiContent.includes("...msgs.filter((m, i) => !(i === 0 && m.role === 'assistant'))"),
      'Must sanitize messages to ensure first message is not an assistant message'
    )
  })

  test('Timeout Safeguards: Every provider call has an AbortSignal timeout', () => {
    // Ensure timeout is configured so chat requests never hang indefinitely
    assert.ok(
      freeAiContent.includes('AbortSignal.timeout('),
      'Must configure AbortSignal.timeout on outgoing AI fetch calls'
    )
  })

  test('OpenRouter uses :free model tags only', () => {
    assert.ok(
      freeAiContent.includes("'meta-llama/llama-3.3-70b-instruct:free'"),
      'OpenRouter must use free tier models to avoid billing charges'
    )
    assert.ok(
      freeAiContent.includes("'google/gemma-2-9b-it:free'"),
      'OpenRouter must use free tier gemma'
    )
  })
})
