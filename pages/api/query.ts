// pages/api/query.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'
import { getArticlesForQuery } from '../../lib/vault'

const openai = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: 'ollama',
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { question } = req.body
  if (!question) return res.status(400).json({ error: 'question required' })

  try {
    // Fetch relevant vault context
    const vaultContext = await getArticlesForQuery(question)

    const message = await openai.chat.completions.create({
      model: process.env.OLLAMA_MODEL ?? 'qwen2.5:14b',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `You are an agent navigating a personal knowledge vault (Vaultnix).
The vault covers: apex (Python trading system with Gates/Locks/Keys framework),
TCX (Teacher Cognitive Exoskeleton, React multi-agent), teaching (F-6 primary school,
Åk 4A/5A, Lgr22 + Singapore Math), hiking (Alter-native Hiking, "Walk slowly. Go deep."),
and knowledge-work (LLM wiki methodology, agent-operated knowledge systems).

Answer using the vault content provided. Be specific and dense.
If the vault doesn't contain enough to answer well, say exactly what's missing
and what stub articles would need to exist.
Never confabulate. Surface gaps honestly.
Format your answer in clean markdown.`,
        },
        {
          role: 'user',
          content: `VAULT CONTEXT:\n${vaultContext}\n\nQUESTION: ${question}`,
        },
      ],
    })

    const answer = message.choices[0].message.content ?? ''
    res.status(200).json({ answer })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
