import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { JobCircular } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export async function PUT(req: any, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthUserFromRequest(req);
    if (!auth || !["super_admin", "owner"].includes(auth.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { _id, createdAt, updatedAt, ...updateData } = body;

    const circular = await JobCircular.findByIdAndUpdate(id, updateData, { new: true });

    if (!circular) {
      return NextResponse.json({ message: "Circular not found" }, { status: 404 });
    }

    return NextResponse.json(circular);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: any, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthUserFromRequest(req);
    if (!auth || !["super_admin", "owner"].includes(auth.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const circular = await JobCircular.findByIdAndDelete(id);
    if (!circular) {
      return NextResponse.json({ message: "Circular not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Circular deleted successfully" });
  } catch (error: any) {
    console.error("Delete circular error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
