import { getStringOrNull, isRecord } from '../../codemode/virtual-procedures/shared.js'

import { buildDokployResourceUri } from './shared.js'

const MAX_RESOURCE_LINKS = 24
const MAX_SCAN_DEPTH = 6
const MAX_SCANNED_VALUES = 200

type ResourceLinkKind = 'project' | 'application' | 'deployment' | 'server'
type ResourceLinkView = 'overview' | 'infrastructure' | 'logs-overview' | 'summary'

export interface ResourceLink {
  uri: string
  title: string
  kind: ResourceLinkKind
  id: string
  view: ResourceLinkView
}

function getId(value: Record<string, unknown>, key: string) {
  const id = getStringOrNull(value[key])
  return id && id.trim().length > 0 ? id : null
}

function addResourceLink(
  links: Map<string, ResourceLink>,
  kind: ResourceLinkKind,
  id: string,
  view: ResourceLinkView,
  title: string,
) {
  if (links.size >= MAX_RESOURCE_LINKS) {
    return
  }

  const uri = buildDokployResourceUri(kind, id, view)
  if (links.has(uri)) {
    return
  }

  links.set(uri, {
    uri,
    title,
    kind,
    id,
    view,
  })
}

function shouldStopScan(links: Map<string, ResourceLink>, depth: number) {
  return links.size >= MAX_RESOURCE_LINKS || depth > MAX_SCAN_DEPTH
}

function markVisited(value: object, visited: WeakSet<object>, state: { scannedValues: number }) {
  if (visited.has(value)) {
    return false
  }

  visited.add(value)
  state.scannedValues += 1
  return state.scannedValues <= MAX_SCANNED_VALUES
}

function addRecordResourceLinks(links: Map<string, ResourceLink>, value: Record<string, unknown>) {
  const projectId = getId(value, 'projectId')
  if (projectId) {
    addResourceLink(links, 'project', projectId, 'overview', 'Project Overview')
    addResourceLink(links, 'project', projectId, 'infrastructure', 'Project Infrastructure')
    addResourceLink(links, 'project', projectId, 'logs-overview', 'Project Logs Overview')
  }

  const applicationId = getId(value, 'applicationId')
  if (applicationId) {
    addResourceLink(links, 'application', applicationId, 'summary', 'Application Summary')
  }

  const deploymentId = getId(value, 'deploymentId')
  if (deploymentId) {
    addResourceLink(links, 'deployment', deploymentId, 'summary', 'Deployment Summary')
  }

  const serverId = getId(value, 'serverId')
  if (serverId) {
    addResourceLink(links, 'server', serverId, 'summary', 'Server Summary')
  }
}

function collectArrayResourceLinks(
  value: unknown[],
  links: Map<string, ResourceLink>,
  visited: WeakSet<object>,
  state: { scannedValues: number },
  depth: number,
) {
  if (!markVisited(value, visited, state)) {
    return
  }

  for (const entry of value) {
    collectResourceLinks(entry, links, visited, state, depth + 1)
    if (links.size >= MAX_RESOURCE_LINKS) {
      return
    }
  }
}

function collectRecordResourceLinks(
  value: Record<string, unknown>,
  links: Map<string, ResourceLink>,
  visited: WeakSet<object>,
  state: { scannedValues: number },
  depth: number,
) {
  if (!markVisited(value, visited, state)) {
    return
  }

  addRecordResourceLinks(links, value)

  for (const entry of Object.values(value)) {
    collectResourceLinks(entry, links, visited, state, depth + 1)
    if (links.size >= MAX_RESOURCE_LINKS) {
      return
    }
  }
}

function collectResourceLinks(
  value: unknown,
  links: Map<string, ResourceLink>,
  visited: WeakSet<object>,
  state: { scannedValues: number },
  depth = 0,
) {
  if (shouldStopScan(links, depth)) {
    return
  }

  if (Array.isArray(value)) {
    collectArrayResourceLinks(value, links, visited, state, depth)
    return
  }

  if (!isRecord(value)) {
    return
  }

  collectRecordResourceLinks(value, links, visited, state, depth)
}

export function listResourceLinks(value: unknown): ResourceLink[] {
  const links = new Map<string, ResourceLink>()

  collectResourceLinks(value, links, new WeakSet<object>(), { scannedValues: 0 })

  return [...links.values()]
}
