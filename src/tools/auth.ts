import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const createAdmin = postTool({
  name: 'dokploy_auth_create_admin',
  title: 'Create Admin Account',
  description:
    'Create the initial admin account for a fresh Dokploy installation. Requires an email address and a password (minimum 8 characters). This should only be called once during initial setup. Returns the created admin account details.',
  schema: z.object({
    email: z.string().email().describe('Email address for the admin account'),
    password: z.string().min(8).describe('Password for the admin account (min 8 characters)'),
  }),
  endpoint: '/auth.createAdmin',
})

const createUser = postTool({
  name: 'dokploy_auth_create_user',
  title: 'Create User Account',
  description:
    'Create a new user account from an invitation token and password. The user must have received an invitation email containing a token and ID. Requires the invitation token, user/invitation ID, and a password (minimum 8 characters). Returns the created user account details.',
  schema: z.object({
    password: z.string().min(8).describe('Password for the new user (min 8 characters)'),
    id: z.string().min(1).describe('The invitation or user ID'),
    token: z.string().min(1).describe('The invitation token'),
  }),
  endpoint: '/auth.createUser',
})

const login = postTool({
  name: 'dokploy_auth_login',
  title: 'Login',
  description:
    'Log in to Dokploy with an email address and password. If the account has two-factor authentication enabled, a subsequent call to verify_login_2fa will be required. Returns a session token or a 2FA challenge depending on account configuration.',
  schema: z.object({
    email: z.string().email().describe('Email address of the account'),
    password: z.string().min(8).describe('Account password (min 8 characters)'),
  }),
  endpoint: '/auth.login',
})

const get = getTool({
  name: 'dokploy_auth_get',
  title: 'Get Current User',
  description:
    "Get the currently authenticated user's profile information. No parameters required. Returns the user's email, role, 2FA status, and other profile fields associated with the active session.",
  schema: z.object({}),
  endpoint: '/auth.get',
})

const logout = postTool({
  name: 'dokploy_auth_logout',
  title: 'Logout',
  description:
    'Log out the current user session and invalidate the active authentication token. No parameters required. Returns a confirmation that the session has been terminated.',
  schema: z.object({}),
  endpoint: '/auth.logout',
})

const update = postTool({
  name: 'dokploy_auth_update',
  title: 'Update Current User',
  description:
    "Update the currently authenticated user's profile information. Accepts optional fields including email, password, role, profile image URL, and 2FA enabled status. Fields set to null will be cleared. Returns the updated user profile.",
  schema: z.object({
    email: z.string().email().nullable().describe('New email address, or null to clear'),
    password: z.string().nullable().describe('New password, or null to keep current'),
    id: z.string().min(1).optional().describe('The auth ID to update'),
    rol: z.enum(['admin', 'user']).optional().describe('Role to assign: admin or user'),
    image: z.string().optional().describe('Profile image URL'),
    is2FAEnabled: z.boolean().optional().describe('Whether two-factor authentication is enabled'),
  }),
  endpoint: '/auth.update',
})

const generateToken = postTool({
  name: 'dokploy_auth_generate_token',
  title: 'Generate API Token',
  description:
    'Generate a new API token for the currently authenticated user. The token can be used for programmatic API access via the x-api-key header. No parameters required. Returns the generated token string.',
  schema: z.object({}),
  endpoint: '/auth.generateToken',
})

const one = getTool({
  name: 'dokploy_auth_one',
  title: 'Get User Auth Info',
  description:
    "Get a specific user's authentication information by their auth ID. Requires the auth ID of the target user. Returns the user's email, role, 2FA status, and other auth-related fields.",
  schema: z.object({
    id: z.string().min(1).describe('The auth ID of the user to retrieve'),
  }),
  endpoint: '/auth.one',
})

const updateByAdmin = postTool({
  name: 'dokploy_auth_update_by_admin',
  title: 'Update User as Admin',
  description:
    "Update any user's profile information with admin privileges. Requires the target user's auth ID and accepts fields including email, password, role, profile image URL, and 2FA enabled status. Fields set to null will be cleared. Returns the updated user profile.",
  schema: z.object({
    id: z.string().min(1).describe('The auth ID of the user to update'),
    email: z.string().email().nullable().describe('New email address, or null to clear'),
    password: z.string().nullable().describe('New password, or null to keep current'),
    rol: z.enum(['admin', 'user']).optional().describe('Role to assign: admin or user'),
    image: z.string().optional().describe('Profile image URL'),
    is2FAEnabled: z.boolean().optional().describe('Whether two-factor authentication is enabled'),
  }),
  endpoint: '/auth.updateByAdmin',
})

const generate2FASecret = getTool({
  name: 'dokploy_auth_generate_2fa_secret',
  title: 'Generate 2FA Secret',
  description:
    'Generate a new two-factor authentication secret for the current user. This is the first step in setting up 2FA with an authenticator app. No parameters required. Returns the secret key and a QR code URL that can be scanned by an authenticator app.',
  schema: z.object({}),
  endpoint: '/auth.generate2FASecret',
})

const verify2FASetup = postTool({
  name: 'dokploy_auth_verify_2fa_setup',
  title: 'Verify 2FA Setup',
  description:
    'Verify and complete the two-factor authentication setup by providing a PIN from the authenticator app. Requires the 6-digit PIN and the 2FA secret that was generated during setup. Returns a confirmation that 2FA has been successfully enabled on the account.',
  schema: z.object({
    pin: z.string().min(6).describe('The 6-digit PIN from the authenticator app'),
    secret: z.string().min(1).describe('The 2FA secret to verify against'),
  }),
  endpoint: '/auth.verify2FASetup',
})

const verifyLogin2FA = postTool({
  name: 'dokploy_auth_verify_login_2fa',
  title: 'Verify 2FA Login',
  description:
    'Verify a two-factor authentication PIN during the login process. This is called after a successful login attempt on an account with 2FA enabled. Requires the 6-digit PIN from the authenticator app and the auth ID of the user. Returns the authenticated session token.',
  schema: z.object({
    pin: z.string().min(6).describe('The 6-digit PIN from the authenticator app'),
    id: z.string().min(1).describe('The auth ID of the user logging in'),
  }),
  endpoint: '/auth.verifyLogin2FA',
})

const disable2FA = postTool({
  name: 'dokploy_auth_disable_2fa',
  title: 'Disable 2FA',
  description:
    "Disable two-factor authentication for the currently authenticated user's account. No parameters required. Returns a confirmation that 2FA has been removed from the account. Future logins will no longer require a 2FA PIN.",
  schema: z.object({}),
  endpoint: '/auth.disable2FA',
})

const verifyToken = postTool({
  name: 'dokploy_auth_verify_token',
  title: 'Verify Auth Token',
  description:
    'Verify the validity of the current authentication token. No parameters required. Returns whether the token is valid and has not expired. Useful for checking if a session is still active before making other API calls.',
  schema: z.object({}),
  endpoint: '/auth.verifyToken',
})

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
]
