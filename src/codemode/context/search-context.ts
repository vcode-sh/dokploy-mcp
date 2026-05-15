import { dokployCatalog } from '../../generated/dokploy-catalog.js'
import { procedureSchemas } from '../../generated/dokploy-schemas.js'
import { applyCatalogResponseHints } from '../overrides/catalog-overrides.js'
import {
  applyProcedureInputMetadata,
  getEffectiveProcedureSchema,
} from '../overrides/procedure-overrides.js'
import {
  getVirtualCatalogEndpoints,
  getVirtualProcedureSchema,
} from '../overrides/virtual-procedures.js'

type SearchEndpoint = ReturnType<typeof createCatalogEndpointView>
type SearchIntent = 'inspect' | 'logs' | 'overview' | 'preview' | 'mutate' | 'batch'

type SearchDocument = {
  endpoint: SearchEndpoint
  index: number
  isVirtual: boolean
  action: string
  searchText: string
  primaryText: string
  secondaryText: string
  primaryTokens: Set<string>
  secondaryTokens: Set<string>
}

type RankedSearchMatch = {
  endpoint: SearchEndpoint
  index: number
  score: number
  reasons: string[]
}

type QueryDescriptor = {
  normalized: string
  tokens: string[]
  intent: SearchIntent
  groups: { label: string; terms: string[] }[]
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'api',
  'dokploy',
  'endpoint',
  'for',
  'from',
  'in',
  'inspect',
  'into',
  'mcp',
  'of',
  'on',
  'or',
  'please',
  'procedure',
  'read',
  'show',
  'the',
  'to',
  'with',
])

const MUTATION_ACTIONS = new Set([
  'assigntoproject',
  'bulkassign',
  'canceldeployment',
  'changepassword',
  'changestatus',
  'cleanqueues',
  'cleardeployments',
  'create',
  'delete',
  'deploy',
  'deploytemplate',
  'disconnectgitprovider',
  'dropdeployment',
  'duplicate',
  'killbuild',
  'killcontainer',
  'markrunning',
  'move',
  'rebuild',
  'redeploy',
  'refreshtoken',
  'reload',
  'remove',
  'removecontainer',
  'removefromproject',
  'savebitbucketprovider',
  'savebuildtype',
  'savedockerprovider',
  'saveenvironment',
  'saveexternalports',
  'savegitprovider',
  'savegiteaprovider',
  'savegithubprovider',
  'savegitlabprovider',
  'start',
  'startcontainer',
  'stop',
  'stopcontainer',
  'togglebookmark',
  'toggleshare',
  'update',
  'updateinvoicenotifications',
  'updatetraefikconfig',
  'uploadfiletocontainer',
])

const TOKEN_SYNONYMS: Record<string, string[]> = {
  app: ['application'],
  application: ['app'],
  batch: ['many', 'multiple', 'across'],
  databases: ['database', 'db', 'mariadb', 'mongo', 'mysql', 'postgres', 'redis', 'libsql'],
  database: ['databases', 'db', 'mariadb', 'mongo', 'mysql', 'postgres', 'redis', 'libsql'],
  db: ['database', 'databases', 'mariadb', 'mongo', 'mysql', 'postgres', 'redis', 'libsql'],
  deploy: ['deployment', 'redeploy', 'latest'],
  deployment: ['deploy', 'redeploy'],
  env: ['environment'],
  environment: ['env'],
  health: ['overview', 'status'],
  latest: ['last', 'recent'],
  last: ['latest', 'recent'],
  log: ['logs', 'tail'],
  logs: ['log', 'tail'],
  many: ['batch', 'multiple', 'across'],
  multiple: ['many', 'batch', 'across'],
  overview: ['summary', 'status', 'health'],
  password: ['rotate', 'change'],
  preview: ['safe', 'plan'],
  project: ['environment'],
  recent: ['latest', 'last'],
  rotate: ['password', 'change'],
  safe: ['preview', 'plan'],
  status: ['overview', 'summary', 'health', 'latest'],
  summary: ['overview', 'status'],
  tail: ['logs', 'log'],
}

function createCatalogEndpointView(endpoint: (typeof dokployCatalog.endpoints)[number]) {
  return applyCatalogResponseHints(applyProcedureInputMetadata(endpoint))
}

function createCatalogIndexes(endpoints: SearchEndpoint[]) {
  const byTag: Record<string, number[]> = {}
  const byProcedure: Record<string, number> = {}
  const byPath: Record<string, number> = {}

  for (const [index, endpoint] of endpoints.entries()) {
    byProcedure[endpoint.procedure] = index
    byPath[endpoint.path] = index
    const tagIndexes = byTag[endpoint.tag] ?? []
    tagIndexes.push(index)
    byTag[endpoint.tag] = tagIndexes
  }

  return {
    byTag,
    byProcedure,
    byPath,
  }
}

function getStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function getSearchHintText(endpoint: SearchEndpoint) {
  const typed = endpoint as SearchEndpoint & {
    commonResponseFields?: unknown
    responseHints?: unknown
    examples?: unknown
    notes?: unknown
  }

  return [
    ...getStringList(typed.commonResponseFields),
    ...getStringList(typed.responseHints),
    ...getStringList(typed.examples),
    ...getStringList(typed.notes),
  ]
}

function tokenizeText(value: string) {
  return (
    value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter(Boolean) ?? []
  )
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)]
}

function expandToken(token: string) {
  const singular = token.endsWith('s') && token.length > 3 ? token.slice(0, -1) : null
  const plural = !token.endsWith('s') && token.length > 2 ? `${token}s` : null

  return uniqueStrings([
    token,
    ...(singular ? [singular] : []),
    ...(plural ? [plural] : []),
    ...(TOKEN_SYNONYMS[token] ?? []),
  ])
}

function getQueryTokens(query: string) {
  return uniqueStrings(tokenizeText(query).filter((token) => !STOP_WORDS.has(token)))
}

function detectSearchIntent(tokens: string[]): SearchIntent {
  if (tokens.some((token) => ['log', 'logs', 'tail'].includes(token))) return 'logs'
  if (tokens.some((token) => ['preview', 'safe', 'plan'].includes(token))) return 'preview'
  if (
    tokens.some((token) =>
      ['overview', 'summary', 'status', 'health', 'latest', 'recent'].includes(token),
    )
  ) {
    return 'overview'
  }
  if (tokens.some((token) => ['many', 'batch', 'multiple', 'across'].includes(token)))
    return 'batch'
  if (
    tokens.some((token) =>
      [
        'assign',
        'change',
        'create',
        'delete',
        'deploy',
        'move',
        'redeploy',
        'remove',
        'rotate',
        'start',
        'stop',
        'update',
      ].includes(token),
    )
  ) {
    return 'mutate'
  }

  return 'inspect'
}

function createQueryDescriptor(query: string): QueryDescriptor | null {
  const normalized = query.trim().toLowerCase()
  if (normalized.length === 0) return null

  const tokens = getQueryTokens(normalized)
  if (tokens.length === 0) return null

  return {
    normalized,
    tokens,
    intent: detectSearchIntent(tokens),
    groups: tokens.map((token) => ({
      label: token,
      terms: expandToken(token),
    })),
  }
}

function createSearchDocument(endpoint: SearchEndpoint, index: number): SearchDocument {
  const primaryParts = [
    endpoint.procedure,
    endpoint.path,
    endpoint.tag,
    endpoint.summary ?? '',
    endpoint.description ?? '',
  ]
  const secondaryParts = [
    ...endpoint.requiredInputs,
    ...endpoint.optionalInputs,
    ...getSearchHintText(endpoint),
  ]
  const primaryText = primaryParts.join(' ').toLowerCase()
  const secondaryText = secondaryParts.join(' ').toLowerCase()

  return {
    endpoint,
    index,
    isVirtual: endpoint.path.startsWith('/virtual/'),
    action: endpoint.procedure.split('.').at(-1)?.toLowerCase() ?? '',
    searchText: `${primaryText} ${secondaryText}`.trim(),
    primaryText,
    secondaryText,
    primaryTokens: new Set(tokenizeText(primaryText)),
    secondaryTokens: new Set(tokenizeText(secondaryText)),
  }
}

function isPreviewDocument(document: SearchDocument) {
  return document.action.includes('preview')
}

function isLogsDocument(document: SearchDocument) {
  return document.action.includes('logs') || document.endpoint.procedure.includes('logs')
}

function isOverviewDocument(document: SearchDocument) {
  return (
    document.action.includes('overview') ||
    document.action.includes('latest') ||
    document.action.includes('summary') ||
    document.action.includes('stats') ||
    document.action.includes('health')
  )
}

function isBatchDocument(document: SearchDocument) {
  return (
    document.action.includes('many') ||
    document.action.includes('allbytype') ||
    document.action.includes('tailmany')
  )
}

function isMutationDocument(document: SearchDocument) {
  return MUTATION_ACTIONS.has(document.action)
}

function getMinimumMatches(tokenCount: number) {
  if (tokenCount <= 2) return tokenCount
  return tokenCount - 1
}

function addReason(reasons: string[], reason: string) {
  if (reasons.includes(reason)) return
  reasons.push(reason)
}

function getExactTokenMatchCount(tokens: string[], candidates: Set<string>) {
  return tokens.filter((token) => candidates.has(token)).length
}

function applyIntentScore(
  document: SearchDocument,
  descriptor: QueryDescriptor,
  score: number,
  reasons: string[],
) {
  if (descriptor.intent === 'preview' && isPreviewDocument(document)) {
    addReason(reasons, 'matches preview-oriented workflow')
    return score + 48
  }

  if (descriptor.intent === 'logs' && isLogsDocument(document)) {
    addReason(reasons, 'matches log inspection workflow')
    return score + 42
  }

  if (descriptor.intent === 'overview' && isOverviewDocument(document)) {
    addReason(reasons, 'matches overview and latest-status workflow')
    return score + 40
  }

  if (descriptor.intent === 'batch' && isBatchDocument(document)) {
    addReason(reasons, 'matches batched inspection workflow')
    return score + 34
  }

  if (descriptor.intent === 'mutate' && isMutationDocument(document)) {
    addReason(reasons, 'matches mutation-oriented workflow')
    return score + 28
  }

  return score
}

function applyExactTokenScore(
  document: SearchDocument,
  descriptor: QueryDescriptor,
  score: number,
  reasons: string[],
) {
  const exactPrimaryMatches = getExactTokenMatchCount(descriptor.tokens, document.primaryTokens)
  const exactSecondaryMatches = getExactTokenMatchCount(descriptor.tokens, document.secondaryTokens)
  const tagIndex = descriptor.tokens.indexOf(document.endpoint.tag)
  const explicitTagBonus = tagIndex < 0 ? 0 : tagIndex === 0 ? 24 : 6

  if (exactPrimaryMatches > 0 || explicitTagBonus > 0) {
    addReason(reasons, 'matches exact procedure or tag terms')
  }

  return score + explicitTagBonus + exactPrimaryMatches * 12 + exactSecondaryMatches * 3
}

function scoreSearchDocument(
  document: SearchDocument,
  descriptor: QueryDescriptor,
): RankedSearchMatch | null {
  let score = 0
  const reasons: string[] = []
  let matchedGroups = 0
  let primaryMatches = 0
  let secondaryMatches = 0

  const exactProcedureOrPath =
    document.endpoint.procedure.toLowerCase() === descriptor.normalized ||
    document.endpoint.path.toLowerCase() === descriptor.normalized
  const primaryPhraseMatch = document.primaryText.includes(descriptor.normalized)
  const secondaryPhraseMatch = document.secondaryText.includes(descriptor.normalized)

  for (const group of descriptor.groups) {
    const matchesPrimary = group.terms.some((term) => document.primaryTokens.has(term))
    if (matchesPrimary) {
      matchedGroups += 1
      primaryMatches += 1
      continue
    }

    const matchesSecondary =
      group.terms.some((term) => document.secondaryTokens.has(term)) ||
      group.terms.some((term) => document.searchText.includes(term))

    if (matchesSecondary) {
      matchedGroups += 1
      secondaryMatches += 1
    }
  }

  if (
    !(exactProcedureOrPath || primaryPhraseMatch || secondaryPhraseMatch) &&
    matchedGroups < getMinimumMatches(descriptor.groups.length)
  ) {
    return null
  }

  if (exactProcedureOrPath) {
    score += 160
    addReason(reasons, 'exact procedure or path match')
  } else if (primaryPhraseMatch) {
    score += 72
    addReason(reasons, 'matches procedure, tag, or summary text')
  } else if (secondaryPhraseMatch) {
    score += 36
    addReason(reasons, 'matches input or response hint text')
  }

  score += primaryMatches * 18
  score += secondaryMatches * 9

  score = applyExactTokenScore(document, descriptor, score, reasons)

  if (matchedGroups === descriptor.groups.length && descriptor.groups.length > 1) {
    score += 18
    addReason(reasons, 'matches all query terms')
  }

  score = applyIntentScore(document, descriptor, score, reasons)

  if (document.isVirtual && ['batch', 'logs', 'overview', 'preview'].includes(descriptor.intent)) {
    score += 12
    addReason(reasons, 'prefers higher-level helper for this workflow')
  }

  if (
    descriptor.intent !== 'mutate' &&
    isMutationDocument(document) &&
    !isPreviewDocument(document)
  ) {
    score -= 10
  }

  if (score <= 0) return null

  return {
    endpoint: document.endpoint,
    index: document.index,
    score,
    reasons,
  }
}

function compareRankedMatches(left: RankedSearchMatch, right: RankedSearchMatch) {
  if (right.score !== left.score) return right.score - left.score

  const leftIsVirtual = left.endpoint.path.startsWith('/virtual/')
  const rightIsVirtual = right.endpoint.path.startsWith('/virtual/')
  if (leftIsVirtual !== rightIsVirtual) return Number(rightIsVirtual) - Number(leftIsVirtual)

  return left.index - right.index
}

function createRankedMatches(documents: SearchDocument[], query: string) {
  const descriptor = createQueryDescriptor(query)
  if (!descriptor) {
    return {
      descriptor: null,
      matches: [] as RankedSearchMatch[],
    }
  }

  const matches = documents
    .map((document) => scoreSearchDocument(document, descriptor))
    .filter((match): match is RankedSearchMatch => Boolean(match))
    .sort(compareRankedMatches)

  return {
    descriptor,
    matches,
  }
}

function createRecommendation(match: RankedSearchMatch) {
  return {
    procedure: match.endpoint.procedure,
    kind: match.endpoint.path.startsWith('/virtual/') ? 'helper' : 'endpoint',
    tag: match.endpoint.tag,
    path: match.endpoint.path,
    summary: match.endpoint.summary,
    why: match.reasons.slice(0, 3),
    requiredInputs: match.endpoint.requiredInputs,
    optionalInputs: match.endpoint.optionalInputs.slice(0, 6),
  }
}

export function createSearchCatalogView() {
  const endpoints = [
    ...dokployCatalog.endpoints.map(createCatalogEndpointView),
    ...getVirtualCatalogEndpoints().map(applyCatalogResponseHints),
  ] as SearchEndpoint[]
  const indexes = createCatalogIndexes(endpoints)
  const documents = endpoints.map(createSearchDocument)

  return {
    endpoints,
    byTag: indexes.byTag,
    byProcedure: indexes.byProcedure,
    byPath: indexes.byPath,
    get: (id: string) => {
      const index = indexes.byProcedure[id] ?? indexes.byPath[id]
      const endpoint = index === undefined ? null : endpoints[index]
      if (!endpoint) return null

      const procedure = endpoint.procedure
      const schema =
        getVirtualProcedureSchema(procedure) ??
        getEffectiveProcedureSchema(procedure) ??
        procedureSchemas[procedure as keyof typeof procedureSchemas]

      return {
        ...endpoint,
        inputSchema: schema?.inputSchema ?? null,
        outputSchema: schema?.outputSchema ?? null,
      }
    },
    getByTag: (tag: string) =>
      (indexes.byTag[tag] ?? []).map((index) => endpoints[index]).filter(Boolean),
    searchText: (query: string) =>
      createRankedMatches(documents, query).matches.map((match) => match.endpoint),
    recommend: (query: string) => {
      const ranked = createRankedMatches(documents, query)

      return {
        query: query.trim(),
        intent: ranked.descriptor?.intent ?? 'inspect',
        recommended: ranked.matches.slice(0, 3).map(createRecommendation),
        related: ranked.matches.slice(3, 8).map(createRecommendation),
      }
    },
  }
}
