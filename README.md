# OBSIDIAN IDE

A modern integrated development environment for the OBSIDIAN programming language, featuring AI-powered chat assistance and a sleek dark theme.

## Features

- **OBSIDIAN Language Interpreter**: Built-in lexer, parser, and evaluator for the OBSIDIAN language
- **AI Chat Assistant**: Streaming chat with GPT-5.2 for coding help
- **File Management**: Create, edit, and manage multiple OBSIDIAN files
- **Code Execution**: Run OBSIDIAN code directly in the browser
- **Export Functionality**: Download your code files
- **User Authentication**: Secure login and registration system
- **Production Ready**: Docker deployment, CI/CD, monitoring

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT
- **AI**: OpenAI API
- **Deployment**: Docker, PM2

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- pnpm

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values
3. Install dependencies: `pnpm install`
4. Set up database: Run migrations (if any)
5. Start development: `pnpm dev`

### Development

```bash
# Install dependencies
pnpm install

# Start API server
pnpm --filter @workspace/api-server run dev

# Start IDE
pnpm --filter @workspace/obsidian-ide run dev

# Run tests
pnpm test
```

### Production Deployment

```bash
# Using Docker
docker-compose up --build

# Or using PM2
pnpm add -g pm2
pm2 start ecosystem.config.js
```

## Usage

1. Register/Login to access the IDE
2. Use the Editor to write OBSIDIAN code
3. Run code with the Play button
4. Chat with the AI assistant for help
5. Export your files when ready

## OBSIDIAN Language

OBSIDIAN is a custom programming language with Rust-like syntax:

```obsidian
fn main() {
    let x = 42;
    print(x);
}
```

## API

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Chat

- `POST /api/chat` - Send chat message (requires auth)

### Health

- `GET /api/healthz` - Health check

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a PR

## License

MIT
