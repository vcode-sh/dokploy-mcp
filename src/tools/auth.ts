import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const createAdmin = postTool({
  name: "auth-createAdmin",
  description: "Create the initial admin account for Dokploy.",
  schema: z.object({
    email: z.string().email().describe("Email address for the admin account"),
    password: z
      .string()
      .min(8)
      .describe("Password for the admin account (min 8 characters)"),
  }),
  endpoint: "/auth.createAdmin",
});

const createUser = postTool({
  name: "auth-createUser",
  description:
    "Create a new user account from an invitation token and password.",
  schema: z.object({
    password: z
      .string()
      .min(8)
      .describe("Password for the new user (min 8 characters)"),
    id: z.string().min(1).describe("The invitation or user ID"),
    token: z.string().min(1).describe("The invitation token"),
  }),
  endpoint: "/auth.createUser",
});

const login = postTool({
  name: "auth-login",
  description: "Log in to Dokploy with email and password.",
  schema: z.object({
    email: z.string().email().describe("Email address of the account"),
    password: z.string().min(8).describe("Account password (min 8 characters)"),
  }),
  endpoint: "/auth.login",
});

const get = getTool({
  name: "auth-get",
  description: "Get the currently authenticated user's information.",
  schema: z.object({}),
  endpoint: "/auth.get",
});

const logout = postTool({
  name: "auth-logout",
  description: "Log out the current user session.",
  schema: z.object({}),
  endpoint: "/auth.logout",
});

const update = postTool({
  name: "auth-update",
  description: "Update the current user's profile information.",
  schema: z.object({
    email: z
      .string()
      .email()
      .nullable()
      .describe("New email address, or null to clear"),
    password: z
      .string()
      .nullable()
      .describe("New password, or null to keep current"),
    id: z.string().min(1).optional().describe("The auth ID to update"),
    rol: z
      .enum(["admin", "user"])
      .optional()
      .describe("Role to assign: admin or user"),
    image: z.string().optional().describe("Profile image URL"),
    is2FAEnabled: z
      .boolean()
      .optional()
      .describe("Whether two-factor authentication is enabled"),
  }),
  endpoint: "/auth.update",
});

const generateToken = postTool({
  name: "auth-generateToken",
  description: "Generate a new API token for the current user.",
  schema: z.object({}),
  endpoint: "/auth.generateToken",
});

const one = getTool({
  name: "auth-one",
  description: "Get a specific user's auth information by ID.",
  schema: z.object({
    id: z.string().min(1).describe("The auth ID of the user to retrieve"),
  }),
  endpoint: "/auth.one",
});

const updateByAdmin = postTool({
  name: "auth-updateByAdmin",
  description: "Update a user's profile information as an admin.",
  schema: z.object({
    id: z.string().min(1).describe("The auth ID of the user to update"),
    email: z
      .string()
      .email()
      .nullable()
      .describe("New email address, or null to clear"),
    password: z
      .string()
      .nullable()
      .describe("New password, or null to keep current"),
    rol: z
      .enum(["admin", "user"])
      .optional()
      .describe("Role to assign: admin or user"),
    image: z.string().optional().describe("Profile image URL"),
    is2FAEnabled: z
      .boolean()
      .optional()
      .describe("Whether two-factor authentication is enabled"),
  }),
  endpoint: "/auth.updateByAdmin",
});

const generate2FASecret = getTool({
  name: "auth-generate2FASecret",
  description:
    "Generate a new 2FA secret for the current user to set up an authenticator app.",
  schema: z.object({}),
  endpoint: "/auth.generate2FASecret",
});

const verify2FASetup = postTool({
  name: "auth-verify2FASetup",
  description:
    "Verify and complete the 2FA setup by providing a PIN from the authenticator app.",
  schema: z.object({
    pin: z
      .string()
      .min(6)
      .describe("The 6-digit PIN from the authenticator app"),
    secret: z.string().min(1).describe("The 2FA secret to verify against"),
  }),
  endpoint: "/auth.verify2FASetup",
});

const verifyLogin2FA = postTool({
  name: "auth-verifyLogin2FA",
  description:
    "Verify a 2FA PIN during login to complete the authentication process.",
  schema: z.object({
    pin: z
      .string()
      .min(6)
      .describe("The 6-digit PIN from the authenticator app"),
    id: z.string().min(1).describe("The auth ID of the user logging in"),
  }),
  endpoint: "/auth.verifyLogin2FA",
});

const disable2FA = postTool({
  name: "auth-disable2FA",
  description:
    "Disable two-factor authentication for the current user's account.",
  schema: z.object({}),
  endpoint: "/auth.disable2FA",
});

const verifyToken = postTool({
  name: "auth-verifyToken",
  description: "Verify the validity of the current authentication token.",
  schema: z.object({}),
  endpoint: "/auth.verifyToken",
});

// ── export ───────────────────────────────────────────────────────────
export const authTools: ToolDefinition[] = [
  createAdmin,
  createUser,
  login,
  get,
  logout,
  update,
  generateToken,
  one,
  updateByAdmin,
  generate2FASecret,
  verify2FASetup,
  verifyLogin2FA,
  disable2FA,
  verifyToken,
];
