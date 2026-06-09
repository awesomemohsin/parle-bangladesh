import { NextRequest, NextResponse } from "next/server";
import { ProductSchema } from "@/lib/schemas";
import { getVerifiedAuthUser, getEffectiveUserContext, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Product, User, ApprovalRequest, Notification, Category, PromoCode, StockLog } from "@/lib/models";
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

    // Security: Only admins, dealers, and retailers can see respective prices
    const context = await getEffectiveUserContext(_);
    const user = context?.user;
    let showDealerPrice = false;
    let showRetailerPrice = false;
    
    let userFlatDiscountPercent = 0;
    if (user) {
      if ([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR].includes(user.role as any)) {
        showDealerPrice = true;
        showRetailerPrice = true;
      }
      if (user.customerType === "dealer") {
        showDealerPrice = true;
      } else if (user.customerType === "retailer") {
        showRetailerPrice = true;
      }
      
      if (user.flatDiscountPercent && user.flatDiscountExpiresAt && new Date(user.flatDiscountExpiresAt) > new Date()) {
        userFlatDiscountPercent = user.flatDiscountPercent;
      }
    }

    // 1. Fetch all active flat discounts
    const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();

    const sanitizedProduct = { ...product, id: product._id.toString(), _id: undefined };
    
    // 2. Apply flat discounts
    if (sanitizedProduct.variations) {
      sanitizedProduct.variations = sanitizedProduct.variations.map((v: any) => {
        const variation = { ...v };
        
        // Find applicable flat discounts
        const varKey = `${sanitizedProduct.id}:${(variation.weight || '').toString().trim().toLowerCase()}:${(variation.flavor || '').toString().trim().toLowerCase()}`;
        const applicableFlat = flatDiscounts.find(d => 
          d.allProducts || (
            d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === sanitizedProduct.id) && (
              !d.applicableVariations ||
              d.applicableVariations.length === 0 ||
              d.applicableVariations.map((val: string) => val.trim().toLowerCase()).includes(varKey.trim().toLowerCase())
            )
          )
        );

        if (applicableFlat || userFlatDiscountPercent > 0) {
          const originalPrice = Number(
            (showDealerPrice && variation.dealerPrice)
              ? variation.dealerPrice
              : (showRetailerPrice && variation.retailerPrice)
              ? variation.retailerPrice
              : variation.price
          );
          let bestSavings = 0;
          let bestDiscountedPrice = originalPrice;
          let bestDiscountAmount = 0;
          let bestDiscountType = 'fixed';
          let hasAnyDiscount = false;

          // A. Account-specific flat discount candidate
          if (userFlatDiscountPercent > 0) {
            bestSavings = (originalPrice * userFlatDiscountPercent) / 100;
            bestDiscountedPrice = originalPrice - bestSavings;
            bestDiscountAmount = userFlatDiscountPercent;
            bestDiscountType = 'percentage';
            hasAnyDiscount = true;
          }

          // B. Campaign-specific flat discount candidate
          if (applicableFlat) {
            const amount = Number(applicableFlat.discountAmount || 0);
            let currentDiscounted = originalPrice;
            let currentSavings = 0;

            if (applicableFlat.discountType === 'percentage') {
              currentSavings = (originalPrice * amount) / 100;
              currentDiscounted = originalPrice - currentSavings;
            } else {
              currentSavings = amount;
              currentDiscounted = Math.max(0, originalPrice - amount);
            }

            if (currentSavings > bestSavings) {
              bestSavings = currentSavings;
              bestDiscountedPrice = currentDiscounted;
              bestDiscountAmount = amount;
              bestDiscountType = applicableFlat.discountType;
              hasAnyDiscount = true;
            }
          }

          if (hasAnyDiscount) {
            variation.flatDiscountPrice = Math.round(bestDiscountedPrice);
            variation.hasFlatDiscount = true;
            variation.flatDiscountAmount = bestDiscountAmount;
            variation.flatDiscountType = bestDiscountType;
          }
        }

        if (!showDealerPrice) {
          delete variation.dealerPrice;
        }
        if (!showRetailerPrice) {
          delete variation.retailerPrice;
        }
        return variation;
      });
    }

    const pendingApprovals = await ApprovalRequest.find({
      targetId: product._id.toString(),
      status: "pending"
    }).lean();

    const mappedPendingApprovals = pendingApprovals.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      _id: undefined
    }));

    return NextResponse.json({ 
      product: sanitizedProduct,
      pendingApprovals: mappedPendingApprovals
    });
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

    const oldVariations = existingProduct.variations || [];
    const newVariations = body.variations || [];
    const approvalRequestsToCreate: any[] = [];
    const variationsToSave: any[] = [];
    const productChangesToApply: any = {};

    // 1. Check product-level non-sensitive fields: name, description, category, brand
    const productFields = ["name", "description", "category", "brand"];
    for (const field of productFields) {
      if (body[field] !== undefined && String(body[field]) !== String(existingProduct.get(field) || "")) {
        if (isHighLevel) {
          productChangesToApply[field] = body[field];
        } else {
          approvalRequestsToCreate.push({
            type: "product",
            field,
            oldValue: String(existingProduct.get(field) || ""),
            newValue: String(body[field]),
            targetDetails: {
              brand: existingProduct.brand || "Parle",
              category: existingProduct.category
            }
          });
        }
      }
    }

    // 2. Check variation fields
    for (let index = 0; index < newVariations.length; index++) {
      const newV = newVariations[index];
      const oldV = oldVariations[index];

      if (oldV) {
        const variationToSave = { ...newV };

        // Stock Addition (Sensitive) -> ALWAYS goes to approval, regardless of user role
        const isStockAddition = newV.stock !== undefined && Number(newV.stock) > Number(oldV.stock);
        if (isStockAddition) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "stock",
            oldValue: String(oldV.stock || 0),
            newValue: String(newV.stock),
            weight: newV.weight || oldV.weight,
            flavor: newV.flavor || oldV.flavor,
            variationIndex: index,
            targetDetails: {
              brand: existingProduct.brand || "Parle",
              category: existingProduct.category
            }
          });
          variationToSave.stock = oldV.stock; // Hold back sensitive change
        } else if (newV.stock !== undefined && Number(newV.stock) < Number(oldV.stock)) {
          // Stock reduction is non-sensitive
          if (!isHighLevel) {
            approvalRequestsToCreate.push({
              type: "product",
              field: "stock",
              oldValue: String(oldV.stock || 0),
              newValue: String(newV.stock),
              weight: newV.weight || oldV.weight,
              flavor: newV.flavor || oldV.flavor,
              variationIndex: index,
              targetDetails: {
                brand: existingProduct.brand || "Parle",
                category: existingProduct.category
              }
            });
            variationToSave.stock = oldV.stock;
          }
        }

        // Price Change (Sensitive) -> ALWAYS goes to approval, regardless of user role
        const isPriceChange = newV.price !== undefined && Number(newV.price) !== Number(oldV.price);
        if (isPriceChange) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "price",
            oldValue: String(oldV.price || 0),
            newValue: String(newV.price),
            weight: newV.weight || oldV.weight,
            flavor: newV.flavor || oldV.flavor,
            variationIndex: index,
            targetDetails: {
              brand: existingProduct.brand || "Parle",
              category: existingProduct.category
            }
          });
          variationToSave.price = oldV.price; // Hold back sensitive change
        }

        // Dealer Price Change (Sensitive) -> ALWAYS goes to approval, regardless of user role
        const isDealerPriceChange = newV.dealerPrice !== undefined && Number(newV.dealerPrice || 0) !== Number(oldV.dealerPrice || 0);
        if (isDealerPriceChange) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "dealerPrice",
            oldValue: String(oldV.dealerPrice || 0),
            newValue: String(newV.dealerPrice),
            weight: newV.weight || oldV.weight,
            flavor: newV.flavor || oldV.flavor,
            variationIndex: index,
            targetDetails: {
              brand: existingProduct.brand || "Parle",
              category: existingProduct.category
            }
          });
          variationToSave.dealerPrice = oldV.dealerPrice; // Hold back sensitive change
        }

        // Retailer Price Change (Sensitive) -> ALWAYS goes to approval, regardless of user role
        const isRetailerPriceChange = newV.retailerPrice !== undefined && Number(newV.retailerPrice || 0) !== Number(oldV.retailerPrice || 0);
        if (isRetailerPriceChange) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "retailerPrice",
            oldValue: String(oldV.retailerPrice || 0),
            newValue: String(newV.retailerPrice),
            weight: newV.weight || oldV.weight,
            flavor: newV.flavor || oldV.flavor,
            variationIndex: index,
            targetDetails: {
              brand: existingProduct.brand || "Parle",
              category: existingProduct.category
            }
          });
          variationToSave.retailerPrice = oldV.retailerPrice; // Hold back sensitive change
        }

        // Discount Price Change (Sensitive) -> ALWAYS goes to approval, regardless of user role
        const isDiscountPriceChange = newV.discountPrice !== undefined && Number(newV.discountPrice || 0) !== Number(oldV.discountPrice || 0);
        if (isDiscountPriceChange) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "discountPrice",
            oldValue: String(oldV.discountPrice || 0),
            newValue: String(newV.discountPrice),
            weight: newV.weight || oldV.weight,
            flavor: newV.flavor || oldV.flavor,
            variationIndex: index,
            targetDetails: {
              brand: existingProduct.brand || "Parle",
              category: existingProduct.category
            }
          });
          variationToSave.discountPrice = oldV.discountPrice; // Hold back sensitive change
        }

        // Non-sensitive variation fields: weight, flavor, image, isDefault, isBulk
        const nonSensitiveVarFields = ["weight", "flavor", "image", "isDefault", "isBulk"];
        for (const varField of nonSensitiveVarFields) {
          if (newV[varField] !== undefined && String(newV[varField]) !== String(oldV[varField] || "")) {
            if (!isHighLevel) {
              approvalRequestsToCreate.push({
                type: "product",
                field: varField,
                oldValue: String(oldV[varField] || ""),
                newValue: String(newV[varField]),
                weight: newV.weight || oldV.weight,
                flavor: newV.flavor || oldV.flavor,
                variationIndex: index,
                targetDetails: {
                  brand: existingProduct.brand || "Parle",
                  category: existingProduct.category
                }
              });
              variationToSave[varField] = oldV[varField];
            }
          }
        }

        variationsToSave.push(variationToSave);
      } else {
        // Brand new variation added!
        const variationToSave = { 
          ...newV, 
          stock: 0, 
          price: 0, 
          dealerPrice: 0, 
          retailerPrice: 0,
          discountPrice: 0 
        };

        if (!isHighLevel) {
          variationToSave.weight = "";
          variationToSave.flavor = "";
          variationToSave.image = "";
          
          if (newV.weight) {
            approvalRequestsToCreate.push({
              type: "product",
              field: "weight",
              oldValue: "",
              newValue: String(newV.weight),
              variationIndex: index,
              targetDetails: { brand: existingProduct.brand || "Parle", category: existingProduct.category }
            });
          }
          if (newV.flavor) {
            approvalRequestsToCreate.push({
              type: "product",
              field: "flavor",
              oldValue: "",
              newValue: String(newV.flavor),
              variationIndex: index,
              targetDetails: { brand: existingProduct.brand || "Parle", category: existingProduct.category }
            });
          }
          if (newV.image) {
            approvalRequestsToCreate.push({
              type: "product",
              field: "image",
              oldValue: "",
              newValue: String(newV.image),
              variationIndex: index,
              targetDetails: { brand: existingProduct.brand || "Parle", category: existingProduct.category }
            });
          }
        }

        // Sensitive fields require approval for EVERYONE
        if (newV.price !== undefined && Number(newV.price) > 0) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "price",
            oldValue: "0",
            newValue: String(newV.price),
            weight: newV.weight,
            flavor: newV.flavor,
            variationIndex: index,
            targetDetails: { brand: existingProduct.brand || "Parle", category: existingProduct.category }
          });
        }
        
        if (newV.stock !== undefined && Number(newV.stock) > 0) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "stock",
            oldValue: "0",
            newValue: String(newV.stock),
            weight: newV.weight,
            flavor: newV.flavor,
            variationIndex: index,
            targetDetails: { brand: existingProduct.brand || "Parle", category: existingProduct.category }
          });
        }

        if (newV.dealerPrice !== undefined && Number(newV.dealerPrice) > 0) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "dealerPrice",
            oldValue: "0",
            newValue: String(newV.dealerPrice),
            weight: newV.weight,
            flavor: newV.flavor,
            variationIndex: index,
            targetDetails: { brand: existingProduct.brand || "Parle", category: existingProduct.category }
          });
        }

        if (newV.retailerPrice !== undefined && Number(newV.retailerPrice) > 0) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "retailerPrice",
            oldValue: "0",
            newValue: String(newV.retailerPrice),
            weight: newV.weight,
            flavor: newV.flavor,
            variationIndex: index,
            targetDetails: { brand: existingProduct.brand || "Parle", category: existingProduct.category }
          });
        }

        if (newV.discountPrice !== undefined && Number(newV.discountPrice) > 0) {
          approvalRequestsToCreate.push({
            type: "product",
            field: "discountPrice",
            oldValue: "0",
            newValue: String(newV.discountPrice),
            weight: newV.weight,
            flavor: newV.flavor,
            variationIndex: index,
            targetDetails: { brand: existingProduct.brand || "Parle", category: existingProduct.category }
          });
        }

        variationsToSave.push(variationToSave);
      }
    }

    // Apply direct non-sensitive updates for Super Admins / Owners
    if (isHighLevel) {
      if (Object.keys(productChangesToApply).length > 0) {
        Object.assign(existingProduct, productChangesToApply);
      }
      existingProduct.variations = variationsToSave;
      await existingProduct.save();

      await logAdminActivity({
        adminEmail: user.email,
        action: "update_product_direct",
        targetId: existingProduct._id.toString(),
        targetName: existingProduct.name,
        details: `Directly updated non-sensitive fields of product: ${existingProduct.name}`
      });
    }

    // Save and queue all approval requests
    if (approvalRequestsToCreate.length > 0) {
      const savedRequests = await Promise.all(
        approvalRequestsToCreate.map((req) => {
          const approvalRequest = new ApprovalRequest({
            requesterEmail: user.email,
            type: req.type,
            targetId: existingProduct._id.toString(),
            targetName: existingProduct.name,
            targetSlug: existingProduct.slug,
            field: req.field,
            oldValue: req.oldValue,
            newValue: req.newValue,
            weight: req.weight,
            flavor: req.flavor,
            variationIndex: req.variationIndex,
            targetDetails: req.targetDetails,
            stage: "superadmin"
          });
          return approvalRequest.save();
        })
      );

      // Create a notification target
      await Notification.create({
        title: "Sensitive Updates Queued",
        message: `${user.name} queued ${approvalRequestsToCreate.length} sensitive updates (Price/Stock) for ${existingProduct.name}`,
        type: "approval",
        targetLink: `/admin/approvals`
      });

      // Send Telegram consensus updates
      try {
        for (const req of savedRequests) {
          await notifyNewApprovalRequest(req.toObject());
        }
      } catch (tgError) {
        console.error("Telegram notification failed for sensitive approval requests:", tgError);
      }
    }

    const hasPending = approvalRequestsToCreate.length > 0;
    return NextResponse.json({
      product: existingProduct,
      pendingApproval: hasPending
    });

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
