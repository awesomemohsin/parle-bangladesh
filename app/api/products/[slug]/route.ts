import { NextRequest, NextResponse } from "next/server";
import { ProductSchema } from "@/lib/schemas";
import { getVerifiedAuthUser, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Product, User, ApprovalRequest, Notification, Category } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";
import { notifyNewApprovalRequest } from "@/lib/telegram";
import fs from "fs";
import path from "path";

// Function to safely delete images
const deleteLocalImage = (imagePath: string) => {
  try {
    const fullPath = path.join(process.cwd(), "public", imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error(`Failed to delete image: ${imagePath}`, err);
  }
};

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB();
    const { slug } = await params;
    const product = await Product.findOne({ slug }).lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Security: Only admins and dealers can see dealerPrice
    const user = await getVerifiedAuthUser(_);
    let isPrivileged = false;
    
    if (user) {
      if ([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR].includes(user.role)) {
        isPrivileged = true;
      } 
      else if (user.customerType === "dealer") {
        const dbUser = await User.findById(user.id).select("customerType").lean();
        if (dbUser && dbUser.customerType === "dealer") {
          isPrivileged = true;
        }
      }
    }

    const sanitizedProduct = { ...product, id: product._id.toString(), _id: undefined };
    if (!isPrivileged && sanitizedProduct.variations) {
      sanitizedProduct.variations = sanitizedProduct.variations.map((v: any) => {
        const variation = { ...v };
        delete variation.dealerPrice;
        return variation;
      });
    }

    return NextResponse.json(sanitizedProduct);
  } catch (error) {
    console.error("Product Detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB();
    const user = await getVerifiedAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { slug } = await params;
    const body = await request.json();
    
    const existingProduct = await Product.findOne({ slug });
    if (!existingProduct) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const isHighLevel = user.role === ROLES.SUPER_ADMIN || user.role === ROLES.OWNER;
    const isStaff = user.role === ROLES.ADMIN || user.role === ROLES.MODERATOR;

    if (!isStaff && !isHighLevel) return NextResponse.json({ error: "Restricted" }, { status: 403 });

    if (isHighLevel) {
       Object.assign(existingProduct, body);
       await existingProduct.save();
       await logAdminActivity({
         adminEmail: user.email,
         action: "update_product_direct",
         targetId: existingProduct._id.toString(),
         targetName: existingProduct.name,
         details: `Directly updated product: ${existingProduct.name}`
       });
       return NextResponse.json(existingProduct);
    }

    // Moderators/Admins create approval requests
    const approvalRequest = new ApprovalRequest({
      type: "product_update",
      targetId: existingProduct._id.toString(),
      targetName: existingProduct.name,
      requestedBy: user.name || user.email,
      requestedByEmail: user.email,
      changes: body,
      currentData: existingProduct.toObject(),
      stage: "superadmin"
    });

    await approvalRequest.save();

    await Notification.create({
      title: "Product Update Request",
      message: `${user.name} requested changes for ${existingProduct.name}`,
      type: "approval",
      targetLink: `/admin/approvals`
    });

    try {
      await notifyNewApprovalRequest(approvalRequest.toObject());
    } catch (e) {
      console.error("Telegram notification failed", e);
    }

    return NextResponse.json({ message: "Approval request submitted" });

  } catch (error) {
    console.error("Product PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB();
    const user = await getVerifiedAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { slug } = await params;
    const product = await Product.findOne({ slug });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Cleanup images
    if (product.images && product.images.length > 0) {
      product.images.forEach((img: string) => {
        if (img.startsWith("/uploads/")) {
          deleteLocalImage(img);
        }
      });
    }

    await Product.deleteOne({ _id: product._id });
    
    await logAdminActivity({
      adminEmail: user.email,
      action: "delete_product",
      targetId: product._id.toString(),
      targetName: product.name,
      details: `Deleted product: ${product.name}`
    });

    return NextResponse.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
