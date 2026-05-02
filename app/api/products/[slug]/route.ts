import { NextRequest, NextResponse } from "next/server";
import { ProductSchema } from "@/lib/schemas";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Product, ApprovalRequest, Notification, Category } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";
import fs from "fs";
import path from "path";

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

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { slug } = await params;
    const productDoc = await Product.findOne({ slug });

    if (!productDoc) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = mapDoc(productDoc);
    const categorySlug = productDoc.category;
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

    if (images.length === 0 && productDoc.images && productDoc.images.length > 0) {
      images = productDoc.images;
    }

    // Security: Only admins and dealers can see dealerPrice
    const user = getAuthUserFromRequest(_);
    const isPrivileged = user && (
      user.role === ROLES.ADMIN || 
      user.role === ROLES.SUPER_ADMIN || 
      user.role === ROLES.OWNER || 
      user.role === ROLES.MODERATOR || 
      user.customerType === "dealer"
    );

    if (!isPrivileged && product.variations) {
      product.variations = product.variations.map((v: any) => {
        const variation = { ...v };
        delete variation.dealerPrice;
        return variation;
      });
    }

    const pendingApprovals = await ApprovalRequest.find({ 
      targetId: productDoc._id.toString(), 
      status: "pending" 
    });

    const response = NextResponse.json({ product, images, pendingApprovals });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
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
    
    const isAllowed = user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN || user.role === ROLES.OWNER || user.role === ROLES.MODERATOR;
    if (!isAllowed) {
        return NextResponse.json({ error: "Restricted: Insufficient permissions to propose changes." }, { status: 403 });
    }

    const { slug } = await params;
    const existing = await Product.findOne({ slug });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    let pendingApproval = false;
    let changeLog = [];
    
    // 1. CHECK MAIN PRODUCT FIELDS
    const mainFields = ['name', 'category', 'brand', 'description', 'isBulk'];
    for (const field of mainFields) {
        const newVal = body[field];
        const oldVal = (existing as any)[field];
        
        const isEquivalent = 
          (newVal === oldVal) || 
          (!newVal && !oldVal);

        if (!isEquivalent && newVal !== undefined) {
            const approvalRequest = new ApprovalRequest({
                requesterEmail: user.email,
                type: "product",
                targetId: existing._id.toString(),
                targetName: existing.name,
                targetSlug: existing.slug,
                field: field,
                oldValue: String((existing as any)[field] || ""),
                newValue: String(body[field]),
                status: "pending",
                targetDetails: existing.toObject(),
                stage: "superadmin",
            });
            await approvalRequest.save();
            await Notification.create({
                role: ROLES.SUPER_ADMIN,
                title: "Product Detail Change",
                message: `${field.toUpperCase()} change for ${existing.name} requires approval.`,
                type: "approval",
                targetLink: `/admin/approvals`
            });
            changeLog.push(`Proposing ${field} change (PENDING)`);
            // Revert field for this immediate save
            body[field] = (existing as any)[field];
            pendingApproval = true;
        }
    }

    // 2. CHECK VARIATION FIELDS
    if (body.variations) {
      for (let i = 0; i < body.variations.length; i++) {
        const newVar = body.variations[i];
        const oldVar = existing.variations[i];
        
        if (oldVar) {
          const varFields = ['price', 'dealerPrice', 'stock', 'weight', 'flavor', 'discountPrice', 'isBulk'];
          for (const field of varFields) {
              const isAdminAction = field === 'price' || field === 'dealerPrice' || field === 'stock' || field === 'discountPrice';
              let newVal = isAdminAction ? Number(newVar[field]) : newVar[field];
              let oldVal = (oldVar as any)[field];

              // Robust Comparison Logic: Handle null, undefined, and type mismatches
              const isEquivalent = 
                (newVal === oldVal) || 
                (!newVal && !oldVal) || 
                (isAdminAction && Number(newVal || 0) === Number(oldVal || 0));

              if (!isEquivalent && newVal !== undefined) {
                // RESTRICTION: Stock can only be increased via this route
                if (field === 'stock' && Number(newVal) < Number(oldVal)) {
                    return NextResponse.json({ 
                        error: "Restricted: Stock levels can only be increased here. For adjustments or losses, use the Dedicated Order Loss Engine." 
                    }, { status: 403 });
                }

                const approvalRequest = new ApprovalRequest({
                    requesterEmail: user.email,
                    type: "product",
                    targetId: existing._id.toString(),
                    targetName: existing.name,
                    targetSlug: existing.slug,
                    field: field,
                    oldValue: String(oldVal),
                    newValue: String(newVal),
                    weight: oldVar.weight,
                    flavor: oldVar.flavor,
                    variationIndex: i,
                    status: "pending",
                    targetDetails: { ...existing.toObject(), currentVariation: existing.variations[i] },
                    stage: "superadmin",
                });
                await approvalRequest.save();

                await Notification.create({
                    role: ROLES.SUPER_ADMIN,
                    title: `Variation ${field.toUpperCase()} Change`,
                    message: `${field.toUpperCase()} adjustment for ${existing.name} variant ${i}.`,
                    type: "approval",
                    targetLink: `/admin/approvals`
                });

                changeLog.push(`Proposed ${field} change for var ${i} from ${oldVal} to ${newVal} (PENDING)`);
                newVar[field] = oldVal; // Revert for this immediate save
                pendingApproval = true;
              }
          }
        }
      }
      existing.variations = body.variations;
    }
    
    // Apply whatever WAS allowed to change (basically nothing if everything was a change)
    if (body.name) existing.name = body.name;
    if (body.category) existing.category = body.category;
    if (body.brand) existing.brand = body.brand;
    if (body.description) existing.description = body.description;

    await existing.save();

    await logAdminActivity({
      adminEmail: user.email,
      action: "update_product_proposed",
      targetId: existing._id.toString(),
      targetName: existing.name,
      details: changeLog.length > 0 ? changeLog.join(" | ") : "Verified product properties"
    });

    return NextResponse.json({ 
      product: mapDoc(existing),
      pendingApproval,
      message: pendingApproval ? "Changes have been queued for authorization." : "Product verified (No changes detected)."
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
    
    const isAllowed = user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN || user.role === ROLES.OWNER;
    if (!isAllowed) {
        return NextResponse.json({ error: "Restricted: Only privileged roles can delete products." }, { status: 403 });
    }

    const { slug } = await params;
    const deleted = await Product.findOneAndDelete({ slug });
    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

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
