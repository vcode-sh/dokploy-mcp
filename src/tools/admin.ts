import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: "admin-one",
  description: "Get the current admin's information.",
  schema: z.object({}),
  endpoint: "/admin.one",
});

const createUserInvitation = postTool({
  name: "admin-createUserInvitation",
  description: "Create an invitation for a new user by sending them an email.",
  schema: z.object({
    email: z
      .string()
      .email()
      .describe("Email address to send the invitation to"),
  }),
  endpoint: "/admin.createUserInvitation",
});

const removeUser = postTool({
  name: "admin-removeUser",
  description:
    "Remove a user from the system. This action is irreversible.",
  schema: z.object({
    authId: z.string().min(1).describe("The auth ID of the user to remove"),
  }),
  endpoint: "/admin.removeUser",
  annotations: { destructiveHint: true },
});

const getUserByToken = getTool({
  name: "admin-getUserByToken",
  description: "Look up a user by their invitation token.",
  schema: z.object({
    token: z.string().min(1).describe("The invitation token to look up"),
  }),
  endpoint: "/admin.getUserByToken",
});

const assignPermissions = postTool({
  name: "admin-assignPermissions",
  description: "Assign granular permissions to a user.",
  schema: z.object({
    userId: z
      .string()
      .min(1)
      .describe("The user ID to assign permissions to"),
    canCreateProjects: z
      .boolean()
      .describe("Whether the user can create projects"),
    canCreateServices: z
      .boolean()
      .describe("Whether the user can create services"),
    canDeleteProjects: z
      .boolean()
      .describe("Whether the user can delete projects"),
    canDeleteServices: z
      .boolean()
      .describe("Whether the user can delete services"),
    accesedProjects: z
      .array(z.string())
      .describe("List of project IDs the user can access"),
    accesedServices: z
      .array(z.string())
      .describe("List of service IDs the user can access"),
    canAccessToTraefikFiles: z
      .boolean()
      .describe("Whether the user can access Traefik configuration files"),
    canAccessToDocker: z
      .boolean()
      .describe("Whether the user can access Docker"),
    canAccessToAPI: z
      .boolean()
      .describe("Whether the user can access the API"),
  }),
  endpoint: "/admin.assignPermissions",
});

const cleanGithubApp = postTool({
  name: "admin-cleanGithubApp",
  description: "Remove the configured GitHub App integration.",
  schema: z.object({}),
  endpoint: "/admin.cleanGithubApp",
});

const getRepositories = getTool({
  name: "admin-getRepositories",
  description:
    "List all repositories accessible through the configured GitHub App.",
  schema: z.object({}),
  endpoint: "/admin.getRepositories",
});

const getBranches = getTool({
  name: "admin-getBranches",
  description: "List branches for a specific GitHub repository.",
  schema: z.object({
    repo: z.string().min(1).describe("The repository name"),
    owner: z.string().min(1).describe("The repository owner or organization"),
  }),
  endpoint: "/admin.getBranches",
});

const haveGithubConfigured = getTool({
  name: "admin-haveGithubConfigured",
  description: "Check whether a GitHub App integration is configured.",
  schema: z.object({}),
  endpoint: "/admin.haveGithubConfigured",
});

// ── export ───────────────────────────────────────────────────────────
export const adminTools: ToolDefinition[] = [
  one,
  createUserInvitation,
  removeUser,
  getUserByToken,
  assignPermissions,
  cleanGithubApp,
  getRepositories,
  getBranches,
  haveGithubConfigured,
];
