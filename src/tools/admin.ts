import { z } from 'zod'
import { postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const setupMonitoring = postTool({
  name: 'dokploy_admin_setup_monitoring',
  title: 'Setup Monitoring',
  description:
    'Configure server and container monitoring metrics. Sets up refresh rates, retention policies, callback URLs, resource thresholds, and container service filters for the monitoring system.',
  schema: z.object({
    metricsConfig: z.object({
      server: z.object({
        refreshRate: z.number().min(2).describe('Metrics refresh rate in seconds (minimum 2)'),
        port: z.number().min(1).describe('Monitoring port number'),
        token: z.string().describe('Authentication token for metrics endpoint'),
        urlCallback: z.string().url().describe('Callback URL for metrics data'),
        retentionDays: z.number().min(1).describe('Number of days to retain metrics data'),
        cronJob: z.string().min(1).describe('Cron expression for scheduled metrics collection'),
        thresholds: z.object({
          cpu: z.number().min(0).describe('CPU usage threshold percentage'),
          memory: z.number().min(0).describe('Memory usage threshold percentage'),
        }).strict(),
      }).strict(),
      containers: z.object({
        refreshRate: z.number().min(2).describe('Container metrics refresh rate in seconds (minimum 2)'),
        services: z.object({
          include: z.array(z.string()).optional().describe('Service names to include in monitoring'),
          exclude: z.array(z.string()).optional().describe('Service names to exclude from monitoring'),
        }).strict(),
      }).strict(),
    }).strict(),
  }).strict(),
  endpoint: '/admin.setupMonitoring',
})

// ── export ───────────────────────────────────────────────────────────
export const adminTools: ToolDefinition[] = [setupMonitoring]
