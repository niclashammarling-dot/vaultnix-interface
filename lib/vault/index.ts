export type { VaultFile, VaultTree } from './types'

// VAULT_PROVIDER=local  → sidecar (serve.py) at VAULT_LOCAL_URL (default: localhost:4242)
// VAULT_PROVIDER=github → GitHub API (default, existing behaviour)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const vault: typeof import('./github') =
  process.env.VAULT_PROVIDER === 'local'
    ? require('./local')
    : require('./github')

export const getWikiTree = vault.getWikiTree
export const getFile = vault.getFile
export const getIndex = vault.getIndex
export const getMOC = vault.getMOC
export const getAllMOCs = vault.getAllMOCs
export const searchVault = vault.searchVault
export const commitRawNote = vault.commitRawNote
export const getArticlesForQuery = vault.getArticlesForQuery
