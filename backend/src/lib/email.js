import nodemailer from "nodemailer";
import dns from "dns/promises";

// Basic RFC-style email format check
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmailFormat(email) {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

// Verifies the email's domain actually accepts mail (has MX records),
// so fake domains like user@notarealdomain123.xyz are rejected.
export async function isRealEmailDomain(email) {
  const domain = email.split("@")[1];
  if (!domain) return false;

  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error("DNS timeout")), 4000)),
    ]);
    // a "null MX" record (exchange "" or ".") means the domain refuses all mail
    return (
      Array.isArray(records) &&
      records.some((r) => r.exchange && r.exchange !== "." && r.exchange !== "")
    );
  } catch {
    // no MX records or lookup failed -> not a deliverable domain
    return false;
  }
}

function buildTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
}

export async function sendPasswordResetEmail(to, resetUrl) {
  const transporter = buildTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email service is not configured");
    }
    // Dev fallback: no SMTP configured — print the link so the flow stays testable
    console.log("==============================================");
    console.log("EMAIL SERVICE NOT CONFIGURED (dev fallback)");
    console.log(`Password reset link for ${to}:`);
    console.log(resetUrl);
    console.log("==============================================");
    return { devFallback: true };
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"CipherChat" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your CipherChat password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your CipherChat password. This link expires in 15 minutes.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Reset Password
          </a>
        </p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { devFallback: false };
}
