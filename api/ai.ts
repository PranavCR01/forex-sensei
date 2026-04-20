import type { VercelRequest, VercelResponse } from '@vercel/node'

// Slice 2: wire this to Groq (text) or Gemini (vision) depending on req.body.provider
// Reads process.env.GROQ_API_KEY and process.env.GEMINI_API_KEY — no VITE_ prefix,
// these never leave the server.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ message: 'AI coming in Slice 2' })
}
