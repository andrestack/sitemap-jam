import "server-only";

type CommentEvent = {
  projectName: string;
  projectId: string;
  author: string;
  body: string;
  where: string;
  isReply: boolean;
};

/**
 * Posts a new-comment event to an n8n webhook, which fans out to Telegram and/or Gmail.
 * Best effort: a failed notification never fails the comment itself.
 */
export async function notifyNewComment(e: CommentEvent) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET ? { "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({
        event: "sitemap.comment.created",
        project: e.projectName,
        author: e.author,
        where: e.where,
        isReply: e.isReply,
        body: e.body,
        editorUrl: site ? `${site}/p/${e.projectId}` : null,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // swallow: n8n being down must not lose the comment
  }
}
