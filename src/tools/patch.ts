import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const entityTypeSchema = z.enum(['application', 'compose']).describe('Entity type')
const patchTypeSchema = z.enum(['create', 'update', 'delete']).describe('Patch type')
const savePatchTypeSchema = z.enum(['create', 'update']).default('update').describe('Patch type')

const nullableString = z.string().nullable().optional()

const create = postTool({
  name: 'dokploy_patch_create',
  title: 'Create Patch',
  description:
    'Create a new patch record in Dokploy. Requires the file path and file content. Optionally associate the patch with an application or compose service.',
  schema: z
    .object({
      filePath: z.string().min(1).describe('File path inside the repository'),
      content: z.string().describe('File content'),
      type: patchTypeSchema.optional(),
      enabled: z.boolean().optional().describe('Whether the patch is enabled'),
      applicationId: nullableString.describe('Application ID'),
      composeId: nullableString.describe('Compose ID'),
    })
    .strict(),
  endpoint: '/patch.create',
})

const one = getTool({
  name: 'dokploy_patch_one',
  title: 'Get Patch',
  description: 'Retrieve a patch record by its ID.',
  schema: z
    .object({
      patchId: z.string().min(1).describe('Patch ID'),
    })
    .strict(),
  endpoint: '/patch.one',
})

const byEntityId = getTool({
  name: 'dokploy_patch_by_entity_id',
  title: 'List Patches by Entity',
  description:
    'List patches associated with a Dokploy application or compose service. Requires the entity ID and entity type.',
  schema: z
    .object({
      id: z.string().describe('Entity ID'),
      type: entityTypeSchema,
    })
    .strict(),
  endpoint: '/patch.byEntityId',
})

const update = postTool({
  name: 'dokploy_patch_update',
  title: 'Update Patch',
  description:
    'Update an existing patch record in Dokploy. Requires the patch ID and optionally accepts updated type, file path, content, enablement state, and timestamps.',
  schema: z
    .object({
      patchId: z.string().min(1).describe('Patch ID'),
      type: patchTypeSchema.optional(),
      filePath: z.string().min(1).optional().describe('File path inside the repository'),
      enabled: z.boolean().optional().describe('Whether the patch is enabled'),
      content: z.string().optional().describe('File content'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: nullableString.describe('Update timestamp'),
    })
    .strict(),
  endpoint: '/patch.update',
})

const remove = postTool({
  name: 'dokploy_patch_delete',
  title: 'Delete Patch',
  description:
    'Delete a patch record from Dokploy. Requires the patch ID. This is a destructive action.',
  schema: z
    .object({
      patchId: z.string().min(1).describe('Patch ID'),
    })
    .strict(),
  endpoint: '/patch.delete',
  annotations: { destructiveHint: true },
})

const toggleEnabled = postTool({
  name: 'dokploy_patch_toggle_enabled',
  title: 'Toggle Patch',
  description:
    'Enable or disable a patch record in Dokploy. Requires the patch ID and the desired enabled state.',
  schema: z
    .object({
      patchId: z.string().min(1).describe('Patch ID'),
      enabled: z.boolean().describe('Whether the patch should be enabled'),
    })
    .strict(),
  endpoint: '/patch.toggleEnabled',
})

const ensureRepo = postTool({
  name: 'dokploy_patch_ensure_repo',
  title: 'Ensure Patch Repository',
  description:
    'Ensure that the local patch repository exists for a Dokploy application or compose service. Requires the entity ID and entity type.',
  schema: z
    .object({
      id: z.string().describe('Entity ID'),
      type: entityTypeSchema,
    })
    .strict(),
  endpoint: '/patch.ensureRepo',
})

const readRepoDirectories = getTool({
  name: 'dokploy_patch_read_repo_directories',
  title: 'Read Patch Repository Directories',
  description:
    'Read directory entries inside a patch repository. Requires the entity ID, entity type, and repository path.',
  schema: z
    .object({
      id: z.string().min(1).describe('Entity ID'),
      type: entityTypeSchema,
      repoPath: z.string().describe('Repository path'),
    })
    .strict(),
  endpoint: '/patch.readRepoDirectories',
})

const readRepoFile = getTool({
  name: 'dokploy_patch_read_repo_file',
  title: 'Read Patch Repository File',
  description:
    'Read a file from a patch repository. Requires the entity ID, entity type, and file path.',
  schema: z
    .object({
      id: z.string().min(1).describe('Entity ID'),
      type: entityTypeSchema,
      filePath: z.string().describe('File path'),
    })
    .strict(),
  endpoint: '/patch.readRepoFile',
})

const saveFileAsPatch = postTool({
  name: 'dokploy_patch_save_file_as_patch',
  title: 'Save File as Patch',
  description:
    'Create or update a patch record from file content. Requires the entity ID, entity type, file path, and content.',
  schema: z
    .object({
      id: z.string().min(1).describe('Entity ID'),
      type: entityTypeSchema,
      filePath: z.string().describe('File path'),
      content: z.string().describe('File content'),
      patchType: savePatchTypeSchema.optional(),
    })
    .strict(),
  endpoint: '/patch.saveFileAsPatch',
})

const markFileForDeletion = postTool({
  name: 'dokploy_patch_mark_file_for_deletion',
  title: 'Mark File for Deletion',
  description:
    'Mark a file for deletion through the Dokploy patch workflow. Requires the entity ID, entity type, and file path.',
  schema: z
    .object({
      id: z.string().min(1).describe('Entity ID'),
      type: entityTypeSchema,
      filePath: z.string().describe('File path'),
    })
    .strict(),
  endpoint: '/patch.markFileForDeletion',
  annotations: { destructiveHint: true },
})

const cleanPatchRepos = postTool({
  name: 'dokploy_patch_clean_patch_repos',
  title: 'Clean Patch Repositories',
  description:
    'Clean Dokploy patch repositories. Optionally scope the cleanup to a specific server.',
  schema: z
    .object({
      serverId: z.string().optional().describe('Optional server ID'),
    })
    .strict(),
  endpoint: '/patch.cleanPatchRepos',
  annotations: { destructiveHint: true },
})

export const patchTools: ToolDefinition[] = [
  create,
  one,
  byEntityId,
  update,
  remove,
  toggleEnabled,
  ensureRepo,
  readRepoDirectories,
  readRepoFile,
  saveFileAsPatch,
  markFileForDeletion,
  cleanPatchRepos,
]
