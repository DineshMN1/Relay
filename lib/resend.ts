import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOTPEmail(email: string, otp: string, name?: string) {
  const { error } = await resend.emails.send({
    from: 'Relay App <onboarding@resend.dev>',
    to: email,
    subject: `Your Relay OTP: ${otp}`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#f97316;">Relay</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your one-time password is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111;margin:16px 0;">${otp}</div>
        <p style="color:#6b7280;font-size:14px;">Valid for 10 minutes. Do not share this.</p>
      </div>
    `,
  })
  if (error) throw new Error(error.message)
}
