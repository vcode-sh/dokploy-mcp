import { completable } from '@modelcontextprotocol/sdk/server/completable.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import {
  createCodeModeCompletionProviders,
  databaseKinds,
  type PromptCompletionProvider,
  passwordTypes,
} from '../completions/index.js'
import type { McpCapabilityRegistrationOptions } from '../registration/types.js'
import {
  createPromptExecutor,
  type DeployApplicationPromptArgs,
  type DiagnoseDeploymentPromptArgs,
  type ReviewProjectInfrastructurePromptArgs,
  type RotateDatabasePasswordPreviewPromptArgs,
  renderDeployApplicationPrompt,
  renderDiagnoseDeploymentPrompt,
  renderReviewProjectInfrastructurePrompt,
  renderRotateDatabasePasswordPreviewPrompt,
  renderTriageProjectLogsPrompt,
  type TriageProjectLogsPromptArgs,
} from './runtime.js'

function withCompletion<T extends z.ZodTypeAny>(
  schema: T,
  enabled: boolean,
  provider: PromptCompletionProvider,
) {
  return (enabled ? completable(schema as never, provider as never) : schema) as T
}

export function registerCodeModePrompts(
  server: McpServer,
  options: McpCapabilityRegistrationOptions = {},
) {
  const executor = createPromptExecutor()
  const completions = createCodeModeCompletionProviders(executor)
  const enableCompletions = options.capabilityFlags?.completions === true

  server.registerPrompt(
    'deploy-application',
    {
      title: 'Deploy Application',
      description: 'Guide a safe application deploy with bounded current-state context.',
      argsSchema: {
        applicationId: withCompletion(
          z.string().min(1).describe('Dokploy application ID to deploy.'),
          enableCompletions,
          completions.applicationId,
        ),
        title: z
          .string()
          .min(1)
          .max(120)
          .optional()
          .describe('Optional deployment title to pass through to Dokploy.'),
        description: z
          .string()
          .min(1)
          .max(500)
          .optional()
          .describe('Optional deployment description to pass through to Dokploy.'),
      },
    },
    (args) => renderDeployApplicationPrompt(args as DeployApplicationPromptArgs, executor),
  )

  server.registerPrompt(
    'diagnose-deployment',
    {
      title: 'Diagnose Deployment',
      description: 'Guide a read-only diagnosis workflow for one application deployment.',
      argsSchema: {
        applicationId: withCompletion(
          z.string().min(1).describe('Dokploy application ID to diagnose.'),
          enableCompletions,
          completions.applicationId,
        ),
      },
    },
    (args) => renderDiagnoseDeploymentPrompt(args as DiagnoseDeploymentPromptArgs, executor),
  )

  server.registerPrompt(
    'review-project-infrastructure',
    {
      title: 'Review Project Infrastructure',
      description: 'Guide a bounded infrastructure review for one Dokploy project.',
      argsSchema: {
        projectId: withCompletion(
          z.string().min(1).describe('Dokploy project ID to review.'),
          enableCompletions,
          completions.projectId,
        ),
        includeServerSecurity: z.coerce
          .boolean()
          .optional()
          .describe('Whether to include server security snapshots in the bounded review.'),
      },
    },
    (args) =>
      renderReviewProjectInfrastructurePrompt(
        args as ReviewProjectInfrastructurePromptArgs,
        executor,
      ),
  )

  server.registerPrompt(
    'rotate-database-password-preview',
    {
      title: 'Rotate Database Password Preview',
      description: 'Preview a safe password-rotation workflow without mutating a database.',
      argsSchema: {
        kind: withCompletion(
          z
            .enum(databaseKinds)
            .describe('Database kind: mariadb, mongo, mysql, postgres, or redis.'),
          enableCompletions,
          completions.databaseKind,
        ),
        databaseId: withCompletion(
          z.string().min(1).describe('Database ID for the selected database kind.'),
          enableCompletions,
          completions.databaseId,
        ),
        passwordType: withCompletion(
          z
            .enum(passwordTypes)
            .optional()
            .describe(
              'Optional password type for engines that support it, such as mariadb and mysql.',
            ),
          enableCompletions,
          completions.passwordType,
        ),
      },
    },
    (args) =>
      renderRotateDatabasePasswordPreviewPrompt(
        args as RotateDatabasePasswordPreviewPromptArgs,
        executor,
      ),
  )

  server.registerPrompt(
    'triage-project-logs',
    {
      title: 'Triage Project Logs',
      description: 'Guide a bounded read-only log triage workflow for one project.',
      argsSchema: {
        projectId: withCompletion(
          z.string().min(1).describe('Dokploy project ID to inspect.'),
          enableCompletions,
          completions.projectId,
        ),
        environmentId: withCompletion(
          z
            .string()
            .min(1)
            .optional()
            .describe('Optional Dokploy environment ID to narrow the bounded logs triage.'),
          enableCompletions,
          completions.environmentId,
        ),
        search: z
          .string()
          .min(1)
          .max(200)
          .optional()
          .describe('Optional substring filter to apply to the bounded logs snapshot.'),
        includeDatabases: z.coerce
          .boolean()
          .optional()
          .describe('Whether to include database logs in the bounded triage snapshot.'),
        tail: z.coerce
          .number()
          .int()
          .min(0)
          .max(200)
          .optional()
          .describe('Maximum number of recent lines to sample per source in the bounded snapshot.'),
      },
    },
    (args) => renderTriageProjectLogsPrompt(args as TriageProjectLogsPromptArgs, executor),
  )
}
