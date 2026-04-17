// pages/api/capture.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { commitRawNote } from '../../lib/github'

const IDEA_PREFIX = /^idea[.:]\s*/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { content, project } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })

  const isIdea = IDEA_PREFIX.test(content.trim())
  const body = isIdea ? content.trim().replace(IDEA_PREFIX, '') : content

  const date = new Date().toISOString().split('T')[0]
  const time = new Date().toISOString().split('T')[1].slice(0, 5).replace(':', '')

  let domain: string
  let filename: string
  let markdown: string

  if (isIdea) {
    domain = 'general/ideas'
    filename = `${date}-${time}-idea.md`
    const title = body.split('\n')[0].slice(0, 80)
    markdown = `---
title: ${title}
type: idea
project: general/ideas
date: ${date}
time: "${time.slice(0, 2)}:${time.slice(2)}"
status: captured
---

${body}
`
  } else {
    domain = project || 'general'
    filename = `${date}-${time}-capture.md`
    markdown = `---
title: Quick capture ${date}
type: session-audit
project: ${domain}
date: ${date}
tags: [${domain}/capture]
status: draft
---

## What We Worked On
${body}

## Reasoning and Arguments


## Decisions Made


## MOC Placement


## Suggested Connections


## Open Threads


## Context Manifest
context_manifest:
  mocs_loaded: []
  articles_loaded: []
  skills_invoked: []
  stubs_encountered: []
  context_gaps: []
  missing_entirely: []
`
  }

  try {
    await commitRawNote(filename, markdown, domain)
    res.status(200).json({ success: true, filename, isIdea })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
