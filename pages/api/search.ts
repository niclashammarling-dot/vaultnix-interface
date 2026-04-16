// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { searchVault } from '../../lib/github'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { q } = req.query
  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.status(400).json({ error: 'query too short' })
  }

  try {
    const results = await searchVault(q)
    res.status(200).json(results)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
