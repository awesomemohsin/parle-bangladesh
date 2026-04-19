import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CareerApplication } from "@/lib/models";
import nodemailer from "nodemailer";

export const runtime = 'nodejs'; // Required for nodemailer/buffer handling

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const fullname = formData.get("fullname") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const experience = formData.get("experience") as string;
    const message = formData.get("message") as string;
    const position = formData.get("position") as string;
    const resume = formData.get("resume") as File;

    if (!fullname || !email || !phone || !resume) {
      return NextResponse.json({ message: "Required fields missing" }, { status: 400 });
    }

    await connectDB();

    // 1. Save to Database
    const application = await CareerApplication.create({
      fullname,
      email,
      phone,
      experience,
      message,
      position,
      status: "pending",
    });

    // 2. Send Email
    // Check if SMTP settings exist in environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const adminEmail = process.env.ADMIN_EMAIL || "cfb@circlenetworkbd.net";

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587"),
        secure: smtpPort === "465",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      // Convert File to Buffer for attachment
      const arrayBuffer = await resume.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const mailOptions = {
        from: `"Parle Careers" <${smtpUser}>`,
        to: adminEmail,
        subject: `[Career] ${position} - ${fullname}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #e11d48; text-transform: uppercase;">New Job Application</h2>
            <p>A new application has been submitted through the Parle Bangladesh Careers page.</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 150px;">Position:</td>
                <td style="padding: 8px 0;">${position}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Full Name:</td>
                <td style="padding: 8px 0;">${fullname}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Experience:</td>
                <td style="padding: 8px 0;">${experience || 'Not specified'}</td>
              </tr>
            </table>
            <div style="margin-top: 20px;">
              <p style="font-weight: bold;">Message/Cover Letter:</p>
              <p style="background: #f9fafb; padding: 15px; border-radius: 8px; font-style: italic;">
                "${message || 'No additional message provided.'}"
              </p>
            </div>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
              This email was generated automatically from the Parle Bangladesh Website.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: resume.name,
            content: buffer,
          },
        ],
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn("SMTP settings missing in .env. Email not sent, but application saved to DB.");
    }

    return NextResponse.json({ message: "Application submitted successfully", id: application._id }, { status: 201 });
  } catch (error) {
    console.error("Career application error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
