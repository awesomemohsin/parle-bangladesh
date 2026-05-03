import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ContactSubmission } from "@/lib/models";
import { transporter, SMTP_FROM, SMTP_TO } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, number, email, message, type, organizationName, location } = body;

    // Server-side validation
    if (!name || !number) {
      return NextResponse.json(
        { message: "Name and Number are required" },
        { status: 400 }
      );
    }

    if (type === "corporate" && !organizationName) {
      return NextResponse.json(
        { message: "Organization Name is required for corporate inquiries" },
        { status: 400 }
      );
    }

    if (type === "dealer" && !location) {
      return NextResponse.json(
        { message: "Location is required for dealer inquiries" },
        { status: 400 }
      );
    }

    const newSubmission = await ContactSubmission.create({
      name,
      number,
      email,
      message,
      type,
      organizationName,
      location,
    });

    // Send Email notification to Admin
    if (transporter && SMTP_FROM) {
      try {
        await transporter.sendMail({
          from: `"Parle BD Contact" <${SMTP_FROM}>`,
          replyTo: email,
          to: SMTP_TO,
          subject: `New Contact Inquiry: ${type.toUpperCase()} - ${name}`,
          html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${number}</p>
            ${organizationName ? `<p><strong>Organization:</strong> ${organizationName}</p>` : ""}
            ${location ? `<p><strong>Location:</strong> ${location}</p>` : ""}
            <br/>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br/>')}</p>
          `,
        });
      } catch (error) {
        console.error('Error sending contact notification:', error);
      }
    }

    // Send Telegram notification to Management
    try {
      const { notifyNewInquiry } = await import("@/lib/telegram");
      await notifyNewInquiry(newSubmission);
    } catch (error) {
      console.error('Error sending contact Telegram notification:', error);
    }

    return NextResponse.json(
      { message: "Success", id: newSubmission._id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
