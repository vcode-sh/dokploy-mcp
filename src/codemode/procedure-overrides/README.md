# Procedure Overrides Module

This folder contains the internal override implementation behind
[src/codemode/overrides/procedure-overrides.ts](../overrides/procedure-overrides.ts).

Design rules:

- the facade file keeps the public export surface stable
- logic is split by behavior domain: shaping, secrets, logs, and registry assembly
- changes must preserve gateway-facing contracts

Structure:

- `types.ts`: internal override types
- `shared.ts`: shared helpers used across override domains
- `application-one.ts`: shaping and validation for `application.one`
- `secrets.ts`: redaction helpers and `includeSecrets` gating
- `logs.ts`: log input clamping, shaping, and log secret redaction
- `registry.ts`: final override registry assembly
