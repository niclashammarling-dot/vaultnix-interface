export interface VaultFile {
  path: string
  name: string
  content: string
  sha?: string
}

export interface VaultTree {
  path: string
  type: 'blob' | 'tree'
  sha?: string
}
