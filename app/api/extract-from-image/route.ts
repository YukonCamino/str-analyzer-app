import { NextRequest, NextResponse } from 'next/server'

const PROMPT = `You are analyzing a real estate listing screenshot (Zillow, Redfin, AirDNA, etc.).
Extract the following details and return ONLY a valid JSON object — no markdown, no explanation:

{
  "address": "full street address with city, state, zip if visible — null if not found",
  "price": 350000,
  "beds": 2,
  "baths": 1.5,
  "sqft": 950,
  "dom": 45,
  "annual_rev": 52000
}

Rules:
- price: integer (asking/listing price), no $ or commas
- beds/baths: numbers (baths can be 1.5 etc.)
- sqft: integer
- dom: integer days on market — null if not visible
- annual_rev: annual revenue (from AirDNA, AirROI, Airbnb, etc.) — null if not visible
- Use null for any field you cannot clearly read
- Never guess`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0 },
        }),
        signal: AbortSignal.timeout(30000),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini API error:', err)
      return NextResponse.json({ error: 'Gemini API error', details: err }, { status: 500 })
    }

    const result = await response.json()
    const text: string = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

    // Parse JSON — Gemini sometimes wraps in ```json fences
    let extracted: Record<string, unknown> = {}
    try {
      const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch (e) {
      console.error('JSON parse error:', e, 'raw text:', text)
    }

    return NextResponse.json({ ...extracted, extracted: true })
  } catch (err) {
    console.error('extract-from-image error:', err)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
