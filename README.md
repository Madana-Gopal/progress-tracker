# Prep Tracker

A cross-device progress tracker for the full-stack FAANG/fintech prep roadmap
(Urgent Sprint, 8 phases, React Internals, the 9-pillar system design
cheatsheet, Micro Frontends, and a 30-day machine coding build log).

No login. A random **sync code** (e.g. `BLUE-7F3K-92XQ`) is generated the
first time you open the site and stored in your browser. Progress is saved
to the server under that code. To see the same progress on another browser
or device, open the site there and paste the code into **"Link device."**

## Run it locally

```bash
npm install
npm start
```

Then open http://localhost:3000

## Deploy it

This is a plain Node + Express app with no native dependencies, so it runs
on almost any Node host with a persistent filesystem:

- **Render / Railway / Fly.io**: push this folder, set the start command to
  `npm start` (already in `package.json`). Attach a small persistent disk
  mounted so `data/progress.json` survives restarts (on Render: add a disk
  mounted at `/opt/render/project/src/data`, or just point `DATA_FILE` at
  wherever your disk is mounted).
- **A VPS**: `npm install && npm start`, put it behind nginx/pm2.
- **Vercel/Netlify serverless**: will NOT work as-is — their filesystem is
  ephemeral per-request, so `data/progress.json` won't persist. If you want
  serverless, swap the `readAll`/`writeAll` functions in `server.js` for a
  real database (Postgres, Supabase, Upstash Redis, etc.) — the rest of the
  app doesn't change.

## How progress is structured

All content lives in one place: the `SECTIONS` array near the top of the
`<script>` tag in `public/index.html`. Each section has `groups`, each group
has `items` (plain strings). Item IDs are derived from their position
(`sectionIndex.groupIndex.itemIndex`), so:

- You can freely **edit label text** without losing anyone's checked state.
- Don't **reorder or delete** existing items/groups/sections once people
  have started checking things off — that shifts the IDs and will make
  checked items point at different labels. Appending new items/groups/
  sections at the end is always safe.

## API

- `POST /api/progress` → creates a new sync code, returns `{ code, data }`
- `GET /api/progress/:code` → returns `{ code, data, updatedAt }`
- `PUT /api/progress/:code` with body `{ data: {...} }` → saves and returns
  the same shape

`data` is a flat object like `{ "0.1.2": true, "3.0.0": true }` — keys are
item IDs, present+true means checked.
