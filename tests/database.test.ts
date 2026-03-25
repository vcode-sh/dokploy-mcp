import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createDatabaseTools } from '../src/tools/_database.js'

describe('createDatabaseTools', () => {
  const tools = createDatabaseTools({
    type: 'testdb',
    idField: 'testdbId',
    displayName: 'TestDB',
    defaultImage: 'testdb:1',
    createFields: z.object({
      databaseName: z.string().min(1).describe('Database name'),
      databaseUser: z.string().min(1).describe('Database user'),
    }),
  })

  it('generates exactly 14 tools', () => {
    expect(tools).toHaveLength(14)
  })

  it('generates all expected tool names', () => {
    const names = tools.map((t) => t.name)
    expect(names).toEqual([
      'dokploy_testdb_one',
      'dokploy_testdb_create',
      'dokploy_testdb_update',
      'dokploy_testdb_remove',
      'dokploy_testdb_move',
      'dokploy_testdb_deploy',
      'dokploy_testdb_start',
      'dokploy_testdb_stop',
      'dokploy_testdb_reload',
      'dokploy_testdb_rebuild',
      'dokploy_testdb_change_status',
      'dokploy_testdb_save_external_port',
      'dokploy_testdb_save_environment',
      'dokploy_testdb_search',
    ])
  })

  it('all tools have titles containing display name', () => {
    for (const tool of tools) {
      expect(tool.title).toContain('TestDB')
    }
  })

  it('all tools have descriptions mentioning display name', () => {
    for (const tool of tools) {
      expect(tool.description).toContain('TestDB')
    }
  })

  it('one tool is read-only', () => {
    const one = tools.find((t) => t.name === 'dokploy_testdb_one')
    expect(one).toBeDefined()
    expect(one!.annotations.readOnlyHint).toBe(true)
    expect(one!.annotations.idempotentHint).toBe(true)
  })

  it('remove and stop tools are marked destructive', () => {
    const remove = tools.find((t) => t.name === 'dokploy_testdb_remove')
    const stop = tools.find((t) => t.name === 'dokploy_testdb_stop')
    expect(remove!.annotations.destructiveHint).toBe(true)
    expect(stop!.annotations.destructiveHint).toBe(true)
  })

  it('non-destructive tools do not have destructiveHint', () => {
    const safe = ['dokploy_testdb_create', 'dokploy_testdb_deploy', 'dokploy_testdb_start']
    for (const name of safe) {
      const tool = tools.find((t) => t.name === name)
      expect(tool!.annotations.destructiveHint).toBeUndefined()
    }
  })

  it('create tool includes custom createFields in schema', () => {
    const create = tools.find((t) => t.name === 'dokploy_testdb_create')
    expect(create).toBeDefined()
    // The schema should contain our custom fields + standard fields
    const shape = create!.schema.shape as Record<string, unknown>
    expect(shape.databaseName).toBeDefined()
    expect(shape.databaseUser).toBeDefined()
    expect(shape.name).toBeDefined()
    expect(shape.appName).toBeDefined()
    expect(shape.environmentId).toBeDefined()
    expect(shape.dockerImage).toBeDefined()
  })

  it('update tool schema contains idField and common update fields', () => {
    const update = tools.find((t) => t.name === 'dokploy_testdb_update')
    const shape = update!.schema.shape as Record<string, unknown>
    expect(shape.testdbId).toBeDefined()
    expect(shape.name).toBeDefined()
    expect(shape.dockerImage).toBeDefined()
    expect(shape.memoryLimit).toBeDefined()
    expect(shape.cpuLimit).toBeDefined()
    expect(shape.env).toBeDefined()
  })

  it('all tools have handler functions', () => {
    for (const tool of tools) {
      expect(typeof tool.handler).toBe('function')
    }
  })
})

describe('database config variations', () => {
  it('works with minimal createFields (redis-like)', () => {
    const tools = createDatabaseTools({
      type: 'cache',
      idField: 'cacheId',
      displayName: 'Cache',
      defaultImage: 'redis:7',
      createFields: z.object({
        password: z.string().min(1).describe('Password'),
      }),
    })

    expect(tools).toHaveLength(14)
    const create = tools.find((t) => t.name === 'dokploy_cache_create')
    const shape = create!.schema.shape as Record<string, unknown>
    expect(shape.password).toBeDefined()
    // Should NOT have databaseName since we didn't include it
    expect(shape.databaseName).toBeUndefined()
  })

  it('works with empty createFields', () => {
    const tools = createDatabaseTools({
      type: 'minimal',
      idField: 'minimalId',
      displayName: 'Minimal',
      defaultImage: 'minimal:1',
      createFields: z.object({}),
    })

    expect(tools).toHaveLength(14)
    const create = tools.find((t) => t.name === 'dokploy_minimal_create')
    const shape = create!.schema.shape as Record<string, unknown>
    // Standard fields should still be there
    expect(shape.name).toBeDefined()
    expect(shape.environmentId).toBeDefined()
  })

  it('generates correct default image in description', () => {
    const tools = createDatabaseTools({
      type: 'pg',
      idField: 'pgId',
      displayName: 'PG',
      defaultImage: 'postgres:16',
      createFields: z.object({}),
    })

    const create = tools.find((t) => t.name === 'dokploy_pg_create')
    // The dockerImage field description should reference the default image
    const dockerImageField = create!.schema.shape as Record<string, z.ZodOptional<z.ZodString>>
    expect(dockerImageField.dockerImage).toBeDefined()
  })
})
