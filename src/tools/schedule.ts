import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const nullableString = z.string().nullable().optional()
const scheduleTypeSchema = z
  .enum(['application', 'compose', 'server', 'dokploy-server'])
  .describe('Schedule type')

const shellTypeSchema = z.enum(['bash', 'sh']).describe('Shell type')

const schedulePayload = z
  .object({
    scheduleId: z.string().optional().describe('Schedule ID'),
    name: z.string().describe('Schedule name'),
    cronExpression: z.string().describe('Cron expression'),
    appName: z.string().optional().describe('App name'),
    serviceName: nullableString.describe('Service name'),
    shellType: shellTypeSchema.optional(),
    scheduleType: scheduleTypeSchema.optional(),
    command: z.string().describe('Command to execute'),
    script: nullableString.describe('Inline script'),
    applicationId: nullableString.describe('Application ID'),
    composeId: nullableString.describe('Compose ID'),
    serverId: nullableString.describe('Server ID'),
    userId: nullableString.describe('User ID'),
    enabled: z.boolean().optional().describe('Whether the schedule is enabled'),
    timezone: nullableString.describe('Timezone'),
    createdAt: z.string().optional().describe('Creation timestamp'),
  })
  .strict()

const list = getTool({
  name: 'dokploy_schedule_list',
  title: 'List Schedules',
  description: 'List schedules in Dokploy for a specific entity ID and schedule type.',
  schema: z
    .object({
      id: z.string().describe('Entity ID'),
      scheduleType: scheduleTypeSchema,
    })
    .strict(),
  endpoint: '/schedule.list',
})

const one = getTool({
  name: 'dokploy_schedule_one',
  title: 'Get Schedule',
  description: 'Retrieve a Dokploy schedule by its ID.',
  schema: z
    .object({
      scheduleId: z.string().describe('Schedule ID'),
    })
    .strict(),
  endpoint: '/schedule.one',
})

const create = postTool({
  name: 'dokploy_schedule_create',
  title: 'Create Schedule',
  description:
    'Create a new schedule in Dokploy. Requires the schedule name, cron expression, and command.',
  schema: schedulePayload,
  endpoint: '/schedule.create',
})

const update = postTool({
  name: 'dokploy_schedule_update',
  title: 'Update Schedule',
  description:
    'Update an existing schedule in Dokploy. Requires the schedule ID together with the updated schedule payload.',
  schema: schedulePayload
    .extend({
      scheduleId: z.string().min(1).describe('Schedule ID'),
    })
    .strict(),
  endpoint: '/schedule.update',
})

const remove = postTool({
  name: 'dokploy_schedule_delete',
  title: 'Delete Schedule',
  description:
    'Delete a schedule from Dokploy. Requires the schedule ID. This is a destructive action.',
  schema: z
    .object({
      scheduleId: z.string().describe('Schedule ID'),
    })
    .strict(),
  endpoint: '/schedule.delete',
  annotations: { destructiveHint: true },
})

const runManually = postTool({
  name: 'dokploy_schedule_run_manually',
  title: 'Run Schedule Manually',
  description: 'Run a Dokploy schedule immediately. Requires the schedule ID.',
  schema: z
    .object({
      scheduleId: z.string().min(1).describe('Schedule ID'),
    })
    .strict(),
  endpoint: '/schedule.runManually',
})

export const scheduleTools: ToolDefinition[] = [list, one, create, update, remove, runManually]
