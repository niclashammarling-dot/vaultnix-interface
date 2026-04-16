# Vaultnix Interface

Mobile-first web interface for the Vaultnix knowledge vault.
Reads from GitHub, deploys to Vercel, works on any device.

## Features

- **Navigate** — Domain → MOC → Article, wikilinks as tappable navigation
- **Search** — Full-text search across all wiki/ articles
- **Capture** — Quick notes committed directly to raw/ on GitHub
- **Query** — AI answers against vault context via Anthropic API

## Setup

### 1. Clone this repo (separate from Vaultnix vault repo)

```bash
git clone <this-repo>
cd vaultnix-interface
npm install
```

### 2. Create environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
GITHUB_TOKEN=ghp_...        # GitHub personal access token (repo scope)
GITHUB_OWNER=niclashammarling-dot
GITHUB_REPO=Vaultnix
GITHUB_BRANCH=main
ANTHROPIC_API_KEY=sk-ant-...
```

**Create GitHub token:**
1. github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Repository access: Vaultnix only
3. Permissions: Contents (read + write — for capture commits)

### 3. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 4. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect via Vercel dashboard:
1. vercel.com → New Project → Import Git Repository
2. Select this repo
3. Add environment variables (same as .env.local)
4. Deploy

**Every push to main auto-deploys.**
**When Vaultnix vault commits (nightly audit), interface stays current.**

## Vault structure expected

```
Vaultnix/
├── wiki/
│   ├── _index/INDEX.md
│   ├── _mocs/[domain]-moc.md
│   ├── apex/
│   ├── TCX/
│   ├── teaching/
│   ├── hiking/
│   ├── knowledge-work/
│   └── inspiration/
└── raw/
    └── general/    ← capture notes land here
```

## Architecture

```
GitHub (Vaultnix vault) ←── nightly audit commits
        ↓ GitHub API (read + write)
Vercel (this app, Next.js)
        ↓ /api/query
Anthropic API (claude-sonnet)
        ↓
Phone browser
```

No database. No authentication (add Vercel password protection if needed).
All vault content stays in your GitHub repo.
