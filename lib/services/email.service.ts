import { logger } from "@/lib/logger";

interface ResendPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

let warnedMissingFromAddress = false;

async function sendResendEmail(
  apiKey: string,
  payload: ResendPayload,
): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Providers can echo recipient addresses and request details in errors.
    // Keep production logs free of those values.
    throw new Error(`Resend email request failed (${response.status})`);
  }
}

export interface FeedbackReadyParams {
  toEmail: string;
  toName: string;
  sessionId: string;
  score: number;
  role: string;
  companyName: string;
}

export const EmailService = {
  async sendFeedbackReady({
    toEmail,
    toName,
    sessionId,
    score,
    role,
    companyName,
  }: FeedbackReadyParams): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

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

    const appUrl =
      process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://intervoxai.com";
    const feedbackUrl = `${appUrl.replace(/\/$/, "")}/interview/session/${sessionId}/feedback`;

    const rawFirstName = toName.split(" ")[0] || toName;

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
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #d4d8ee;">
              <p style="margin:0;font-size:20px;font-weight:600;color:#0e1128;">
                IntervoxAI
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#0e1128;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#525880;line-height:1.6;">
                Your mock interview for <strong style="color:#0e1128;">${safeRole}</strong>
                at <strong style="color:#0e1128;">${safeCompanyName}</strong> has been evaluated.
              </p>
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

    await sendResendEmail(apiKey, {
      from,
      to: toEmail,
      subject: `Your ${role.replace(/[\r\n]/g, "")} interview feedback is ready — ${score}/100`,
      html,
    });

    logger.info(`Feedback email sent for session ${sessionId}`);
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
