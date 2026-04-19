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

    // 2. Send Emails using the "Delta" logic pattern
    if (transporter && SMTP_FROM) {
      try {
        const arrayBuffer = await resume.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // A. Send to Admin (Matches Delta Subject/Logic)
        await transporter.sendMail({
          from: `"Parle BD Careers" <${SMTP_FROM}>`,
          replyTo: email,
          to: SMTP_TO,
          subject: `Parle BD Website Carrer - ${position} - ${fullname}`,
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

        // B. Send Confirmation to Applicant
        await transporter.sendMail({
          from: `"Parle Bangladesh" <${SMTP_FROM}>`,
          to: email,
          subject: "Application Received - Parle Bangladesh",
          html: `
            <h3>Hello ${fullname}</h3>
            <p>We've received your application for the <strong>${position}</strong> position.</p>
            <p>Our team will review your CV and get back to you soon.</p>
          `,
        });
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
