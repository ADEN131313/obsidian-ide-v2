# OBSIDIAN IDE v2 - Deployment Guide

## Project Location
/Users/aden/Downloads/ob

## Quick Deploy Commands

### GitHub Pages (Free)
```bash
cd /Users/aden/Downloads/ob
git push origin obsidian-ide
# Then enable GitHub Actions in repo settings
```

### Vercel
```bash
cd /Users/aden/Downloads/ob/apps/web
npx vercel@latest deploy --prod
```

### Netlify
```bash
cd /Users/aden/Downloads/ob
npx netlify-cli@latest deploy --prod --dir=apps/web/dist
```

## Environment Variables
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
VITE_API_URL=https://api-url
```

## Features
- Monaco Editor
- JWT Auth
- AI Chat
- OBSIDIAN Language
- File Management

Created: April 5, 2026
