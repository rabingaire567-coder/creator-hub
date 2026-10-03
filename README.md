# Rabin Gaire — Creator Platform

A warm, colourful personal platform for **Rabin Gaire**: a public website that
reads published content from Convex, plus a private `/admin` studio for running
the whole site.

## What's inside

**Public site** (`/`)

- `/` — landing page (hero, stats, featured content, articles, current project)
- `/content` + `/content/:id` — videos/content library
- `/articles` + `/articles/:slug` — editorial articles
- `/projects` + `/projects/:id` — portfolio
- `/about`, `/community`, `/contact` — story, idea submissions, contact form
- `Ctrl/⌘ + K` — command palette search across everything

**Admin studio** (`/admin`, sign-in required)

- Dashboard with counts and inbox previews
- Content, Articles, Projects — full CRUD with drafts, featured flags and search
- Tags + Social links (ordering, visibility)
- Homepage CMS — hero, intro, stats, about sections, timeline, current project
- Settings — identity, SEO, warm accent palette, default theme, owner email
- Inbox — community submissions and contact messages with statuses

## Stack

Vite + React 19 + TypeScript, Convex (database, functions, auth via
`@convex-dev/auth` with email OTP + anonymous), Tailwind CSS v4 + shadcn/ui,
framer-motion, react-router v7, Bun.

## Getting started

```bash
bun install
bunx convex dev --once   # codegen + push Convex functions
bun run dev
```

### Environment

The only required variable is the Convex deployment URL, read as
`import.meta.env.VITE_CONVEX_URL`. Set it through the project's
**Keys/API keys** UI (do not commit real secrets):

```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

## Admin access

1. Sign in at `/auth` (email one-time code, or continue as guest while
   bootstrapping).
2. Open `/admin`.
3. In **Settings → Owner access**, set your email — from then on only that
   account can run admin mutations (`requireAdmin` in `src/convex/lib.ts`).

## Design system

Warm palette defined in `src/index.css`: ember (terracotta), gold, clay, sage
and dusk accents on a dark-warm or warm-paper background, Fraunces for display
type and Plus Jakarta Sans for body. Accent colours and default theme are
editable at runtime from **Admin → Settings → Appearance**.

## Verification

```bash
bunx convex dev --once && bunx tsc -b --noEmit   # types + Convex codegen
bun run build                                     # production build (CI does this)
```
