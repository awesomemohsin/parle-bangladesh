import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const smtpSecure = process.env.SMTP_SECURE === 'true';

export const SMTP_FROM = process.env.SMTP_FROM_EMAIL || smtpUser || "";
export const SMTP_TO = process.env.SMTP_TO_EMAIL || "cfb@circlenetworkbd.net";

export const transporter = (smtpHost && smtpUser && smtpPassword) 
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort) || 587,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    })
  : null;

export const BRAND_COLOR = "#e11d48"; // Rose-600

export function getResetPasswordTemplate(resetUrl: string, userName: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 40px; border-radius: 24px;">
      <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color: #111827; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 24px; italic">
          Parle <span style="color: ${BRAND_COLOR}">Secure</span>
        </h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 16px;">
          Hello <strong>${userName}</strong>,
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
          A security protocol has been initiated to reset your password. If you did not request this, please ignore this email.
        </p>
        
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${resetUrl}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; line-height: 18px; text-align: center;">
          This link will expire in 60 minutes. <br/>
          For security reasons, do not share this link with anyone.
        </p>
      </div>
      
      <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.1em;">
        &copy; ${new Date().getFullYear()} Parle Bangladesh | Quality Confectionery
      </p>
    </div>
  `;
}
