import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ContactSubmission } from "@/lib/models";

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
