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
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#f97316;margin:0 0 16px;">Relay</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your one-time password is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111;margin:16px 0;">${otp}</div>
        <p style="color:#6b7280;font-size:14px;">Valid for 10 minutes. Do not share this.</p>
      </div>
    `,
  })
}
