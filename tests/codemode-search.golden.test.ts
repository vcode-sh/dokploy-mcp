import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { searchTool } from '../src/codemode/tools/search.js'

function readFixture(relativePath: string) {
  return trimFixtureCode(
    readFileSync(resolve('tests/codemode/fixtures/search', relativePath), 'utf8'),
  )
}

function trimFixtureCode(value: string) {
  return value.trim().replace(/^;/, '')
}

describe('codemode search golden', () => {
  it('finds application update procedures', async () => {
    const result = await searchTool.handler({
      code: readFixture('find-application-update.js'),
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(['application.update', 'application.updateTraefikConfig'])
  })

  it('finds notification procedures', async () => {
    const result = await searchTool.handler({
      code: readFixture('find-notification-endpoints.js'),
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(Array.isArray(payload.result)).toBe(true)
    expect(payload.result as string[]).toContain('notification.all')
    expect(payload.result as string[]).toContain('notification.createSlack')
  })

  it('finds ssh and certificate reads by private key hints', async () => {
    const result = await searchTool.handler({
      code: 'catalog.searchText("private key").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(
      expect.arrayContaining([
        'sshKey.one',
        'sshKey.all',
        'sshKey.generate',
        'server.withSSHKey',
        'certificates.one',
      ]),
    )
  })

  it('finds notification reads by smtp password hints', async () => {
    const result = await searchTool.handler({
      code: 'catalog.searchText("smtp password").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['notification.one', 'notification.all']))
  })

  it('finds permission-scoped project reads by picker hints', async () => {
    const result = await searchTool.handler({
      code: 'catalog.searchText("permission-scoped project").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['project.allForPermissions']))
  })

  it('finds compose read procedures', async () => {
    const result = await searchTool.handler({
      code: readFixture('find-compose-read-paths.js'),
    })

    const payload = result.structuredContent as { result?: unknown }
    expect([...(payload.result as string[])].sort()).toEqual(
      [
        'compose.one',
        'compose.getDefaultCommand',
        'compose.templates',
        'compose.search',
        'compose.loadServices',
        'compose.loadMountsByService',
        'compose.getConvertedCompose',
        'compose.getTags',
        'compose.readLogs',
      ].sort(),
    )
  })

  it('finds all endpoints that take environmentId', async () => {
    const result = await searchTool.handler({
      code: readFixture('find-environment-id.js'),
    })

    const payload = result.structuredContent as { result?: unknown }
    expect((payload.result as string[]).sort()).toEqual(
      [
        'ai.deploy',
        'application.create',
        'application.move',
        'application.search',
        'application.update',
        'compose.create',
        'compose.deployTemplate',
        'compose.move',
        'compose.search',
        'compose.update',
        'environment.duplicate',
        'environment.one',
        'environment.remove',
        'environment.update',
        'libsql.create',
        'libsql.move',
        'libsql.update',
        'mariadb.create',
        'mariadb.move',
        'mariadb.search',
        'mariadb.update',
        'mongo.create',
        'mongo.move',
        'mongo.search',
        'mongo.update',
        'mysql.create',
        'mysql.move',
        'mysql.search',
        'mysql.update',
        'postgres.create',
        'postgres.move',
        'postgres.search',
        'postgres.update',
        'project.duplicate',
        'redis.create',
        'redis.move',
        'redis.search',
        'redis.update',
      ].sort(),
    )
  })

  it('finds notification test connection procedures', async () => {
    const result = await searchTool.handler({
      code: readFixture('find-notification-test-connections.js'),
    })

    const payload = result.structuredContent as { result?: unknown }
    expect((payload.result as string[]).sort()).toEqual(
      [
        'notification.testCustomConnection',
        'notification.testDiscordConnection',
        'notification.testEmailConnection',
        'notification.testGotifyConnection',
        'notification.testLarkConnection',
        'notification.testMattermostConnection',
        'notification.testNtfyConnection',
        'notification.testPushoverConnection',
        'notification.testResendConnection',
        'notification.testSlackConnection',
        'notification.testTeamsConnection',
        'notification.testTelegramConnection',
      ].sort(),
    )
  })

  it('finds all application mutation procedures', async () => {
    const result = await searchTool.handler({
      code: readFixture('find-application-mutations.js'),
    })

    const payload = result.structuredContent as { result?: unknown }
    expect((payload.result as string[]).sort()).toEqual(
      [
        'application.cancelDeployment',
        'application.cleanQueues',
        'application.clearDeployments',
        'application.create',
        'application.delete',
        'application.deploy',
        'application.disconnectGitProvider',
        'application.dropDeployment',
        'application.killBuild',
        'application.markRunning',
        'application.move',
        'application.redeploy',
        'application.refreshToken',
        'application.reload',
        'application.saveBitbucketProvider',
        'application.saveBuildType',
        'application.saveDockerProvider',
        'application.saveEnvironment',
        'application.saveGitProvider',
        'application.saveGiteaProvider',
        'application.saveGithubProvider',
        'application.saveGitlabProvider',
        'application.start',
        'application.stop',
        'application.update',
        'application.updateTraefikConfig',
      ].sort(),
    )
  })
})
