# Virtual Procedures Module

This folder contains the internal implementation behind
[src/codemode/overrides/virtual-procedures.ts](../overrides/virtual-procedures.ts).

Design rules:

- the facade file keeps the public virtual-procedure API stable
- implementations are grouped by workflow domain
- helper names, validation semantics, and execute call budgeting must remain stable unless intentionally changed

Structure:

- `types.ts`: shared virtual-procedure types
- `shared.ts`: shared validation and data-shaping helpers
- `batch.ts`: batch-style helpers such as `application.many`, `server.many`, `logs.tailMany`, and `libsql.many`
- `project.ts`: project-oriented helpers such as `project.overview` and `project.infrastructureOverview`
- `tag.ts`: tag-oriented helpers such as `tag.bulkAssignPreview`
- `index.ts`: assembled registry and exported facade helpers
