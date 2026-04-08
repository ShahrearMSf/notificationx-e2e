// @ts-check

/**
 * Send a Slack notification via webhook.
 * @param {string} webhookUrl - Slack incoming webhook URL
 * @param {object} payload - Slack message payload
 * @returns {Promise<{ok: boolean, status: number}>}
 */
export async function sendSlackNotification(webhookUrl, payload) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return { ok: res.ok, status: res.status };
}

/**
 * Build a Slack message payload for NotificationX test results.
 * @param {object} options
 * @param {string} options.status - "passed" | "failed" | "info"
 * @param {string} options.summary - Short summary text
 * @param {string} [options.details] - Optional detail text
 * @param {string} [options.runUrl] - Optional link to the run/report
 * @returns {object} Slack Block Kit payload
 */
export function buildSlackPayload({ status, summary, details, runUrl }) {
  const emoji = status === "passed" ? ":white_check_mark:" : status === "failed" ? ":x:" : ":information_source:";
  const color = status === "passed" ? "#36a64f" : status === "failed" ? "#e01e5a" : "#1264a3";

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *NotificationX E2E — ${summary}*`,
      },
    },
  ];

  if (details) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: details,
      },
    });
  }

  if (runUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${runUrl}|View Report>`,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Sent at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })} (BST)`,
      },
    ],
  });

  return { attachments: [{ color, blocks }] };
}
