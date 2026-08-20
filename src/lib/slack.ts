type SlackPayload = {
  text: string;
  blocks?: unknown[];
};

/** Escape Slack's three reserved chars in user-supplied text. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Post to the Slack incoming webhook. Never throws — a Slack outage must not
 * fail a submission that already succeeded downstream.
 */
export async function notifySlack(payload: SlackPayload): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.warn("SLACK_WEBHOOK_URL not set, skipping Slack notification");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Slack webhook error:", res.status, await res.text());
    }
  } catch (error) {
    console.error("Slack webhook failed:", error);
  }
}
