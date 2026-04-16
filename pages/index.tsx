// pages/index.tsx
import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseFrontmatter, processWikilinks, titleFromPath, DOMAINS } from '../lib/markdown'

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'home' | 'domain' | 'article' | 'search' | 'capture' | 'query'

interface Article {
  path: string
  content: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Mono:wght@300;400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0f0f0e;
    --surface:   #181815;
    --border:    #2a2a26;
    --muted:     #4a4a44;
    --text:      #e8e4d8;
    --soft:      #a09a8a;
    --accent:    #c8a96e;
    --accent2:   #7a9e7e;
    --danger:    #c87a6e;
    --radius:    12px;
    --font-body: 'Lora', Georgia, serif;
    --font-mono: 'DM Mono', monospace;
  }

  html, body { height: 100%; background: var(--bg); color: var(--text); }

  body {
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
  }

  #__next { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── Layout ── */
  .app { display: flex; flex-direction: column; min-height: 100vh; max-width: 680px; margin: 0 auto; }

  .header {
    position: sticky; top: 0; z-index: 100;
    background: rgba(15,15,14,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 14px 20px;
    display: flex; align-items: center; gap: 12px;
  }

  .header-title {
    font-family: var(--font-mono);
    font-size: 13px;
    letter-spacing: 0.12em;
    color: var(--accent);
    text-transform: uppercase;
    flex: 1;
  }

  .back-btn {
    background: none; border: none; cursor: pointer;
    color: var(--soft); font-size: 20px; line-height: 1;
    padding: 4px; border-radius: 6px;
    transition: color 0.15s;
  }
  .back-btn:hover { color: var(--text); }

  .nav-tabs {
    display: flex; gap: 4px;
  }

  .nav-tab {
    background: none; border: none; cursor: pointer;
    padding: 6px 10px; border-radius: 8px;
    font-family: var(--font-mono); font-size: 11px;
    color: var(--muted); letter-spacing: 0.08em;
    transition: all 0.15s;
  }
  .nav-tab:hover { color: var(--soft); background: var(--surface); }
  .nav-tab.active { color: var(--accent); background: var(--surface); }

  .content { flex: 1; padding: 24px 20px 80px; }

  /* ── Home / Domains ── */
  .page-title {
    font-size: 22px; font-weight: 600;
    color: var(--text); margin-bottom: 6px;
  }
  .page-subtitle {
    font-size: 13px; color: var(--soft);
    font-family: var(--font-mono); margin-bottom: 28px;
  }

  .domain-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    margin-bottom: 32px;
  }

  .domain-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 16px;
    cursor: pointer; text-align: left;
    transition: all 0.15s;
    display: flex; flex-direction: column; gap: 6px;
  }
  .domain-card:hover { border-color: var(--accent); transform: translateY(-1px); }
  .domain-card:active { transform: translateY(0); }

  .domain-emoji { font-size: 22px; }
  .domain-label { font-size: 15px; font-weight: 600; color: var(--text); }
  .domain-desc { font-size: 11px; color: var(--soft); font-family: var(--font-mono); }

  /* Quick actions */
  .quick-actions { display: flex; gap: 10px; margin-bottom: 28px; }
  .quick-btn {
    flex: 1; padding: 12px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); cursor: pointer;
    font-family: var(--font-mono); font-size: 11px;
    color: var(--soft); letter-spacing: 0.08em;
    transition: all 0.15s; text-align: center;
  }
  .quick-btn:hover { border-color: var(--accent2); color: var(--accent2); }

  /* ── Domain view ── */
  .section-label {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--muted); letter-spacing: 0.14em;
    text-transform: uppercase; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }

  .moc-preview {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 16px;
    margin-bottom: 24px; cursor: pointer;
    transition: border-color 0.15s;
  }
  .moc-preview:hover { border-color: var(--accent); }
  .moc-preview-title { font-size: 13px; color: var(--accent); font-family: var(--font-mono); margin-bottom: 8px; }
  .moc-preview-text { font-size: 14px; color: var(--soft); line-height: 1.5; }

  /* ── Article list ── */
  .article-list { display: flex; flex-direction: column; gap: 8px; }

  .article-item {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px;
    cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; gap: 12px;
  }
  .article-item:hover { border-color: var(--border); background: #1e1e1a; }
  .article-item-content { flex: 1; min-width: 0; }
  .article-title { font-size: 15px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .article-meta { font-size: 11px; color: var(--muted); font-family: var(--font-mono); margin-top: 2px; }
  .article-arrow { color: var(--muted); font-size: 16px; flex-shrink: 0; }

  /* ── Article view ── */
  .article-header { margin-bottom: 28px; }
  .article-domain-tag {
    display: inline-block;
    font-family: var(--font-mono); font-size: 10px;
    color: var(--accent); letter-spacing: 0.12em;
    text-transform: uppercase;
    background: rgba(200,169,110,0.08);
    padding: 3px 8px; border-radius: 4px;
    margin-bottom: 12px;
  }
  .article-title-large { font-size: 24px; font-weight: 600; line-height: 1.3; margin-bottom: 8px; }
  .article-date { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }

  /* Markdown rendering */
  .markdown h1 { font-size: 22px; font-weight: 600; margin: 28px 0 12px; }
  .markdown h2 { font-size: 17px; font-weight: 600; margin: 24px 0 10px; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  .markdown h3 { font-size: 15px; font-weight: 600; margin: 18px 0 8px; color: var(--soft); }
  .markdown p { margin-bottom: 14px; }
  .markdown ul, .markdown ol { margin: 0 0 14px 20px; }
  .markdown li { margin-bottom: 4px; }
  .markdown code { font-family: var(--font-mono); font-size: 13px; background: var(--surface); border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; color: var(--accent2); }
  .markdown pre { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; overflow-x: auto; margin-bottom: 16px; }
  .markdown pre code { background: none; border: none; padding: 0; }
  .markdown blockquote { border-left: 3px solid var(--accent); padding-left: 16px; color: var(--soft); margin-bottom: 14px; font-style: italic; }
  .markdown a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(200,169,110,0.3); transition: border-color 0.15s; }
  .markdown a:hover { border-color: var(--accent); }
  .markdown table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px; }
  .markdown th { background: var(--surface); padding: 8px 12px; text-align: left; border: 1px solid var(--border); font-family: var(--font-mono); font-size: 11px; color: var(--soft); }
  .markdown td { padding: 8px 12px; border: 1px solid var(--border); }
  .markdown hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }

  /* Frontmatter tags */
  .tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .tag {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--muted); background: var(--surface);
    border: 1px solid var(--border);
    padding: 3px 8px; border-radius: 20px;
    letter-spacing: 0.06em;
  }

  /* Status badge */
  .status-badge {
    font-family: var(--font-mono); font-size: 10px;
    padding: 2px 8px; border-radius: 20px;
    letter-spacing: 0.06em; margin-left: 8px;
  }
  .status-active { color: var(--accent2); background: rgba(122,158,126,0.12); }
  .status-draft { color: var(--danger); background: rgba(200,122,110,0.12); }
  .status-stable { color: var(--accent); background: rgba(200,169,110,0.12); }

  /* ── Search ── */
  .search-input-wrap { position: relative; margin-bottom: 20px; }
  .search-input {
    width: 100%; padding: 14px 16px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    font-family: var(--font-body); font-size: 16px;
    outline: none; transition: border-color 0.15s;
  }
  .search-input::placeholder { color: var(--muted); }
  .search-input:focus { border-color: var(--accent); }

  .search-result {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px;
    cursor: pointer; margin-bottom: 10px;
    transition: border-color 0.15s;
  }
  .search-result:hover { border-color: var(--accent); }
  .search-result-path { font-family: var(--font-mono); font-size: 10px; color: var(--accent); margin-bottom: 6px; }
  .search-result-excerpt { font-size: 13px; color: var(--soft); line-height: 1.5; }

  /* ── Capture ── */
  .domain-select {
    width: 100%; padding: 12px 16px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    font-family: var(--font-mono); font-size: 13px;
    outline: none; margin-bottom: 12px;
    appearance: none;
  }
  .capture-textarea {
    width: 100%; min-height: 180px;
    padding: 14px 16px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    font-family: var(--font-body); font-size: 15px;
    line-height: 1.6; outline: none; resize: vertical;
    transition: border-color 0.15s; margin-bottom: 12px;
  }
  .capture-textarea:focus { border-color: var(--accent2); }

  .submit-btn {
    width: 100%; padding: 14px;
    background: var(--accent2); color: var(--bg);
    border: none; border-radius: var(--radius);
    font-family: var(--font-mono); font-size: 13px;
    font-weight: 400; letter-spacing: 0.08em;
    cursor: pointer; transition: opacity 0.15s;
  }
  .submit-btn:hover { opacity: 0.85; }
  .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .success-msg {
    background: rgba(122,158,126,0.12); border: 1px solid rgba(122,158,126,0.3);
    border-radius: var(--radius); padding: 14px;
    color: var(--accent2); font-family: var(--font-mono); font-size: 13px;
    margin-top: 12px;
  }
  .error-msg {
    background: rgba(200,122,110,0.12); border: 1px solid rgba(200,122,110,0.3);
    border-radius: var(--radius); padding: 14px;
    color: var(--danger); font-family: var(--font-mono); font-size: 13px;
    margin-top: 12px;
  }

  /* ── Query ── */
  .query-input {
    width: 100%; min-height: 80px;
    padding: 14px 16px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    font-family: var(--font-body); font-size: 15px;
    line-height: 1.6; outline: none; resize: none;
    transition: border-color 0.15s; margin-bottom: 12px;
  }
  .query-input:focus { border-color: var(--accent); }

  .query-btn {
    width: 100%; padding: 14px;
    background: var(--accent); color: var(--bg);
    border: none; border-radius: var(--radius);
    font-family: var(--font-mono); font-size: 13px;
    letter-spacing: 0.08em; cursor: pointer;
    transition: opacity 0.15s; margin-bottom: 20px;
  }
  .query-btn:hover { opacity: 0.85; }
  .query-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .query-answer {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px;
  }
  .query-answer-label {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--accent); letter-spacing: 0.12em;
    text-transform: uppercase; margin-bottom: 14px;
  }

  /* ── Loading ── */
  .loading {
    display: flex; align-items: center; gap: 10px;
    color: var(--muted); font-family: var(--font-mono);
    font-size: 13px; padding: 20px 0;
  }
  .spinner {
    width: 16px; height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .empty { color: var(--muted); font-family: var(--font-mono); font-size: 13px; padding: 20px 0; }
`

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function VaultNix() {
  const [view, setView] = useState<View>('home')
  const [domain, setDomain] = useState<string>('')
  const [article, setArticle] = useState<Article | null>(null)
  const [history, setHistory] = useState<{ view: View; domain: string; article: Article | null }[]>([])
  const [loading, setLoading] = useState(false)

  // Search state
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<{ path: string; excerpt: string }[]>([])
  const [searching, setSearching] = useState(false)

  // Capture state
  const [captureText, setCaptureText] = useState('')
  const [captureProject, setCaptureProject] = useState('general')
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Query state
  const [queryText, setQueryText] = useState('')
  const [queryAnswer, setQueryAnswer] = useState('')
  const [queryError, setQueryError] = useState('')
  const [querying, setQuerying] = useState(false)

  // Domain articles list
  const [domainArticles, setDomainArticles] = useState<{ path: string; title: string; status: string }[]>([])
  const [mocContent, setMocContent] = useState('')

  const navigate = (newView: View, newDomain = '', newArticle: Article | null = null) => {
    setHistory(h => [...h, { view, domain, article }])
    setView(newView)
    setDomain(newDomain)
    setArticle(newArticle)
  }

  const goBack = () => {
    const prev = history[history.length - 1]
    if (!prev) return
    setHistory(h => h.slice(0, -1))
    setView(prev.view)
    setDomain(prev.domain)
    setArticle(prev.article)
  }

  // Load domain: fetch MOC + article list
  const loadDomain = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const [mocRes, treeRes] = await Promise.all([
        fetch(`/api/file?path=${encodeURIComponent(`wiki/_mocs/${d}-moc.md`)}`),
        fetch(`/api/search?q=${encodeURIComponent(d)}`),
      ])
      if (mocRes.ok) {
        const moc = await mocRes.json()
        const { body } = parseFrontmatter(moc.content)
        // Extract The Argument section
        const argMatch = body.match(/## The Argument\n([\s\S]*?)(?=\n## |$)/)
        setMocContent(argMatch ? argMatch[1].trim() : '')
      }
      if (treeRes.ok) {
        const results = await treeRes.json()
        setDomainArticles(results.map((r: { path: string }) => ({
          path: r.path,
          title: titleFromPath(r.path),
          status: 'active',
        })))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Load article
  const loadArticle = useCallback(async (path: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error('Not found')
      const file = await res.json()
      navigate('article', domain, { path, content: file.content })
    } finally {
      setLoading(false)
    }
  }, [domain])

  // Search
  useEffect(() => {
    if (searchQ.length < 3) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQ)}`)
        if (res.ok) setSearchResults(await res.json())
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQ])

  // Capture submit
  const submitCapture = async () => {
    if (!captureText.trim()) return
    setCaptureStatus('loading')
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: captureText, project: captureProject }),
      })
      if (!res.ok) throw new Error()
      setCaptureStatus('success')
      setCaptureText('')
    } catch {
      setCaptureStatus('error')
    }
  }

  // AI query
  const submitQuery = async () => {
    if (!queryText.trim()) return
    setQuerying(true)
    setQueryAnswer('')
    setQueryError('')
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `${res.status}`)
      setQueryAnswer(data.answer)
    } catch (e) {
      setQueryError(String(e))
    } finally {
      setQuerying(false)
    }
  }

  // Render article with clickable wikilinks
  const renderArticle = (content: string) => {
    const { fm, body } = parseFrontmatter(content)
    const processed = processWikilinks(body)
    return { fm, processed }
  }

  // Intercept wikilink clicks
  const handleArticleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLAnchorElement
    if (target.tagName === 'A' && target.href.includes('/article/')) {
      e.preventDefault()
      const slug = decodeURIComponent(target.href.split('/article/')[1])
      // Try to find the path in wiki/
      const guessedPath = `wiki/${domain}/${slug}.md`
      loadArticle(guessedPath)
    }
  }

  const headerTitle = {
    home: 'VAULTNIX',
    domain: (DOMAINS.find(d => d.id === domain)?.label || domain).toUpperCase(),
    article: article ? titleFromPath(article.path).toUpperCase() : 'ARTICLE',
    search: 'SEARCH',
    capture: 'CAPTURE',
    query: 'ASK VAULT',
  }[view]

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* Header */}
        <header className="header">
          {view !== 'home' && (
            <button className="back-btn" onClick={goBack}>←</button>
          )}
          <span className="header-title">{headerTitle}</span>
          <div className="nav-tabs">
            <button
              className={`nav-tab ${view === 'search' ? 'active' : ''}`}
              onClick={() => navigate('search')}
            >⌕</button>
            <button
              className={`nav-tab ${view === 'capture' ? 'active' : ''}`}
              onClick={() => navigate('capture')}
            >+</button>
            <button
              className={`nav-tab ${view === 'query' ? 'active' : ''}`}
              onClick={() => navigate('query')}
            >✦</button>
          </div>
        </header>

        {/* Content */}
        <main className="content">

          {/* ── HOME ── */}
          {view === 'home' && (
            <>
              <p className="page-title">Your vault.</p>
              <p className="page-subtitle">Navigate · Search · Capture · Query</p>

              <div className="quick-actions">
                <button className="quick-btn" onClick={() => navigate('search')}>
                  ⌕ Search
                </button>
                <button className="quick-btn" onClick={() => navigate('capture')}>
                  + Capture
                </button>
                <button className="quick-btn" onClick={() => navigate('query')}>
                  ✦ Ask
                </button>
              </div>

              <p className="section-label">Domains</p>
              <div className="domain-grid">
                {DOMAINS.map(d => (
                  <button
                    key={d.id}
                    className="domain-card"
                    onClick={() => { navigate('domain', d.id); loadDomain(d.id) }}
                  >
                    <span className="domain-emoji">{d.emoji}</span>
                    <span className="domain-label">{d.label}</span>
                    <span className="domain-desc">{d.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── DOMAIN ── */}
          {view === 'domain' && (
            <>
              {loading && <div className="loading"><div className="spinner" /><span>Loading domain…</span></div>}

              {!loading && mocContent && (
                <>
                  <p className="section-label">The Argument</p>
                  <div
                    className="moc-preview"
                    onClick={() => loadArticle(`wiki/_mocs/${domain}-moc.md`)}
                  >
                    <div className="moc-preview-title">
                      {DOMAINS.find(d => d.id === domain)?.emoji} {DOMAINS.find(d => d.id === domain)?.label} — Map of Content
                    </div>
                    <div className="moc-preview-text">{mocContent}</div>
                  </div>
                </>
              )}

              {!loading && domainArticles.length > 0 && (
                <>
                  <p className="section-label">Articles</p>
                  <div className="article-list">
                    {domainArticles.map(a => (
                      <button
                        key={a.path}
                        className="article-item"
                        onClick={() => loadArticle(a.path)}
                      >
                        <div className="article-item-content">
                          <div className="article-title">{a.title}</div>
                          <div className="article-meta">{a.path.split('/').slice(1, -1).join(' / ')}</div>
                        </div>
                        <span className="article-arrow">›</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!loading && domainArticles.length === 0 && (
                <p className="empty">No articles found in this domain yet.</p>
              )}
            </>
          )}

          {/* ── ARTICLE ── */}
          {view === 'article' && article && (() => {
            const { fm, processed } = renderArticle(article.content)
            const tags = Array.isArray(fm.tags) ? fm.tags : []
            const status = fm.status as string || ''
            return (
              <>
                <div className="article-header">
                  {fm.project && (
                    <span className="article-domain-tag">{fm.project}</span>
                  )}
                  {status && (
                    <span className={`status-badge status-${status}`}>{status}</span>
                  )}
                  <h1 className="article-title-large">
                    {fm.title as string || titleFromPath(article.path)}
                  </h1>
                  {fm.date && (
                    <span className="article-date">{fm.date as string}</span>
                  )}
                  {tags.length > 0 && (
                    <div className="tag-row" style={{ marginTop: 12 }}>
                      {tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
                    </div>
                  )}
                </div>

                <div
                  className="markdown"
                  onClick={handleArticleLinkClick}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {processed}
                  </ReactMarkdown>
                </div>
              </>
            )
          })()}

          {/* ── SEARCH ── */}
          {view === 'search' && (
            <>
              <div className="search-input-wrap">
                <input
                  className="search-input"
                  placeholder="Search articles…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  autoFocus
                />
              </div>

              {searching && <div className="loading"><div className="spinner" /><span>Searching…</span></div>}

              {!searching && searchResults.length > 0 && searchResults.map((r, i) => (
                <div
                  key={i}
                  className="search-result"
                  onClick={() => loadArticle(r.path)}
                >
                  <div className="search-result-path">{r.path}</div>
                  <div className="search-result-excerpt">{r.excerpt}</div>
                </div>
              ))}

              {!searching && searchQ.length >= 3 && searchResults.length === 0 && (
                <p className="empty">No results for "{searchQ}"</p>
              )}
            </>
          )}

          {/* ── CAPTURE ── */}
          {view === 'capture' && (
            <>
              <p className="page-title">Quick capture</p>
              <p className="page-subtitle" style={{ marginBottom: 20 }}>
                Commits to raw/ · Triggers nightly compile
              </p>

              <select
                className="domain-select"
                value={captureProject}
                onChange={e => setCaptureProject(e.target.value)}
              >
                {DOMAINS.map(d => (
                  <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>
                ))}
                <option value="general">📝 General</option>
              </select>

              <textarea
                className="capture-textarea"
                placeholder="What happened? What did you decide? What are the open questions?&#10;&#10;This will be filed as a draft audit note in raw/ and compiled on the next run."
                value={captureText}
                onChange={e => { setCaptureText(e.target.value); setCaptureStatus('idle') }}
              />

              <button
                className="submit-btn"
                onClick={submitCapture}
                disabled={captureStatus === 'loading' || !captureText.trim()}
              >
                {captureStatus === 'loading' ? 'Committing…' : 'Commit to vault →'}
              </button>

              {captureStatus === 'success' && (
                <div className="success-msg">
                  ✓ Filed to raw/{captureProject}/. Nightly compile will process it.
                </div>
              )}
              {captureStatus === 'error' && (
                <div className="error-msg">
                  Commit failed. Check your GitHub token and repo access.
                </div>
              )}
            </>
          )}

          {/* ── QUERY ── */}
          {view === 'query' && (
            <>
              <p className="page-title">Ask the vault</p>
              <p className="page-subtitle" style={{ marginBottom: 20 }}>
                Agent navigates wiki · Surfaces gaps honestly
              </p>

              <textarea
                className="query-input"
                placeholder="What do you want to know?&#10;&#10;e.g. What design principles should inform the TCX UI?"
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                rows={4}
              />

              <button
                className="query-btn"
                onClick={submitQuery}
                disabled={querying || !queryText.trim()}
              >
                {querying ? 'Querying vault…' : 'Ask →'}
              </button>

              {querying && (
                <div className="loading">
                  <div className="spinner" />
                  <span>Searching vault · Building context · Reasoning…</span>
                </div>
              )}

              {queryError && !querying && (
                <div className="error-msg">{queryError}</div>
              )}

              {queryAnswer && !querying && (
                <div className="query-answer">
                  <div className="query-answer-label">Vault answer</div>
                  <div className="markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {queryAnswer}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </>
  )
}
