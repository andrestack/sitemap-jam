<p align="center">
  <img src="public/brand/sitemap-jam-jar.png" alt="Sitemap Jam logo: a smiling jam jar with a gingham lid and an SMJ label" width="120" height="120">
</p>

# Sitemap Jam

Describe a business, get a page tree with typed, described sections. Edit it on a canvas, then send the client a link where they can leave comments on any page or section.

- **You** sign in (Supabase Auth), generate sitemaps from a brief with an LLM (via OpenRouter), edit them, and reply to comments.
- **Clients** open `/s/<token>`. No account. They can view and comment, never edit.
- **Notifications:** each new client comment is POSTed to an n8n webhook, which can forward to Telegram and/or Gmail.

Stack: Next.js 16 (App Router), React Flow (`@xyflow/react`), Supabase (Postgres + Auth), OpenRouter (the model is a setting, `SITEMAP_MODEL`).

## Try it without any setup

```bash
npm install
npm run dev
```

Open <http://localhost:3000/demo>. It runs on an invented business with nothing saved. Switch between Owner view and Client view to see both sides.

## Setup for real use

1. **Supabase project.** Create one, then run the files in `supabase/migrations` in order (`0001_init.sql`, then `0002_comments_parent_index.sql`) in the SQL editor.
2. **Create your user, then lock sign-ups.** Authentication → Users → add your user (tick auto-confirm). Then Authentication → Sign In / Providers → turn **Allow new users to sign up** off. This matters: the generate endpoint spends model credits.
3. **Env.** Copy `.env.example` to `.env.local` and fill it in. Set `ALLOWED_EMAILS` to your email (required: `/api/generate` refuses to run without it) and add an `OPENROUTER_API_KEY`. `SITEMAP_MODEL` is optional and defaults to `anthropic/claude-sonnet-5.5`; any OpenRouter model that supports structured outputs works.
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
