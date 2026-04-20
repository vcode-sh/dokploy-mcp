# Code Mode Context Module

This folder contains the execution and search contexts used by Code Mode.

Design rules:

- `execute-context.ts` remains the stable facade for runtime and types
- `search-context.ts` remains the public implementation for search catalog access
- runtime construction and type declarations are split only to keep the files readable, not to change behavior

Structure:

- `execute-context.ts`: stable facade re-exporting types and runtime assembly
- `execute-context-types.ts`: public execute context types and helper contracts
- `execute-context-runtime.ts`: runtime construction, helper wiring, and call budgeting
- `search-context.ts`: catalog search view and search-time indexes
