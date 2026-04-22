import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CareerApplication } from "@/lib/models";
import { transporter, SMTP_FROM, SMTP_TO } from "@/lib/mail";

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

    const emailLower = email.toLowerCase().trim();

    // 1. Rate Limit: 2 applications per day per email
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyCount = await CareerApplication.countDocuments({
      email: emailLower,
      createdAt: { $gte: oneDayAgo }
    });

    if (dailyCount >= 2) {
      return NextResponse.json({ 
        message: "Security Protocol: You have reached the maximum of 2 applications per 24 hours. Please try again tomorrow." 
      }, { status: 429 });
    }

    // 2. Duplicate Check: Same position within 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const existingSamePosition = await CareerApplication.findOne({
      email: emailLower,
      position,
      createdAt: { $gte: fortyEightHoursAgo }
    });

    if (existingSamePosition) {
      return NextResponse.json({ 
        message: `You have already applied for the "${position}" position. To re-apply or update your CV, please wait 48 hours.` 
      }, { status: 400 });
    }

    // 3. Save to Database
    const application = await CareerApplication.create({
      fullname,
      email: emailLower,
      phone,
      experience,
      message,
      position,
      status: "pending",
    });

    // 2. Send Emails using the "Delta" logic pattern
    if (transporter && SMTP_FROM) {
      try {
        const arrayBuffer = await resume.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // A. Send Confirmation to Applicant First
        const applicantMail = await transporter.sendMail({
          from: `"Parle Bangladesh" <${SMTP_FROM}>`,
          to: email,
          subject: "Application Received - Parle Bangladesh",
          html: `
            <h3>Hello ${fullname}</h3>
            <p>We've received your application for the <strong>${position}</strong> position.</p>
            <p>Our team will review your CV and get back to you soon.</p>
          `,
        });
        console.log('Applicant confirmation sent:', applicantMail.messageId);

        // B. Send to Admin (Notification)
        const adminMail = await transporter.sendMail({
          from: `"Parle Bangladesh Careers" <${SMTP_FROM}>`,
          replyTo: email,
          to: SMTP_TO,
          subject: `Career Application: ${position} - ${fullname}`,
          html: `
            <h3>New Career Application</h3>
            <p><strong>Position:</strong> ${position}</p>
            <p><strong>Name:</strong> ${fullname}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Experience:</strong> ${experience || 'N/A'}</p>
            <br/>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br/>')}</p>
          `,
          attachments: [{ filename: resume.name, content: buffer }],
        });
        console.log('Admin notification sent:', adminMail.messageId);
      } catch (error) {
        console.error('Error sending career emails:', error);
      }
    }

    return NextResponse.json({ message: "Application submitted successfully", id: application._id }, { status: 201 });
  } catch (error: any) {
    console.error("Career application error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
