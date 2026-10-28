import { NextRequest, NextResponse } from 'next/server'
import { askFreeModels } from '@/lib/free-ai'
import { cleanTranscript, needsTranslation, sanitizeTranslation } from '@/lib/voice'

// Translates a guest's spoken message (Telugu / Hindi) into plain English for
// the booking logic in /api/chat. Never fails the chat: on any problem it hands
// the original text back with translated: false.
const SYSTEM = `You translate a customer's message for a hotel catering chatbot into plain English.
The message may be Telugu, Hindi, Hinglish, or Telugu/Hindi typed in English letters.
Rules:
- Output ONLY the English translation: one line, no quotes, no notes, no explanation.
- Keep numbers, dates and times exactly (e.g. 200 guests, 12 Dec, 7 PM).
- Keep branch names as they are (Peerzadiguda, Hayathnagar) and write dish names in their common English spelling (e.g. Pulihora, Gobi 65, Chicken Dum Biryani).
- Say "veg" for vegetarian / శాకాహారం / शाकाहारी and "non veg" for non-vegetarian / మాంసాహారం / मांसाहारी.
- Say "indoor banquet hall" for hall / banquet requests and "outdoor catering" for catering delivered to a home or venue.
- Say weekdays and relative dates in English ("next Monday", "tomorrow").
- If the message is already English, return it unchanged.`

export async function POST(req: NextRequest) {
  let original = ''
  try {
    const body = await req.json()
    original = cleanTranscript(typeof body?.text === 'string' ? body.text : '')
    if (!original || !needsTranslation(original)) return NextResponse.json({ text: original, translated: false })

    const reply = await askFreeModels(SYSTEM, [{ role: 'user', content: original }])
    const english = sanitizeTranslation(reply, original)
    return NextResponse.json(english ? { text: english, translated: true } : { text: original, translated: false })
  } catch {
    return NextResponse.json({ text: original, translated: false })
  }
}
