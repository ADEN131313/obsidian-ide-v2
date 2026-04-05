# OBSIDIAN IDE v2 - Quick Reference

## Your Project is Ready at:
/Users/aden/Downloads/ob

## What's Been Built
- Modern monorepo with Turborepo
- OBSIDIAN language parser & lexer
- AI agent with tool calling
- Fastify API server
- React + Monaco Editor IDE
- Vercel & Netlify configs
- GitHub Actions workflows

## Deploy Now

### Vercel (Easiest)
```bash
cd /Users/aden/Downloads/ob/apps/web
npx vercel@latest deploy --prod
```

### GitHub Pages (Free)
1. Go to https://github.com/skinnyzebra14-sudo/fluffy-couscous
2. Upload files from /Users/aden/Downloads/ob
3. Settings → Pages → GitHub Actions

### Netlify
```bash
cd /Users/aden/Downloads/ob
npx netlify-cli@latest deploy --prod --dir=apps/web/dist
```

## Environment Variables Needed
- DATABASE_URL (PostgreSQL)
- JWT_SECRET
- OPENAI_API_KEY

Full guide: /Users/aden/Downloads/ob/DEPLOY.md
