import { getStringOrNull, isRecord } from '../../codemode/virtual-procedures/shared.js'
import type { ResourceExecutor } from '../resources/runtime.js'
import { createResourceExecutor } from '../resources/runtime.js'
import { extractItems, getOptionalId } from '../resources/shared.js'

const MAX_COMPLETION_VALUES = 12
const SEARCH_LIMIT = 25

export const databaseKinds = ['mariadb', 'mongo', 'mysql', 'postgres', 'redis'] as const
export const passwordTypes = ['user', 'root'] as const

export type DatabaseKind = (typeof databaseKinds)[number]

const databaseKindsWithPasswordType = ['mariadb', 'mysql'] as const

export interface PromptCompletionContext {
  arguments?: Record<string, string>
}

export type PromptCompletionProvider = (
  value: string,
  context?: PromptCompletionContext,
) => Promise<string[]> | string[]

export interface PromptCompletionProviders {
  applicationId: PromptCompletionProvider
  databaseId: PromptCompletionProvider
  environmentId: PromptCompletionProvider
  projectId: PromptCompletionProvider
  databaseKind: PromptCompletionProvider
  passwordType: PromptCompletionProvider
  serverId: PromptCompletionProvider
}

interface CompletionCandidate {
  value: string
  aliases: string[]
  index: number
}

const databaseSearchConfig: Record<
  DatabaseKind,
  {
    idKey: string
    procedure: string
  }
> = {
  mariadb: {
    procedure: 'mariadb.search',
    idKey: 'mariadbId',
  },
  mongo: {
    procedure: 'mongo.search',
    idKey: 'mongoId',
  },
  mysql: {
    procedure: 'mysql.search',
    idKey: 'mysqlId',
  },
  postgres: {
    procedure: 'postgres.search',
    idKey: 'postgresId',
  },
  redis: {
    procedure: 'redis.search',
    idKey: 'redisId',
  },
}

function normalizeCompletionText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function getContextArgument(context: PromptCompletionContext | undefined, key: string) {
  const value = context?.arguments?.[key]
  return isNonEmptyString(value) ? value.trim() : undefined
}

export function supportsPasswordType(
  kind: DatabaseKind | string | undefined,
): kind is (typeof databaseKindsWithPasswordType)[number] {
  return kind === 'mariadb' || kind === 'mysql'
}

function buildCompletionCandidates(
  value: unknown,
  options: {
    aliasKeys: readonly string[]
    idKey: string
  },
) {
  return extractItems(value).flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return []
    }

    const id = getOptionalId(entry, options.idKey)
    if (!id) {
      return []
    }

    return [
      {
        value: id,
        aliases: options.aliasKeys.flatMap((key) => {
          const alias = getStringOrNull(entry[key])
          return alias ? [alias] : []
        }),
        index,
      } satisfies CompletionCandidate,
    ]
  })
}

function rankCompletionCandidate(candidate: CompletionCandidate, query: string) {
  if (query.length === 0) {
    return 0
  }

  const normalizedValue = normalizeCompletionText(candidate.value)
  if (normalizedValue === query) {
    return 0
  }

  if (normalizedValue.startsWith(query)) {
    return 1
  }

  const normalizedAliases = candidate.aliases.map((alias) => normalizeCompletionText(alias))
  if (normalizedAliases.some((alias) => alias === query)) {
    return 2
  }

  if (normalizedAliases.some((alias) => alias.startsWith(query))) {
    return 3
  }

  if (normalizedValue.includes(query)) {
    return 4
  }

  if (normalizedAliases.some((alias) => alias.includes(query))) {
    return 5
  }

  return Number.POSITIVE_INFINITY
}

export function rankCompletionValues(candidates: CompletionCandidate[], value: string) {
  const query = normalizeCompletionText(value)
  const seen = new Set<string>()
  const suggestions: string[] = []

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      rank: rankCompletionCandidate(candidate, query),
    }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((left, right) =>
      left.rank === right.rank
        ? left.candidate.index - right.candidate.index
        : left.rank - right.rank,
    )

  for (const { candidate } of ranked) {
    if (seen.has(candidate.value)) {
      continue
    }

    seen.add(candidate.value)
    suggestions.push(candidate.value)

    if (suggestions.length >= MAX_COMPLETION_VALUES) {
      break
    }
  }

  return suggestions
}

async function safeLoadCompletionCandidates(
  executor: ResourceExecutor,
  options: {
    aliasKeys: readonly string[]
    idKey: string
    input: Record<string, unknown>
    procedure: string
  },
) {
  try {
    const data = await executor(options.procedure, options.input)
    return buildCompletionCandidates(data, {
      idKey: options.idKey,
      aliasKeys: options.aliasKeys,
    })
  } catch {
    return []
  }
}

async function completeSearchIds(
  executor: ResourceExecutor,
  value: string,
  options: {
    aliasKeys: readonly string[]
    fallbackInput?: Record<string, unknown>
    idKey: string
    input: Record<string, unknown>
    procedure: string
  },
) {
  const primaryCandidates = await safeLoadCompletionCandidates(executor, options)
  const primaryMatches = rankCompletionValues(primaryCandidates, value)

  if (primaryMatches.length > 0 || !options.fallbackInput) {
    return primaryMatches
  }

  const fallbackCandidates = await safeLoadCompletionCandidates(executor, {
    ...options,
    input: options.fallbackInput,
  })
  return rankCompletionValues(fallbackCandidates, value)
}

export function createStaticCompletionProvider(
  values: readonly string[],
): PromptCompletionProvider {
  return (value) =>
    rankCompletionValues(
      values.map((entry, index) => ({
        value: entry,
        aliases: [],
        index,
      })),
      value,
    )
}

export function createCompletionExecutor(baseExecutor?: ResourceExecutor) {
  return createResourceExecutor(baseExecutor)
}

export function createCodeModeCompletionProviders(
  executor: ResourceExecutor = createCompletionExecutor(),
): PromptCompletionProviders {
  const passwordTypeProvider = createStaticCompletionProvider(passwordTypes)

  return {
    projectId: async (value) =>
      completeSearchIds(executor, value, {
        procedure: 'project.search',
        idKey: 'projectId',
        aliasKeys: ['name', 'description'],
        input: {
          limit: SEARCH_LIMIT,
          ...(isNonEmptyString(value) ? { q: value.trim() } : {}),
        },
        fallbackInput: isNonEmptyString(value)
          ? {
              limit: SEARCH_LIMIT,
            }
          : undefined,
      }),
    environmentId: async (value, context) => {
      const projectId = getContextArgument(context, 'projectId')

      if (projectId) {
        const candidates = await safeLoadCompletionCandidates(executor, {
          procedure: 'environment.byProjectId',
          idKey: 'environmentId',
          aliasKeys: ['name', 'description'],
          input: { projectId },
        })
        return rankCompletionValues(candidates, value)
      }

      return completeSearchIds(executor, value, {
        procedure: 'environment.search',
        idKey: 'environmentId',
        aliasKeys: ['name', 'description'],
        input: {
          limit: SEARCH_LIMIT,
          ...(isNonEmptyString(value) ? { q: value.trim() } : {}),
        },
        fallbackInput: isNonEmptyString(value)
          ? {
              limit: SEARCH_LIMIT,
            }
          : undefined,
      })
    },
    applicationId: async (value, context) =>
      completeSearchIds(executor, value, {
        procedure: 'application.search',
        idKey: 'applicationId',
        aliasKeys: ['name', 'appName', 'description', 'repository', 'owner'],
        input: {
          limit: SEARCH_LIMIT,
          ...(isNonEmptyString(value) ? { q: value.trim() } : {}),
          ...(getContextArgument(context, 'projectId')
            ? { projectId: getContextArgument(context, 'projectId') }
            : {}),
          ...(getContextArgument(context, 'environmentId')
            ? { environmentId: getContextArgument(context, 'environmentId') }
            : {}),
        },
        fallbackInput: isNonEmptyString(value)
          ? {
              limit: SEARCH_LIMIT,
              ...(getContextArgument(context, 'projectId')
                ? { projectId: getContextArgument(context, 'projectId') }
                : {}),
              ...(getContextArgument(context, 'environmentId')
                ? { environmentId: getContextArgument(context, 'environmentId') }
                : {}),
            }
          : undefined,
      }),
    serverId: async (value) => {
      const candidates = await safeLoadCompletionCandidates(executor, {
        procedure: 'server.all',
        idKey: 'serverId',
        aliasKeys: ['name', 'hostname', 'ipAddress', 'description'],
        input: {},
      })
      return rankCompletionValues(candidates, value)
    },
    databaseId: async (value, context) => {
      const kind = getContextArgument(context, 'kind')
      if (!(kind && databaseKinds.includes(kind as DatabaseKind))) {
        return []
      }

      const config = databaseSearchConfig[kind as DatabaseKind]
      return completeSearchIds(executor, value, {
        procedure: config.procedure,
        idKey: config.idKey,
        aliasKeys: ['name', 'appName', 'description'],
        input: {
          limit: SEARCH_LIMIT,
          ...(isNonEmptyString(value) ? { q: value.trim() } : {}),
          ...(getContextArgument(context, 'projectId')
            ? { projectId: getContextArgument(context, 'projectId') }
            : {}),
          ...(getContextArgument(context, 'environmentId')
            ? { environmentId: getContextArgument(context, 'environmentId') }
            : {}),
        },
        fallbackInput: isNonEmptyString(value)
          ? {
              limit: SEARCH_LIMIT,
              ...(getContextArgument(context, 'projectId')
                ? { projectId: getContextArgument(context, 'projectId') }
                : {}),
              ...(getContextArgument(context, 'environmentId')
                ? { environmentId: getContextArgument(context, 'environmentId') }
                : {}),
            }
          : undefined,
      })
    },
    databaseKind: createStaticCompletionProvider(databaseKinds),
    passwordType: (value, context) => {
      const kind = getContextArgument(context, 'kind')

      if (kind && !supportsPasswordType(kind)) {
        return []
      }

      return passwordTypeProvider(value)
    },
  }
}
