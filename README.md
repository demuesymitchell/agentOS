# AgentOS v0.3

Autonomous AI agent management system with Factorio-style UI.

## Setup

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (optional — demo mode without it)
npm run dev
# → http://localhost:3000
```

## First-time setup (in the app)

1. Click **ADMIN** in the taskbar (or press the ADM button)
2. Create your first **Room** (e.g. "Management")
3. Create your first **Agent** — assign it to the room, set its role + purpose
4. Type a directive in the **Terminal** and press Enter
5. Watch the Manager agent delegate tasks → agents animate in their rooms
6. Expand tasks in the **Tasks** panel to see full output

## Panel controls
- All panels have **▼ minimize** and **✕ close** buttons
- Reopen panels via the **PANELS** menu or the quick buttons in the taskbar

## Without an API key
Works in demo mode — routing and task creation work, AI responses are placeholders.
Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env.local` for real Claude.

## Railway deployment (when ready)
1. Push to GitHub
2. Connect to Railway → add `ANTHROPIC_API_KEY` env var
3. Run `migrate.sql` against your Postgres instance: `psql $DATABASE_URL -f src/lib/db/migrate.sql`
4. Swap `persist.ts` functions for `fetch('/api/db/...')` calls (schema is identical)

## Adding DALL-E image generation
In `src/app/api/agent/route.ts`, find the `image_gen` section and replace the placeholder with:
```ts
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const img = await openai.images.generate({ model: 'dall-e-3', prompt: task, size: '1024x1024' });
outputs.push({ type: 'image', content: img.data[0].url!, label: 'Generated Image' });
```
