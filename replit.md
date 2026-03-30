# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (OBSIDIAN IDE)
- **AI**: OpenAI (gpt-5.2) via Replit AI Integrations proxy

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (chat endpoint)
│   ├── obsidian-ide/       # React+Vite OBSIDIAN IDE frontend
│   └── mockup-sandbox/     # Component preview server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations/       # AI integration libraries
│       └── openai-ai-server/ # OpenAI integration for server-side
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## OBSIDIAN IDE Application

The main application is an AI-powered coding environment for a custom language called OBSIDIAN.

### Features
- **AI Chat Panel** (left) — SSE streaming chat with GPT-5.2 that speaks OBSIDIAN language
- **Code Editor** (right) — Overlay-based syntax highlighting with Tab/Cmd+Enter support
- **OBSIDIAN Interpreter** — Browser-side lexer → parser → tree-walking interpreter
- **Output Console** — Shows program output and errors
- **Cosmic Background** — Animated stars, nebulae, sun/moon arc, plant vines via canvas
- **Glassmorphism UI** — Semi-transparent panels with backdrop blur

### OBSIDIAN Language
Custom programming language with Rust-like syntax:
- Types: `i64`, `f64`, `bool`, `string`
- Functions: `fn name(param: Type) -> ReturnType { body }`
- Control flow: `if/else`, `while`, `return`
- Built-ins: `print`, `sqrt`, `abs`, `len`, `floor`, `ceil`, `round`, `max`, `min`, `pow`
- Pratt parser with proper operator precedence

### Key Files
- `artifacts/obsidian-ide/src/lib/obsidian/` — Lexer, parser, interpreter
- `artifacts/obsidian-ide/src/components/` — ChatPanel, CodeEditor, OutputConsole, CosmicBackground
- `artifacts/obsidian-ide/src/hooks/use-chat-stream.ts` — SSE streaming hook with proper frame buffering
- `artifacts/api-server/src/routes/chat.ts` — Chat endpoint with rate limiting and input validation

### Backend Chat Endpoint
- `POST /api/chat` — SSE streaming with GPT-5.2
- Rate limited: 20 requests per minute per IP
- Input validation: message max 4000 chars, history max 50 messages, role whitelist

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`); `src/routes/chat.ts` exposes `POST /chat` (full path: `/api/chat`)
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@workspace/integrations-openai-ai-server`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)

### `artifacts/obsidian-ide` (`@workspace/obsidian-ide`)

React + Vite frontend for the OBSIDIAN IDE. Mounted at `/` preview path.

- Uses Tailwind CSS v4 with cosmic dark theme
- Space Mono font throughout
- Custom syntax highlighting via regex tokenizer
- Browser-side OBSIDIAN interpreter (no server needed for code execution)

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
