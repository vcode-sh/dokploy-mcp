import { z } from "zod";
import { type ToolDefinition, getTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: "user-all",
  description: "List all users registered in Dokploy.",
  schema: z.object({}),
  endpoint: "/user.all",
});

const byAuthId = getTool({
  name: "user-byAuthId",
  description: "Get a user by their auth ID.",
  schema: z.object({
    authId: z.string().min(1).describe("The auth ID of the user to retrieve"),
  }),
  endpoint: "/user.byAuthId",
});

const byUserId = getTool({
  name: "user-byUserId",
  description: "Get a user by their user ID.",
  schema: z.object({
    userId: z.string().min(1).describe("The user ID of the user to retrieve"),
  }),
  endpoint: "/user.byUserId",
});

// ── export ───────────────────────────────────────────────────────────
export const userTools: ToolDefinition[] = [all, byAuthId, byUserId];
