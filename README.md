# OBSIDIAN IDE v2 - Production-Grade Development Environment

A comprehensive rewrite of the OBSIDIAN IDE into a production-grade development environment with enhanced language tools, advanced AI capabilities, and professional IDE features.

## Major Improvements

### 1. Production-Ready Infrastructure
- **Modern Monorepo**: Turborepo-powered workspace with proper dependency management
- **Build System**: TypeScript project references for fast, incremental builds
- **Linting**: Biome for fast, unified linting and formatting
- **Database**: Enhanced schema with Drizzle ORM, migrations, and health checks

### 2. Enhanced OBSIDIAN Language & Tools
- **New Parser**: Recursive descent parser with error recovery and detailed diagnostics
- **New Lexer**: Full-featured tokenizer with proper error handling
- **AST Types**: Complete TypeScript type definitions for all language constructs
- **Extensible**: Plugin-ready architecture for LSP and debugger support

### 3. Advanced AI Agent
- **Tool System**: Dynamic tool registry with filesystem and code execution tools
- **MCP Protocol**: Model Context Protocol integration for AI tool calling
- **Zod Validation**: Runtime type safety for all tool parameters
- **Extensible**: Easy to add new tools for AI capabilities

### 4. Professional IDE Features
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **React 19**: Latest React with improved performance
- **Zustand**: Lightweight state management with persistence
- **React Query**: Server state management with caching
- **Resizable Panels**: Flexible layout with react-resizable-panels

## New Project Structure

```
ob/
├── apps/
│   ├── api/                    # Fastify-based API server
│   └── web/                    # React IDE frontend
├── packages/
│   ├── core/                   # OBSIDIAN language core
│   ├── agent/                  # AI agent with tool calling
│   ├── db/                     # Database layer
│   └── shared/                 # Shared utilities
└── infra/
    └── docker/                 # Docker configurations
```

## Tech Stack Upgrades

| Component | Old | New |
|-----------|-----|-----|
| Backend | Express | Fastify (better performance) |
| Frontend | React 18 | React 19 |
| State | useState | Zustand + React Query |
| Editor | Custom | Monaco Editor |
| Build | tsc | Turborepo + TypeScript refs |
| Linting | Prettier | Biome (faster, unified) |

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

### Installation
```bash
pnpm install
pnpm db:migrate
pnpm dev
```

### Available Scripts
```bash
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm typecheck        # Type-check all packages
pnpm test             # Run all tests
pnpm lint             # Run Biome linter
```

## License

MIT
