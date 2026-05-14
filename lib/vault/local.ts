import type { VaultFile, VaultTree } from './types'

const BASE = process.env.VAULT_LOCAL_URL || 'http://localhost:4242'

async function localFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.status }))
    throw new Error(err.error || `local vault: ${res.status}`)
  }
  return res
}

export async function getWikiTree(): Promise<VaultTree[]> {
  const res = await localFetch(`${BASE}/tree`)
  const { files } = await res.json()
  return (files as { path: string }[]).map(f => ({ path: f.path, type: 'blob' as const }))
}

export async function getFile(path: string): Promise<VaultFile> {
  const res = await localFetch(`${BASE}/file?path=${encodeURIComponent(path)}`)
  const { name, content } = await res.json()
  return { path, name, content }
}

export async function getIndex(): Promise<string> {
  const file = await getFile('wiki/_index/INDEX.md')
  return file.content
}

export async function getMOC(domain: string): Promise<string> {
  const file = await getFile(`wiki/_mocs/${domain}-moc.md`)
  return file.content
}

export async function getAllMOCs(): Promise<{ domain: string; content: string }[]> {
  const domains = ['apex', 'TCX', 'teaching', 'hiking', 'knowledge-work', 'inspiration']
  const results = await Promise.allSettled(
    domains.map(async (d) => ({ domain: d, content: await getMOC(d) }))
  )
  return results
    .filter((r): r is PromiseFulfilledResult<{ domain: string; content: string }> =>
      r.status === 'fulfilled'
    )
    .map((r) => r.value)
}

export async function searchVault(query: string): Promise<{ path: string; excerpt: string }[]> {
  const res = await localFetch(`${BASE}/search?q=${encodeURIComponent(query)}`)
  return res.json()
}

export async function commitRawNote(
  filename: string,
  content: string,
  domain = 'general'
): Promise<void> {
  const path = `raw/${domain}/${filename}`
  await localFetch(`${BASE}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  })
}

export async function getArticlesForQuery(query: string): Promise<string> {
  const [index, searchResults] = await Promise.all([
    getIndex(),
    searchVault(query),
  ])

  const articleContents = await Promise.allSettled(
    searchResults.slice(0, 5).map(r => getFile(r.path))
  )

  const MAX_ARTICLE_CHARS = 4000
  const articles = articleContents
    .filter((r): r is PromiseFulfilledResult<VaultFile> => r.status === 'fulfilled')
    .map(r => `### ${r.value.path}\n${r.value.content.slice(0, MAX_ARTICLE_CHARS)}`)
    .join('\n\n---\n\n')

  return `## INDEX\n${index}\n\n## RELEVANT ARTICLES\n${articles}`
}

