# Sitemap studio

Describe a business, get a page tree with typed, described sections. Edit it on a canvas, then send the client a link where they can leave comments on any page or section.

- **You** sign in (Supabase Auth), generate sitemaps from a brief with Claude, edit them, and reply to comments.
- **Clients** open `/s/<token>`. No account. They can view and comment, never edit.
- **Notifications:** each new client comment is POSTed to an n8n webhook, which can forward to Telegram and/or Gmail.

Stack: Next.js 16 (App Router), React Flow (`@xyflow/react`), Supabase (Postgres + Auth), Claude API.

## Try it without any setup

```bash
npm install
npm run dev
```

Open <http://localhost:3000/demo>. It runs on an invented business with nothing saved. Switch between Owner view and Client view to see both sides.

## Setup for real use

1. **Supabase project.** Create one, then run `supabase/migrations/0001_init.sql` in the SQL editor.
2. **Lock sign-ups.** Authentication → Sign In / Providers → turn **Allow new users to sign up** off. Then create your own user under Authentication → Users (tick auto-confirm). This matters: the generate endpoint spends Claude credits.
3. **Env.** Copy `.env.example` to `.env.local` and fill it in. Set `ALLOWED_EMAILS` to your email as a second lock on `/api/generate`.
4. `npm run dev`, sign in at `/login`, create a sitemap from `/`.

## How sharing is secured

- Row-level security is on for both tables, and no policy exists for the `anon` role, so the public key can read nothing.
- The share page and `/api/share/<token>/comments` run on the server with the service-role key and only ever touch the project whose 64-character random token matches.
- **Share → Link active** turns a link off; **Make a new link** rotates the token.
- Comment text is length-limited, a project is capped at 500 comments, and a comment must point at a page or section that exists in the tree.

## n8n notification payload

`POST N8N_WEBHOOK_URL` with header `x-webhook-secret: <N8N_WEBHOOK_SECRET>` (check it in the first n8n node):

```json
{
  "event": "sitemap.comment.created",
  "project": "Wattle & Fern Café",
  "author": "Sam",
  "where": "Home → Hero Header",
  "isReply": false,
  "body": "Can the hero mention the courtyard too?",
  "editorUrl": "https://your-site/p/<project id>"
}
```

Failures to reach n8n never block the comment.

## Data model

One `projects` row holds the whole tree as JSON (`pages[] → sections[]`, ids generated client-side), so reordering and moving sections between pages is a single save. A section's comments are keyed by section id, so they follow it when it moves.

## Not built yet

Realtime co-editing and multiple editors (deliberately out of scope), regenerate-from-brief on an existing project, export (Markdown/PDF), per-client links.
