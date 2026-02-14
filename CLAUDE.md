# Agent Guide (cross-platform-actions/action)

This repo is a TypeScript GitHub Action (Node 20 runtime) that boots a VM and
executes user-provided commands over SSH.

No Cursor rules were found in `.cursor/rules/` or `.cursorrules`.
No Copilot instructions were found in `.github/copilot-instructions.md`.

## Repo Map

- Source: `src/**/*.ts` (build output: `lib/`)
- Packaged action bundle: `dist/` (generated; do not hand-edit)
- Unit tests: `spec/**/*[sS]pec.ts` (Jasmine + ts-node)
- Entry: `src/main.ts` -> `src/action/action.ts`
- Action metadata: `action.yml`
- CI: `.github/workflows/ci.yml` (runs `npm run all`)

## Commands

Install:

```sh
npm install
```

Build / check:

```sh
npm run build         # tsc -> lib/
npm run format        # prettier write (ts only)
npm run format-check  # prettier check
npm run lint          # eslint src/**/*.ts
npm run package       # ncc -> dist/ + copy post
npm test              # jasmine
npm run all           # build + format + lint + package + test
```

### Run a single unit test

Jasmine is the test runner (`spec/support/jasmine.json`). Best options:

1) Filter by name substring:

```sh
npm test -- --filter="execWithOutput"
```

2) Run a single spec file:

```sh
npm test -- spec/utility.spec.ts
```

3) Call Jasmine directly:

```sh
./bin/node ./node_modules/jasmine/bin/jasmine.js --filter="Architecture"
```

### E2E (run the action locally)

Uses Act with workflows in `test/workflows/`:

```sh
npm run build && npm run package
act --privileged -W test/workflows
```

Optional local resources server:

```sh
./node_modules/http-server/bin/http-server test/http -a 127.0.0.1
act --privileged -W test/workflows --env CPA_RESOURCE_URL=http://host.docker.internal:8080
```

## Code Style (TypeScript)

### Formatting

Prettier (`.prettierrc.json`): printWidth 80, 2 spaces, single quotes, no semis,
trailingComma none, bracketSpacing false, arrowParens avoid.

### ESLint (selected rules)

- File names must match `^[a-z_]+$` (underscores only, no hyphens)
- No `any` (`@typescript-eslint/no-explicit-any`)
- Explicit return types required (`@typescript-eslint/explicit-function-return-type`)
- No `public` keyword (`@typescript-eslint/explicit-member-accessibility`)
- Prefer `import` over `require` (`@typescript-eslint/no-require-imports`)
- Non-null assertions allowed but discouraged (warn)

### Imports

- Prefer `import * as fs from 'fs'` / `import * as core from '@actions/core'`
- Keep the file's existing import style (namespace vs named) consistent
- Use `import type {...}` for type-only imports when helpful
- Avoid import reordering churn

### Types / strictness

`tsconfig.json` is strict and enables: `noImplicitReturns`, `noImplicitOverride`,
`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
`noPropertyAccessFromIndexSignature`.

Guidelines:

- Add explicit return types for exported functions and class methods
- Keep types narrow; avoid casts unless necessary

### Naming

- Files: lowercase + underscores (e.g. `vm_file_system_synchronizer.ts`)
- Classes: `PascalCase`; functions/vars: `camelCase`
- Enums: `PascalCase`; members may be `snake_case` in existing code

### Error handling

- Throw with `throw Error('message')` / `throw new Error('message')`
- In catches: `catch (error: unknown)` then safely extract message
  (pattern in `src/main.ts`, `src/resource_disk.ts`)
- Prefer early, actionable errors (include relevant input values)

### Logging

- Use `@actions/core`: `core.info`, `core.debug`, `core.error`
- Group logs via `core.startGroup`/`core.endGroup` or `utility.group()`
- Do not log secrets (SSH keys, tokens, full SSH config)

## Tests (Jasmine)

- Specs: `spec/**/*.spec.ts`
- Prefer descriptive `describe`/`it`
- For thrown errors: `expect(() => ...).toThrowError(/^prefix/)`
- Keep unit tests deterministic (no network/real VM dependencies)

## Generated / Ignored

- Generated: `dist/`, `lib/` (ignored by lint/format)
- Gitignored local dev: `test/http/*`, `test/workflows/ci.yml`

## Change Hygiene

- If behavior changes, update docs (`readme.md`, `action.yml`) as needed
- If release artifacts change, run `npm run package` and verify `dist/` output
