import { NextRequest, NextResponse } from "next/server";
import { ProductSchema } from "@/lib/schemas";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Product, ApprovalRequest } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

function mapDoc(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

interface Params {
  params: Promise<{ slug: string }>;
}

import fs from "fs";
import path from "path";
import { Category } from "@/lib/models";

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { slug } = await params;
    const productDoc = await Product.findOne({ slug });

    if (!productDoc) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get the category name for path construction
    const categoryDoc = await Category.findOne({ slug: productDoc.category });
    const categoryName = categoryDoc ? categoryDoc.name : "Uncategorized";

    const product = mapDoc(productDoc);

    // Build local path to check for images
    // Path: /public/images/category-slug/product-slug/
    // Example: /public/images/biscuits/parle-g-gold/
    const categorySlug = productDoc.category; // Now always a slug
    const productSlug = productDoc.slug;
    
    const relativeDirPath = path.join("images", categorySlug, productSlug);
    const absoluteDirPath = path.join(process.cwd(), "public", relativeDirPath);

    let images: string[] = [];
    if (fs.existsSync(absoluteDirPath)) {
      try {
        const files = fs.readdirSync(absoluteDirPath);
        images = files
          .filter((f) => /\.(webp|jpg|jpeg|png|svg)$/i.test(f))
          .sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
          })
          .map((f) => `/${relativeDirPath.replace(/\\/g, "/")}/${f}`);
      } catch (err) {
        console.error("Error reading product directory:", err);
      }
    }

    // Fallback: If no filesystem images, use the ones in DB
    if (images.length === 0 && productDoc.images && productDoc.images.length > 0) {
      images = productDoc.images;
    }

    // Fetch pending approvals for this product
    const pendingApprovals = await ApprovalRequest.find({ 
      targetId: productDoc._id.toString(), 
      status: "pending" 
    });

    return NextResponse.json({ product, images, pendingApprovals });
  } catch (error) {
    console.error("Product GET by slug error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== ROLES.ADMIN) {
        return NextResponse.json({ error: "Restricted: Only Admins can modify products directly. Superadmins/Owners must use the Approvals system." }, { status: 403 });
    }

    const { slug } = await params;
    const existing = await Product.findOne({ slug });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    let pendingApproval = false;
    let changeLog = [];
    
    // We update values from body. Price/Stock are now in variations.
    if (body.variations) {
      for (let i = 0; i < body.variations.length; i++) {
        const newVar = body.variations[i];
        const oldVar = existing.variations[i];
        
        if (oldVar) {
          // Price Change Check
          if (newVar.price !== undefined && Number(newVar.price) !== oldVar.price) {
            console.log(`[APPROVAL] Creating price change request for ${existing.slug} variation ${i}`);
            const approvalRequest = new ApprovalRequest({
              requesterEmail: user.email,
              type: "product",
              targetId: existing._id.toString(),
              targetName: existing.name,
              targetSlug: existing.slug,
              field: "price",
              oldValue: String(oldVar.price),
              newValue: String(newVar.price),
              weight: oldVar.weight,
              flavor: oldVar.flavor,
              variationIndex: i,
              status: "pending",
              stage: "superadmin", // Explicitly start at superadmin stage
            });
            await approvalRequest.save();

            const { Notification } = require("@/lib/models");
            await Notification.create({
              role: ROLES.SUPER_ADMIN,
              title: "Product Change Req",
              message: `Price adjustment requested for ${existing.name} variation ${i}. Verification needed.`,
              type: "approval",
              targetLink: `/admin/approvals/products`
            });

            changeLog.push(`Proposed price change for variation ${i} from ${oldVar.price} to ${newVar.price} (PENDING)`);
            newVar.price = oldVar.price; // Revert for this immediate save
            pendingApproval = true;
          }
          
          // Stock Change Check
          if (newVar.stock !== undefined && Number(newVar.stock) !== oldVar.stock) {
            console.log(`[APPROVAL] Creating stock change request for ${existing.slug} variation ${i}`);
            const approvalRequest = new ApprovalRequest({
              requesterEmail: user.email,
              type: "product",
              targetId: existing._id.toString(),
              targetName: existing.name,
              targetSlug: existing.slug,
              field: "stock",
              oldValue: String(oldVar.stock),
              newValue: String(newVar.stock),
              weight: oldVar.weight,
              flavor: oldVar.flavor,
              variationIndex: i,
              status: "pending",
              stage: "superadmin",
            });
            await approvalRequest.save();

            const { Notification } = require("@/lib/models");
            await Notification.create({
              role: ROLES.SUPER_ADMIN,
              title: "Stock Adjustment Req",
              message: `Inventory modification for ${existing.name} variation ${i}. Verification required.`,
              type: "approval",
              targetLink: `/admin/approvals/products`
            });

            changeLog.push(`Proposed stock change for variation ${i} from ${oldVar.stock} to ${newVar.stock} (PENDING)`);
            newVar.stock = oldVar.stock; // Revert for this immediate save
            pendingApproval = true;
          }
        }
      }
      existing.variations = body.variations;
    }
    
    if (body.name && body.name !== existing.name) {
       changeLog.push(`Changed name from "${existing.name}" to "${body.name}"`);
       existing.name = body.name;
    }
    if (body.category && body.category !== existing.category) {
       changeLog.push(`Changed category from "${existing.category}" to "${body.category}"`);
       existing.category = body.category;
    }
    if (body.brand && body.brand !== existing.brand) {
       changeLog.push(`Changed brand from "${existing.brand}" to "${body.brand}"`);
       existing.brand = body.brand;
    }
    if (body.description) existing.description = body.description;
    if (body.images) existing.images = body.images;

    await existing.save();

    // Log administrative activity
    await logAdminActivity({
      adminEmail: user.email,
      action: "update_product",
      targetId: existing._id.toString(),
      targetName: existing.name,
      details: changeLog.length > 0 ? changeLog.join(" | ") : "Updated product properties"
    });

    return NextResponse.json({ 
      product: mapDoc(existing),
      pendingApproval,
      message: pendingApproval ? "Some changes require owner approval" : "Product updated successfully"
    });
  } catch (error) {
    console.error("Product PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== ROLES.ADMIN) {
        return NextResponse.json({ error: "Restricted: Only Admins can delete products." }, { status: 403 });
    }

    const { slug } = await params;
    const deleted = await Product.findOneAndDelete({ slug });
    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Log administrative activity
    await logAdminActivity({
      adminEmail: user.email,
      action: "delete_product",
      targetId: deleted._id.toString(),
      targetName: deleted.name,
      details: `Deleted product: ${deleted.name} (${deleted.slug})`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
