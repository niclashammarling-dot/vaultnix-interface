// lib/markdown.ts

export interface Frontmatter {
  title?: string
  project?: string
  tags?: string[]
  date?: string
  status?: string
  moc?: string[]
  type?: string
  [key: string]: unknown
}

// Parse YAML frontmatter from markdown
export function parseFrontmatter(content: string): { fm: Frontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { fm: {}, body: content }

  const fm: Frontmatter = {}
  const yamlLines = match[1].split('\n')

  for (const line of yamlLines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()

    if (value.startsWith('[') && value.endsWith(']')) {
      // Array value
      fm[key] = value
        .slice(1, -1)
        .split(',')
        .map(v => v.trim().replace(/['"]/g, ''))
        .filter(Boolean)
    } else {
      fm[key] = value.replace(/['"]/g, '')
    }
  }

  return { fm, body: match[2] }
}

// Extract all [[wikilinks]] from content
export function extractWikilinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || []
  return matches.map(m => m.slice(2, -2).split('|')[0].trim())
}

// Convert [[wikilinks]] to navigable links in rendered content
export function processWikilinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, link) => {
    const [slug, label] = link.split('|')
    const displayText = label || slug
    const encodedSlug = encodeURIComponent(slug.trim())
    return `[${displayText}](/article/${encodedSlug})`
  })
}

// Get a clean title from path or frontmatter
export function titleFromPath(path: string): string {
  const filename = path.split('/').pop() || path
  return filename
    .replace('.md', '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Detect domain from path
export function domainFromPath(path: string): string {
  const parts = path.split('/')
  if (parts[1] === '_mocs') return 'moc'
  if (parts[1] === '_concepts') return 'concept'
  if (parts[1] === '_index') return 'index'
  if (parts[1] === '_skills') return 'skill'
  return parts[1] || 'general'
}

// Domain display config
export const DOMAINS = [
  { id: 'apex', label: 'Apex', emoji: '📈', desc: 'Trading system' },
  { id: 'TCX', label: 'TCX', emoji: '🏫', desc: 'Teacher AI' },
  { id: 'teaching', label: 'Teaching', emoji: '📚', desc: 'Dannikeskolan' },
  { id: 'hiking', label: 'Hiking', emoji: '🌲', desc: 'Alter-native' },
  { id: 'knowledge-work', label: 'Knowledge', emoji: '🧠', desc: 'Vault meta' },
  { id: 'inspiration', label: 'Inspiration', emoji: '✦', desc: 'Visual refs' },
]
