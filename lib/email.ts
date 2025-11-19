import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || user || "no-reply@example.com";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!host || !port || !user || !pass) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendVerificationEmail(to: string, code: string) {
  const transport = getTransporter();

  const subject = "Your Uni & Work Tracker verification code";
  const text = `Your verification code is ${code}. It expires in 15 minutes.`;

  if (!transport) {
    console.log("[DEV] Verification code for", to, "is", code);
    return;
  }

  await transport.sendMail({
    from,
    to,
    subject,
    text,
  });
}
