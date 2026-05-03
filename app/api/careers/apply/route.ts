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

    // 1. Duplicate Check: Same email + Same position (No time limit, forever check)
    const existingApplication = await CareerApplication.findOne({
      email: emailLower,
      position
    });

    if (existingApplication) {
      return NextResponse.json({ 
        message: "You have already applied for this position." 
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
        const { getApplicationReceivedTemplate } = await import("@/lib/mail");
        const applicantMail = await transporter.sendMail({
          from: `"Parle Bangladesh" <${SMTP_FROM}>`,
          to: email,
          subject: "Application Received - Parle Bangladesh",
          html: getApplicationReceivedTemplate(fullname, position),
        });

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
      } catch (error) {
        console.error('Error sending career emails:', error);
      }
    }

    // Send Telegram notification to Management
    try {
      const { notifyNewApplication } = await import("@/lib/telegram");
      await notifyNewApplication(application);
    } catch (error) {
      console.error('Error sending career Telegram notification:', error);
    }

    return NextResponse.json({ message: "Application submitted successfully", id: application._id }, { status: 201 });
  } catch (error: any) {
    console.error("Career application error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
