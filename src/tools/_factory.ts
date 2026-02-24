import { z, ZodObject, ZodRawShape } from "zod";
import { api, ApiError } from "../api/client.js";

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: ZodObject<any>;
  annotations: ToolAnnotations;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (input: any) => Promise<{
    content: { type: "text"; text: string }[];
    isError?: boolean;
  }>;
}

function success(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function error(message: string, details?: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { error: message, ...(details ? { details } : {}) },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}

function mapApiError(err: ApiError) {
  switch (err.status) {
    case 401:
      return error(
        "Authentication failed",
        "Check your DOKPLOY_API_KEY environment variable."
      );
    case 403:
      return error(
        "Permission denied",
        "Your API key lacks permission for this operation."
      );
    case 404:
      return error("Resource not found", err.message);
    case 422:
      return error(
        "Validation error",
        typeof err.body === "object" && err.body !== null
          ? JSON.stringify(err.body)
          : err.message
      );
    default:
      return error(`Dokploy API error (${err.status})`, err.message);
  }
}

export function createTool<TShape extends ZodRawShape>(def: {
  name: string;
  description: string;
  schema: ZodObject<TShape>;
  annotations: ToolAnnotations;
  handler: (params: {
    input: z.infer<ZodObject<TShape>>;
    api: typeof api;
  }) => Promise<unknown>;
}): ToolDefinition {
  return {
    name: def.name,
    description: def.description,
    schema: def.schema,
    annotations: { openWorldHint: true, ...def.annotations },
    handler: async (input) => {
      try {
        const result = await def.handler({ input, api });
        return success(result);
      } catch (err) {
        if (err instanceof ApiError) return mapApiError(err);
        return error(
          `Failed to execute ${def.name}`,
          err instanceof Error ? err.message : "Unknown error"
        );
      }
    },
  };
}

export function postTool<TShape extends ZodRawShape>(opts: {
  name: string;
  description: string;
  schema: ZodObject<TShape>;
  endpoint: string;
  annotations?: Partial<ToolAnnotations>;
}): ToolDefinition {
  return createTool({
    name: opts.name,
    description: opts.description,
    schema: opts.schema,
    annotations: { openWorldHint: true, ...opts.annotations },
    handler: async ({ input, api }) => api.post(opts.endpoint, input),
  });
}

export function getTool<TShape extends ZodRawShape>(opts: {
  name: string;
  description: string;
  schema: ZodObject<TShape>;
  endpoint: string;
  annotations?: Partial<ToolAnnotations>;
}): ToolDefinition {
  return createTool({
    name: opts.name,
    description: opts.description,
    schema: opts.schema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
      ...opts.annotations,
    },
    handler: async ({ input, api }) => {
      const params: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params[k] = v;
      }
      return api.get(
        opts.endpoint,
        Object.keys(params).length > 0 ? params : undefined
      );
    },
  });
}
