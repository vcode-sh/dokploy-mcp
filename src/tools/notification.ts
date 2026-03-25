import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const stringArray = z.array(z.string()).min(1).describe('Target addresses')
const stringRecord = z.record(z.string(), z.string()).describe('String map')

const optionalBoolean = z.boolean().optional()
const optionalString = z.string().optional()
const optionalNumber = z.number().optional()

const notificationEventFieldFactories = {
  appBuildError: () => optionalBoolean.describe('Notify on application build errors'),
  databaseBackup: () => optionalBoolean.describe('Notify on database backups'),
  volumeBackup: () => optionalBoolean.describe('Notify on volume backups'),
  dokployRestart: () => optionalBoolean.describe('Notify on Dokploy restarts'),
  name: () => optionalString.describe('Notification name'),
  appDeploy: () => optionalBoolean.describe('Notify on application deployments'),
  dockerCleanup: () => optionalBoolean.describe('Notify on Docker cleanup'),
  serverThreshold: () => optionalBoolean.describe('Notify on server threshold alerts'),
} as const

type NotificationEventField = keyof typeof notificationEventFieldFactories

function withRequired<T extends Record<string, z.ZodTypeAny>, K extends readonly (keyof T)[]>(
  shape: T,
  required: K,
) {
  const entries = Object.entries(shape).map(([key, schema]) => {
    if (required.includes(key as keyof T)) {
      return [key, schema instanceof z.ZodOptional ? schema.unwrap() : schema]
    }

    return [key, schema]
  })

  return Object.fromEntries(entries) as T
}

function notificationEventShape(requiredFields: readonly NotificationEventField[]) {
  const base = {
    appBuildError: notificationEventFieldFactories.appBuildError(),
    databaseBackup: notificationEventFieldFactories.databaseBackup(),
    volumeBackup: notificationEventFieldFactories.volumeBackup(),
    dokployRestart: notificationEventFieldFactories.dokployRestart(),
    name: notificationEventFieldFactories.name(),
    appDeploy: notificationEventFieldFactories.appDeploy(),
    dockerCleanup: notificationEventFieldFactories.dockerCleanup(),
    serverThreshold: notificationEventFieldFactories.serverThreshold(),
  }

  return withRequired(base, requiredFields)
}

function createSchema<T extends Record<string, z.ZodTypeAny>, K extends readonly (keyof T)[]>(
  eventRequired: readonly NotificationEventField[],
  providerShape: T,
  providerRequired: K,
) {
  const fullShape = {
    ...notificationEventShape(eventRequired),
    ...providerShape,
  }

  const required = [...eventRequired, ...providerRequired] as readonly (keyof typeof fullShape)[]
  return z.object(withRequired(fullShape, required)).strict()
}

function updateSchema<
  T extends Record<string, z.ZodTypeAny>,
  I extends Record<string, z.ZodTypeAny>,
  K extends readonly (keyof I)[],
>(providerIds: I, providerIdRequired: K, providerShape: T) {
  const fullShape = {
    ...notificationEventShape([]),
    ...providerShape,
    ...providerIds,
    organizationId: optionalString.describe('Organization ID'),
  }

  const required = [...providerIdRequired] as readonly (keyof typeof fullShape)[]
  return z.object(withRequired(fullShape, required)).strict()
}

function testSchema<T extends Record<string, z.ZodTypeAny>, K extends readonly (keyof T)[]>(
  providerShape: T,
  providerRequired: K,
) {
  return z.object(withRequired(providerShape, providerRequired)).strict()
}

const customShape = {
  endpoint: z.string().min(1).describe('Custom webhook endpoint'),
  headers: stringRecord.optional().describe('HTTP headers'),
}

const discordShape = {
  webhookUrl: z.string().min(1).describe('Discord webhook URL'),
  decoration: optionalBoolean.describe('Whether to include decorations'),
}

const emailShape = {
  smtpServer: z.string().min(1).describe('SMTP server'),
  smtpPort: z.number().min(1).describe('SMTP port'),
  username: z.string().min(1).describe('SMTP username'),
  password: z.string().min(1).describe('SMTP password'),
  fromAddress: z.string().min(1).describe('From address'),
  toAddresses: stringArray,
}

const gotifyShape = {
  serverUrl: z.string().min(1).describe('Gotify server URL'),
  appToken: z.string().min(1).describe('Gotify app token'),
  priority: z.number().min(1).describe('Notification priority'),
  decoration: optionalBoolean.describe('Whether to include decorations'),
}

const larkShape = {
  webhookUrl: z.string().min(1).describe('Lark webhook URL'),
}

const ntfyShape = {
  serverUrl: z.string().min(1).describe('ntfy server URL'),
  topic: z.string().min(1).describe('ntfy topic'),
  accessToken: optionalString.describe('ntfy access token'),
  priority: z.number().min(1).describe('Notification priority'),
}

const pushoverShape = {
  userKey: z.string().min(1).describe('Pushover user key'),
  apiToken: z.string().min(1).describe('Pushover API token'),
  priority: optionalNumber.describe('Notification priority'),
  retry: z.number().min(30).nullable().optional().describe('Retry interval'),
  expire: z.number().min(1).max(10800).nullable().optional().describe('Expire time'),
}

const resendShape = {
  apiKey: z.string().min(1).describe('Resend API key'),
  fromAddress: z.string().min(1).describe('From address'),
  toAddresses: stringArray,
}

const slackShape = {
  webhookUrl: z.string().min(1).describe('Slack webhook URL'),
  channel: optionalString.describe('Slack channel'),
}

const teamsShape = {
  webhookUrl: z.string().min(1).describe('Teams webhook URL'),
}

const telegramShape = {
  botToken: z.string().min(1).describe('Telegram bot token'),
  chatId: z.string().min(1).describe('Telegram chat ID'),
  messageThreadId: optionalString.describe('Telegram message thread ID'),
}

const createCustom = postTool({
  name: 'dokploy_notification_create_custom',
  title: 'Create Custom Notification',
  description: 'Create a custom webhook notification channel in Dokploy.',
  schema: createSchema(['name'], customShape, ['endpoint'] as const),
  endpoint: '/notification.createCustom',
})

const createDiscord = postTool({
  name: 'dokploy_notification_create_discord',
  title: 'Create Discord Notification',
  description: 'Create a Discord notification channel in Dokploy.',
  schema: createSchema(
    [
      'appBuildError',
      'databaseBackup',
      'volumeBackup',
      'dokployRestart',
      'name',
      'appDeploy',
      'dockerCleanup',
      'serverThreshold',
    ],
    discordShape,
    ['webhookUrl', 'decoration'] as const,
  ),
  endpoint: '/notification.createDiscord',
})

const createEmail = postTool({
  name: 'dokploy_notification_create_email',
  title: 'Create Email Notification',
  description: 'Create an SMTP email notification channel in Dokploy.',
  schema: createSchema(
    [
      'appBuildError',
      'databaseBackup',
      'volumeBackup',
      'dokployRestart',
      'name',
      'appDeploy',
      'dockerCleanup',
      'serverThreshold',
    ],
    emailShape,
    ['smtpServer', 'smtpPort', 'username', 'password', 'fromAddress', 'toAddresses'] as const,
  ),
  endpoint: '/notification.createEmail',
})

const createGotify = postTool({
  name: 'dokploy_notification_create_gotify',
  title: 'Create Gotify Notification',
  description: 'Create a Gotify notification channel in Dokploy.',
  schema: createSchema(
    [
      'appBuildError',
      'databaseBackup',
      'volumeBackup',
      'dokployRestart',
      'name',
      'appDeploy',
      'dockerCleanup',
    ],
    gotifyShape,
    ['serverUrl', 'appToken', 'priority'] as const,
  ),
  endpoint: '/notification.createGotify',
})

const createLark = postTool({
  name: 'dokploy_notification_create_lark',
  title: 'Create Lark Notification',
  description: 'Create a Lark notification channel in Dokploy.',
  schema: createSchema(
    [
      'appBuildError',
      'databaseBackup',
      'volumeBackup',
      'dokployRestart',
      'name',
      'appDeploy',
      'dockerCleanup',
      'serverThreshold',
    ],
    larkShape,
    ['webhookUrl'] as const,
  ),
  endpoint: '/notification.createLark',
})

const createNtfy = postTool({
  name: 'dokploy_notification_create_ntfy',
  title: 'Create ntfy Notification',
  description: 'Create an ntfy notification channel in Dokploy.',
  schema: createSchema(
    [
      'appBuildError',
      'databaseBackup',
      'volumeBackup',
      'dokployRestart',
      'name',
      'appDeploy',
      'dockerCleanup',
    ],
    ntfyShape,
    ['serverUrl', 'topic', 'priority'] as const,
  ),
  endpoint: '/notification.createNtfy',
})

const createPushover = postTool({
  name: 'dokploy_notification_create_pushover',
  title: 'Create Pushover Notification',
  description: 'Create a Pushover notification channel in Dokploy.',
  schema: createSchema(['name'], pushoverShape, ['userKey', 'apiToken'] as const),
  endpoint: '/notification.createPushover',
})

const createResend = postTool({
  name: 'dokploy_notification_create_resend',
  title: 'Create Resend Notification',
  description: 'Create a Resend email notification channel in Dokploy.',
  schema: createSchema(
    [
      'appBuildError',
      'databaseBackup',
      'volumeBackup',
      'dokployRestart',
      'name',
      'appDeploy',
      'dockerCleanup',
      'serverThreshold',
    ],
    resendShape,
    ['apiKey', 'fromAddress', 'toAddresses'] as const,
  ),
  endpoint: '/notification.createResend',
})

const createSlack = postTool({
  name: 'dokploy_notification_create_slack',
  title: 'Create Slack Notification',
  description: 'Create a Slack notification channel in Dokploy.',
  schema: createSchema(
    [
      'appBuildError',
      'databaseBackup',
      'volumeBackup',
      'dokployRestart',
      'name',
      'appDeploy',
      'dockerCleanup',
      'serverThreshold',
    ],
    slackShape,
    ['webhookUrl'] as const,
  ),
  endpoint: '/notification.createSlack',
})

const createTeams = postTool({
  name: 'dokploy_notification_create_teams',
  title: 'Create Teams Notification',
  description: 'Create a Microsoft Teams notification channel in Dokploy.',
  schema: createSchema(
    [
      'appBuildError',
      'databaseBackup',
      'volumeBackup',
      'dokployRestart',
      'name',
      'appDeploy',
      'dockerCleanup',
      'serverThreshold',
    ],
    teamsShape,
    ['webhookUrl'] as const,
  ),
  endpoint: '/notification.createTeams',
})

const createTelegram = postTool({
  name: 'dokploy_notification_create_telegram',
  title: 'Create Telegram Notification',
  description: 'Create a Telegram notification channel in Dokploy.',
  schema: createSchema(
    [
      'appBuildError',
      'databaseBackup',
      'volumeBackup',
      'dokployRestart',
      'name',
      'appDeploy',
      'dockerCleanup',
      'serverThreshold',
    ],
    telegramShape,
    ['botToken', 'chatId'] as const,
  ),
  endpoint: '/notification.createTelegram',
})

const updateCustom = postTool({
  name: 'dokploy_notification_update_custom',
  title: 'Update Custom Notification',
  description: 'Update a custom webhook notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      customId: z.string().min(1).describe('Custom notification ID'),
    },
    ['notificationId', 'customId'] as const,
    customShape,
  ),
  endpoint: '/notification.updateCustom',
})

const updateDiscord = postTool({
  name: 'dokploy_notification_update_discord',
  title: 'Update Discord Notification',
  description: 'Update a Discord notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      discordId: z.string().min(1).describe('Discord notification ID'),
    },
    ['notificationId', 'discordId'] as const,
    discordShape,
  ),
  endpoint: '/notification.updateDiscord',
})

const updateEmail = postTool({
  name: 'dokploy_notification_update_email',
  title: 'Update Email Notification',
  description: 'Update an SMTP email notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      emailId: z.string().min(1).describe('Email notification ID'),
    },
    ['notificationId', 'emailId'] as const,
    emailShape,
  ),
  endpoint: '/notification.updateEmail',
})

const updateGotify = postTool({
  name: 'dokploy_notification_update_gotify',
  title: 'Update Gotify Notification',
  description: 'Update a Gotify notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      gotifyId: z.string().min(1).describe('Gotify notification ID'),
    },
    ['notificationId', 'gotifyId'] as const,
    gotifyShape,
  ),
  endpoint: '/notification.updateGotify',
})

const updateLark = postTool({
  name: 'dokploy_notification_update_lark',
  title: 'Update Lark Notification',
  description: 'Update a Lark notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      larkId: z.string().min(1).describe('Lark notification ID'),
    },
    ['notificationId', 'larkId'] as const,
    larkShape,
  ),
  endpoint: '/notification.updateLark',
})

const updateNtfy = postTool({
  name: 'dokploy_notification_update_ntfy',
  title: 'Update ntfy Notification',
  description: 'Update an ntfy notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      ntfyId: z.string().min(1).describe('ntfy notification ID'),
    },
    ['notificationId', 'ntfyId'] as const,
    ntfyShape,
  ),
  endpoint: '/notification.updateNtfy',
})

const updatePushover = postTool({
  name: 'dokploy_notification_update_pushover',
  title: 'Update Pushover Notification',
  description: 'Update a Pushover notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      pushoverId: z.string().min(1).describe('Pushover notification ID'),
    },
    ['notificationId', 'pushoverId'] as const,
    pushoverShape,
  ),
  endpoint: '/notification.updatePushover',
})

const updateResend = postTool({
  name: 'dokploy_notification_update_resend',
  title: 'Update Resend Notification',
  description: 'Update a Resend notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      resendId: z.string().min(1).describe('Resend notification ID'),
    },
    ['notificationId', 'resendId'] as const,
    resendShape,
  ),
  endpoint: '/notification.updateResend',
})

const updateSlack = postTool({
  name: 'dokploy_notification_update_slack',
  title: 'Update Slack Notification',
  description: 'Update a Slack notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      slackId: z.string().min(1).describe('Slack notification ID'),
    },
    ['notificationId', 'slackId'] as const,
    slackShape,
  ),
  endpoint: '/notification.updateSlack',
})

const updateTeams = postTool({
  name: 'dokploy_notification_update_teams',
  title: 'Update Teams Notification',
  description: 'Update a Microsoft Teams notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      teamsId: z.string().min(1).describe('Teams notification ID'),
    },
    ['notificationId', 'teamsId'] as const,
    teamsShape,
  ),
  endpoint: '/notification.updateTeams',
})

const updateTelegram = postTool({
  name: 'dokploy_notification_update_telegram',
  title: 'Update Telegram Notification',
  description: 'Update a Telegram notification channel in Dokploy.',
  schema: updateSchema(
    {
      notificationId: z.string().min(1).describe('Notification ID'),
      telegramId: z.string().min(1).describe('Telegram notification ID'),
    },
    ['notificationId', 'telegramId'] as const,
    telegramShape,
  ),
  endpoint: '/notification.updateTelegram',
})

const testCustomConnection = postTool({
  name: 'dokploy_notification_test_custom_connection',
  title: 'Test Custom Notification Connection',
  description: 'Test a custom webhook notification configuration in Dokploy.',
  schema: testSchema(customShape, ['endpoint'] as const),
  endpoint: '/notification.testCustomConnection',
})

const testDiscordConnection = postTool({
  name: 'dokploy_notification_test_discord_connection',
  title: 'Test Discord Notification Connection',
  description: 'Test a Discord notification configuration in Dokploy.',
  schema: testSchema(discordShape, ['webhookUrl'] as const),
  endpoint: '/notification.testDiscordConnection',
})

const testEmailConnection = postTool({
  name: 'dokploy_notification_test_email_connection',
  title: 'Test Email Notification Connection',
  description: 'Test an SMTP email notification configuration in Dokploy.',
  schema: testSchema(emailShape, [
    'smtpServer',
    'smtpPort',
    'username',
    'password',
    'toAddresses',
    'fromAddress',
  ] as const),
  endpoint: '/notification.testEmailConnection',
})

const testGotifyConnection = postTool({
  name: 'dokploy_notification_test_gotify_connection',
  title: 'Test Gotify Notification Connection',
  description: 'Test a Gotify notification configuration in Dokploy.',
  schema: testSchema(gotifyShape, ['serverUrl', 'appToken', 'priority'] as const),
  endpoint: '/notification.testGotifyConnection',
})

const testLarkConnection = postTool({
  name: 'dokploy_notification_test_lark_connection',
  title: 'Test Lark Notification Connection',
  description: 'Test a Lark notification configuration in Dokploy.',
  schema: testSchema(larkShape, ['webhookUrl'] as const),
  endpoint: '/notification.testLarkConnection',
})

const testNtfyConnection = postTool({
  name: 'dokploy_notification_test_ntfy_connection',
  title: 'Test ntfy Notification Connection',
  description: 'Test an ntfy notification configuration in Dokploy.',
  schema: testSchema(ntfyShape, ['serverUrl', 'topic', 'priority'] as const),
  endpoint: '/notification.testNtfyConnection',
})

const testPushoverConnection = postTool({
  name: 'dokploy_notification_test_pushover_connection',
  title: 'Test Pushover Notification Connection',
  description: 'Test a Pushover notification configuration in Dokploy.',
  schema: testSchema(pushoverShape, ['userKey', 'apiToken', 'priority'] as const),
  endpoint: '/notification.testPushoverConnection',
})

const testResendConnection = postTool({
  name: 'dokploy_notification_test_resend_connection',
  title: 'Test Resend Notification Connection',
  description: 'Test a Resend notification configuration in Dokploy.',
  schema: testSchema(resendShape, ['apiKey', 'fromAddress', 'toAddresses'] as const),
  endpoint: '/notification.testResendConnection',
})

const testSlackConnection = postTool({
  name: 'dokploy_notification_test_slack_connection',
  title: 'Test Slack Notification Connection',
  description: 'Test a Slack notification configuration in Dokploy.',
  schema: testSchema(slackShape, ['webhookUrl', 'channel'] as const),
  endpoint: '/notification.testSlackConnection',
})

const testTeamsConnection = postTool({
  name: 'dokploy_notification_test_teams_connection',
  title: 'Test Teams Notification Connection',
  description: 'Test a Microsoft Teams notification configuration in Dokploy.',
  schema: testSchema(teamsShape, ['webhookUrl'] as const),
  endpoint: '/notification.testTeamsConnection',
})

const testTelegramConnection = postTool({
  name: 'dokploy_notification_test_telegram_connection',
  title: 'Test Telegram Notification Connection',
  description: 'Test a Telegram notification configuration in Dokploy.',
  schema: testSchema(telegramShape, ['botToken', 'chatId'] as const),
  endpoint: '/notification.testTelegramConnection',
})

const all = getTool({
  name: 'dokploy_notification_all',
  title: 'List Notifications',
  description: 'List all notification channels configured in Dokploy.',
  schema: z.object({}).strict(),
  endpoint: '/notification.all',
})

const getEmailProviders = getTool({
  name: 'dokploy_notification_get_email_providers',
  title: 'List Email Providers',
  description: 'List email provider records available to Dokploy notifications.',
  schema: z.object({}).strict(),
  endpoint: '/notification.getEmailProviders',
})

const one = getTool({
  name: 'dokploy_notification_one',
  title: 'Get Notification',
  description: 'Retrieve a notification channel by its ID.',
  schema: z
    .object({
      notificationId: z.string().min(1).describe('Notification ID'),
    })
    .strict(),
  endpoint: '/notification.one',
})

const receiveNotification = postTool({
  name: 'dokploy_notification_receive_notification',
  title: 'Receive Notification',
  description: 'Send a server-threshold notification payload into Dokploy.',
  schema: z
    .object({
      ServerType: z.enum(['Dokploy', 'Remote']).optional().describe('Server type'),
      Type: z.enum(['Memory', 'CPU']).describe('Metric type'),
      Value: z.number().describe('Metric value'),
      Threshold: z.number().describe('Threshold value'),
      Message: z.string().describe('Notification message'),
      Timestamp: z.string().describe('Timestamp'),
      Token: z.string().describe('Notification token'),
    })
    .strict(),
  endpoint: '/notification.receiveNotification',
})

const remove = postTool({
  name: 'dokploy_notification_remove',
  title: 'Remove Notification',
  description:
    'Delete a notification channel from Dokploy. Requires the notification ID. This is a destructive action.',
  schema: z
    .object({
      notificationId: z.string().min(1).describe('Notification ID'),
    })
    .strict(),
  endpoint: '/notification.remove',
  annotations: { destructiveHint: true },
})

export const notificationTools: ToolDefinition[] = [
  all,
  getEmailProviders,
  one,
  receiveNotification,
  remove,
  createCustom,
  createDiscord,
  createEmail,
  createGotify,
  createLark,
  createNtfy,
  createPushover,
  createResend,
  createSlack,
  createTeams,
  createTelegram,
  updateCustom,
  updateDiscord,
  updateEmail,
  updateGotify,
  updateLark,
  updateNtfy,
  updatePushover,
  updateResend,
  updateSlack,
  updateTeams,
  updateTelegram,
  testCustomConnection,
  testDiscordConnection,
  testEmailConnection,
  testGotifyConnection,
  testLarkConnection,
  testNtfyConnection,
  testPushoverConnection,
  testResendConnection,
  testSlackConnection,
  testTeamsConnection,
  testTelegramConnection,
]
