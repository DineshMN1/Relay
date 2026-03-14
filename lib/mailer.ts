import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendOTPEmail(email: string, otp: string, name?: string) {
  await transporter.sendMail({
    from: `"Relay" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Your Relay OTP: ${otp}`,
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#f97316;margin:0 0 8px;">Relay</h2>
        <p style="color:#6b7280;margin:0 0 24px;">Hi ${name || 'there'}, here is your one-time password.</p>
        <div style="background:#fff7ed;border-radius:8px;padding:20px;text-align:center;">
          <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#f97316;">${otp}</span>
        </div>
        <p style="color:#9ca3af;font-size:13px;margin:16px 0 0;">Valid for 10 minutes. Do not share this code.</p>
      </div>
    `,
  })
}
