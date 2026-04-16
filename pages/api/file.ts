// pages/api/file.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getFile } from '../../lib/github'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { path } = req.query
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'path required' })
  }

  try {
    const file = await getFile(decodeURIComponent(path))
    res.status(200).json(file)
  } catch (e) {
    res.status(404).json({ error: String(e) })
  }
}
