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

export function getOTPTemplate(otp: string, userName: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 40px; border-radius: 24px;">
      <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color: #111827; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 24px;">
          Parle <span style="color: ${BRAND_COLOR}">Authentication</span>
        </h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 16px;">
          Hello <strong>${userName}</strong>,
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
          A security protocol has been initiated for your account. Please use the following One-Time Password (OTP) to proceed with your password change:
        </p>
        
        <div style="text-align: center; margin-bottom: 32px; background-color: #f3f4f6; padding: 24px; border-radius: 12px; border: 1px dashed #d1d5db;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.5em; color: #111827;">${otp}</span>
        </div>
        
        <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 32px; margin-top: 32px; margin-bottom: 20px;">
           <p style="color: #6b7280; font-size: 13px; line-height: 20px; margin: 0; background-color: #fef2f2; padding: 12px; border-radius: 8px; border: 1px solid #fee2e2;">
             This code will expire in <strong>10 minutes</strong>.
           </p>
           <p style="color: #6b7280; font-size: 13px; line-height: 20px; margin-top: 16px;">
             If you did not request this, please change your password immediately for your account's safety.
           </p>
        </div>
      </div>
    </div>
  `;
}

export function getLoginOTPTemplate(otp: string, userName: string, ip: string, device: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 40px; border-radius: 24px;">
      <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color: #111827; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 24px;">
          Parle <span style="color: ${BRAND_COLOR}">Security</span>
        </h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 16px;">
          Hello <strong>${userName}</strong>,
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
          Use the following One-Time Password (OTP) to authorize your login attempt:
        </p>
        
        <div style="text-align: center; margin-bottom: 32px; background-color: #f3f4f6; padding: 24px; border-radius: 12px; border: 1px dashed #d1d5db;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.5em; color: #111827;">${otp}</span>
        </div>
        
        <div style="background-color: #fff7ed; padding: 20px; border-radius: 12px; border: 1px solid #ffedd5; margin-bottom: 24px;">
           <p style="color: #9a3412; font-size: 12px; margin: 0; line-height: 18px;">
              <strong>Security Details:</strong><br/>
              Location IP: ${ip}<br/>
              Authorized Device: ${device}
           </p>
        </div>

        <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 32px; margin-top: 32px; margin-bottom: 20px;">
           <p style="color: #6b7280; font-size: 13px; line-height: 20px; margin: 0; background-color: #fef2f2; padding: 12px; border-radius: 8px; border: 1px solid #fee2e2;">
             This code will expire in <strong>10 minutes</strong>.
           </p>
           <p style="color: #6b7280; font-size: 13px; line-height: 20px; margin-top: 16px;">
             If this was you, you can ignore this email. If this wasn't you, please reset your password immediately and contact the system owner.
           </p>
        </div>
      </div>
    </div>
  `;
}

export function getApplicationReceivedTemplate(fullname: string, position: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 40px; border-radius: 24px;">
      <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color: #111827; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 24px;">
          Parle <span style="color: ${BRAND_COLOR}">Careers</span>
        </h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 16px;">
          Hello <strong>${fullname}</strong>,
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
          We have successfully received your application for the <strong>${position}</strong> position. Our human resources team is currently reviewing your profile and credentials.
        </p>

        <div style="background-color: #f3f4f6; padding: 24px; border-radius: 12px; margin-bottom: 32px; border-left: 4px solid ${BRAND_COLOR};">
           <p style="color: #111827; font-size: 14px; margin: 0; font-weight: 700;">Status: Application Received & Under Review</p>
        </div>
        
        <p style="color: #4b5563; font-size: 14px; line-height: 22px; margin-bottom: 0;">
          If your background matches our requirements, we will contact you for further evaluation. Thank you for your interest in Parle Bangladesh.
        </p>
      </div>
      
      <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.1em;">
        &copy; ${new Date().getFullYear()} Parle Bangladesh | Quality Confectionery
      </p>
    </div>
  `;
}
