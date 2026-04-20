import type { CatalogResponseHints } from './types.js'

export function createSharedHints(
  procedures: string[],
  hints: CatalogResponseHints,
): Record<string, CatalogResponseHints> {
  return Object.fromEntries(procedures.map((procedure) => [procedure, hints]))
}

export function mergeCatalogResponseHints(
  ...groups: Array<Record<string, CatalogResponseHints>>
): Record<string, CatalogResponseHints> {
  return Object.assign({}, ...groups)
}
