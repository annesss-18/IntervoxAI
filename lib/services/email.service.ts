/**
 * Email service — feedback-ready transactional notifications.
 *
 * Depends on the `resend` package:
 *   npm install resend
 *
 * Required env vars (see .env.example):
 *   RESEND_API_KEY     — Resend API key (re_...)
 *   RESEND_FROM_ADDRESS — Verified sender address on your Resend account
 *
 * When either RESEND_API_KEY or RESEND_FROM_ADDRESS is absent the service is a
 * no-op: all calls return immediately without throwing so local development and
 * CI environments need no mail credentials.
 */

import { logger } from "@/lib/logger";

// Lazily import Resend to avoid loading it in environments where email is not
// configured (e.g. CI, local dev without RESEND_API_KEY set).
type ResendClient = {
  emails: { send: (payload: ResendPayload) => Promise<unknown> };
};
interface ResendPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

let _resend: ResendClient | null = null;
let warnedMissingFromAddress = false;

async function getResendClient(): Promise<ResendClient | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  if (_resend) return _resend;

  try {
    // Dynamic import so bundlers don't tree-shake the missing module error in
    // environments where the package isn't installed.
    const { Resend } = await import("resend");
    _resend = new Resend(apiKey) as unknown as ResendClient;
    return _resend;
  } catch {
    logger.warn(
      'EmailService: "resend" package not installed. Run: npm install resend',
    );
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface FeedbackReadyParams {
  toEmail: string;
  toName: string;
  sessionId: string;
  score: number;
  role: string;
  companyName: string;
}

export const EmailService = {
  /**
   * Send a "your feedback report is ready" notification.
   *
   * Silently returns when:
   * - RESEND_API_KEY is not set (local dev / CI)
   * - RESEND_FROM_ADDRESS is not set
   * - The resend package is not installed
   *
   * Throws on Resend API errors so callers can decide whether to retry or
   * log-and-continue.
   */
  async sendFeedbackReady({
    toEmail,
    toName,
    sessionId,
    score,
    role,
    companyName,
  }: FeedbackReadyParams): Promise<void> {
    const client = await getResendClient();
    if (!client) return; // email not configured — silently skip

    const from = process.env.RESEND_FROM_ADDRESS?.trim();
    if (!from) {
      if (!warnedMissingFromAddress) {
        logger.warn(
          "EmailService: RESEND_FROM_ADDRESS is not set. Skipping feedback email delivery.",
        );
        warnedMissingFromAddress = true;
      }
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://intervoxai.com";
    const feedbackUrl = `${appUrl}/interview/session/${sessionId}/feedback`;

    const rawFirstName = toName.split(" ")[0] || toName;

    // Escape user-controlled strings before interpolating into HTML to
    // prevent injection of misleading markup or links from malicious
    // public templates. Note: escapeHtml is NOT used in the subject line
    // because email subjects are plain text — using it there would cause
    // HTML entities (e.g. &amp;) to appear literally in the subject.
    const firstName = escapeHtml(rawFirstName);
    const safeRole = escapeHtml(role);
    const safeCompanyName = escapeHtml(companyName);

    const scoreColour =
      score >= 80 ? "#1a9e6a" : score >= 60 ? "#b87c20" : "#c03848";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your feedback is ready</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fe;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fe;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #d4d8ee;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #d4d8ee;">
              <p style="margin:0;font-size:20px;font-weight:600;color:#0e1128;">
                IntervoxAI
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#0e1128;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#525880;line-height:1.6;">
                Your mock interview for <strong style="color:#0e1128;">${safeRole}</strong>
                at <strong style="color:#0e1128;">${safeCompanyName}</strong> has been evaluated.
              </p>
              <!-- Score pill -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#f8f9fe;border:1px solid #d4d8ee;border-radius:12px;padding:16px 24px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#525880;">
                      Overall score
                    </p>
                    <p style="margin:0;font-size:40px;font-weight:700;color:${scoreColour};font-family:monospace;">
                      ${score}<span style="font-size:20px;color:#525880;">/100</span>
                    </p>
                  </td>
                </tr>
              </table>
              <!-- CTA -->
              <a href="${feedbackUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#e0507a,#7040c8);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:100px;">
                View your full feedback report →
              </a>
              <p style="margin:28px 0 0;font-size:13px;color:#525880;line-height:1.5;">
                Your report includes a performance breakdown across five dimensions,
                key strengths, areas to improve, career coaching, and a full transcript
                of your session.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #d4d8ee;">
              <p style="margin:0;font-size:12px;color:#8890bc;">
                IntervoxAI · Practice. Speak. Improve. ·
                <a href="${appUrl}/privacy" style="color:#8890bc;">Privacy</a> ·
                <a href="${appUrl}/terms" style="color:#8890bc;">Terms</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // FIX: The subject is plain text — do NOT run it through escapeHtml().
    // HTML entities in a subject line appear verbatim (e.g. "R&amp;D Engineer").
    await client.emails.send({
      from,
      to: toEmail,
      subject: `Your ${role} interview feedback is ready — ${score}/100`,
      html,
    });

    logger.info(`Feedback email sent to ${toEmail} for session ${sessionId}`);
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Escape user-controlled text for safe interpolation into HTML bodies only. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
