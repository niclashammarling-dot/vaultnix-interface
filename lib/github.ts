// lib/github.ts
// Reads markdown files from the Vaultnix GitHub repo

const GITHUB_API = 'https://api.github.com'
const OWNER = process.env.GITHUB_OWNER!
const REPO = process.env.GITHUB_REPO!
const BRANCH = process.env.GITHUB_BRANCH || 'main'
const TOKEN = process.env.GITHUB_TOKEN!

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

export interface VaultFile {
  path: string
  name: string
  content: string
  sha: string
}

export interface VaultTree {
  path: string
  type: 'blob' | 'tree'
  sha: string
}

// Fetch the full tree of wiki/ directory
export async function getWikiTree(): Promise<VaultTree[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`,
    { headers, next: { revalidate: 300 } } // cache 5 min
  )
  if (!res.ok) throw new Error(`GitHub tree fetch failed: ${res.status}`)
  const data = await res.json()
  return data.tree.filter((f: VaultTree) =>
    f.path.startsWith('wiki/') && f.path.endsWith('.md')
  )
}

// Fetch a single file by path
export async function getFile(path: string): Promise<VaultFile> {
  const res = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers, next: { revalidate: 120 } }
  )
  if (!res.ok) throw new Error(`File fetch failed: ${path} — ${res.status}`)
  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return { path, name: data.name, content, sha: data.sha }
}

// Fetch INDEX.md
export async function getIndex(): Promise<string> {
  const file = await getFile('wiki/_index/INDEX.md')
  return file.content
}

// Fetch a MOC by domain
export async function getMOC(domain: string): Promise<string> {
  const file = await getFile(`wiki/_mocs/${domain}-moc.md`)
  return file.content
}

// Fetch all MOC files
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

// Search across all wiki articles
export async function searchVault(query: string): Promise<{ path: string; excerpt: string }[]> {
  const tree = await getWikiTree()
  const q = query.toLowerCase()
  const results: { path: string; excerpt: string; score: number }[] = []

  // Fetch up to 60 files in parallel batches
  const wikiFiles = tree.filter(f => !f.path.includes('_index'))
  const batches = chunk(wikiFiles, 10)

  for (const batch of batches) {
    const files = await Promise.allSettled(batch.map(f => getFile(f.path)))
    for (const result of files) {
      if (result.status !== 'fulfilled') continue
      const { path, content } = result.value
      const lower = content.toLowerCase()
      if (!lower.includes(q)) continue

      const idx = lower.indexOf(q)
      const start = Math.max(0, idx - 80)
      const end = Math.min(content.length, idx + 160)
      const excerpt = '...' + content.slice(start, end).replace(/\n/g, ' ') + '...'

      // Simple relevance: title match = higher score
      const titleMatch = path.toLowerCase().includes(q) ? 2 : 0
      const occurrences = (lower.match(new RegExp(q, 'g')) || []).length
      results.push({ path, excerpt, score: occurrences + titleMatch })
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(({ path, excerpt }) => ({ path, excerpt }))
}

// Commit a new raw/ note to GitHub
export async function commitRawNote(
  filename: string,
  content: string,
  domain = 'general'
): Promise<void> {
  const path = `raw/${domain}/${filename}`
  const encoded = Buffer.from(content).toString('base64')

  const res = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `capture: ${filename}`,
        content: encoded,
        branch: BRANCH,
      }),
    }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Commit failed: ${err.message}`)
  }
}

// Fetch multiple articles for AI context
export async function getArticlesForQuery(query: string): Promise<string> {
  // Get INDEX + relevant MOC + top search results
  const [index, searchResults] = await Promise.all([
    getIndex(),
    searchVault(query),
  ])

  const articleContents = await Promise.allSettled(
    searchResults.slice(0, 5).map(r => getFile(r.path))
  )

  const articles = articleContents
    .filter((r): r is PromiseFulfilledResult<VaultFile> => r.status === 'fulfilled')
    .map(r => `### ${r.value.path}\n${r.value.content}`)
    .join('\n\n---\n\n')

  return `## INDEX\n${index}\n\n## RELEVANT ARTICLES\n${articles}`
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  )
}
