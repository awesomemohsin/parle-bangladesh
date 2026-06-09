import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { ApprovalRequest, Product, Order, Category, Notification, PromoCode, StockLog } from "@/lib/models";
import { notifyOwnerApprovalRequired, notifyApprovalFinalized, notifyOrderReady, notifyCriticalEvent } from "@/lib/telegram";
import { logAdminActivity } from "@/lib/activity";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status, comment } = body; // 'approved' or 'declined'

    if (!['approved', 'declined'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const approvalRequest = await ApprovalRequest.findById(id);
    if (!approvalRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (approvalRequest.status !== 'pending') {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    const userName = (user.name || user.email || "Unknown").toLowerCase();
    const isAnindo = userName.includes("anindo");
    const isSaiful = userName.includes("saiful");
    const isRazu = userName.includes("razu");

    // Decline logic - If anyone declines, it's final
    if (status === 'declined') {
      approvalRequest.status = 'declined';
      approvalRequest.declinedBy = user.name || user.email;
      if (comment) {
        if (!approvalRequest.comments) approvalRequest.comments = [];
        approvalRequest.comments.push({ user: userName, text: comment, date: new Date() });
      }
      await approvalRequest.save();

      // Notify Requester (Admin) of the decline
      await Notification.create({
        userId: approvalRequest.requesterEmail,
        title: "Request Declined",
        message: `Your change request for ${approvalRequest.targetName} was declined during the ${approvalRequest.stage === 'superadmin' ? 'Initial' : 'Final'} Verification Phase${comment ? `. Reason: ${comment}` : ""}.`,
        type: "alert",
        targetLink: `/admin/products`
      });
      
      // Log audit
      await logAdminActivity({
        adminEmail: user.email,
        action: `decline_request`,
        targetId: approvalRequest.targetId,
        targetName: approvalRequest.targetName,
        details: `${approvalRequest.type} ${approvalRequest.field} change from ${approvalRequest.oldValue} to ${approvalRequest.newValue} was DECLINED during ${approvalRequest.stage === 'superadmin' ? 'Superadmin' : 'Final Authorized'} review by ${userName}.`
      });

      // Notify via Telegram
      await notifyApprovalFinalized(approvalRequest);

      // If it's a promo code, also update the promo code status
      if (approvalRequest.type === 'promo-code') {
        await PromoCode.findByIdAndUpdate(approvalRequest.targetId, { status: 'declined', isActive: false });
      }

      return NextResponse.json({ message: "Request declined successfully", request: approvalRequest });
    }

    // Approval logic
    if (status === 'approved') {
      if (isAnindo || isSaiful) {
        // Stage 1: Superadmin
        if (approvalRequest.stage !== 'superadmin') {
           return NextResponse.json({ error: "Superadmin approval already complete" }, { status: 400 });
        }
        
        if (approvalRequest.superadminApprovals.some((a: string) => a.toLowerCase().includes(userName))) {
           return NextResponse.json({ error: "You already approved this request" }, { status: 400 });
        }

        approvalRequest.superadminApprovals.push(userName);
        
        const superApprovals = approvalRequest.superadminApprovals.map((a: string) => a.toLowerCase());
        const hasAnindo = superApprovals.some((a: string) => a.includes("anindo"));
        const hasSaiful = superApprovals.some((a: string) => a.includes("saiful"));
        
        // Retailer / Dealer promotions and retailer probation approvals only require a single Superadmin approval.
        const isB2BPromotion = approvalRequest.type === 'customer' && (
          approvalRequest.field === 'isRetailerApproved' ||
          (approvalRequest.field === 'customerType' && 
           approvalRequest.newValue && 
           ['retailer', 'dealer'].includes(approvalRequest.newValue.toLowerCase()))
        );

        const isConsensusReached = isB2BPromotion 
          ? (hasAnindo || hasSaiful) 
          : (hasAnindo && hasSaiful);
        
        if (isConsensusReached) {
          // CHECK IF THIS IS A 2-STAGE OR 3-STAGE REQUEST
          const isFinancialOrStock = ['price', 'dealerPrice', 'retailerPrice', 'stock', 'discountPrice'].includes(approvalRequest.field) || approvalRequest.type === 'order';
          
          if (!isFinancialOrStock) {
            // BASIC CONTENT: 2nd SuperAdmin is Final
            approvalRequest.status = 'approved';
            
             let notificationTitle = "Update Approved (Live)";
             let notificationMessage = `Your catalog update for ${approvalRequest.targetName} has been approved by consensus and is now LIVE.`;
             let notificationLink = `/admin/products`;

             if (approvalRequest.type === "customer") {
               notificationTitle = "Customer Promotion Approved";
               notificationMessage = `Customer ${approvalRequest.targetName} has been successfully promoted to ${approvalRequest.newValue} by consensus.`;
               notificationLink = `/admin/customers`;
             }

             // Notify Requester (Admin)
             await Notification.create({
               userId: approvalRequest.requesterEmail,
               title: notificationTitle,
               message: notificationMessage,
               type: "system",
               targetLink: notificationLink
             });
            
            await applyApprovedChanges(approvalRequest, userName, comment);
            await notifyApprovalFinalized(approvalRequest);
          } else {
            // PRICE OR STOCK: 3-STAGE (Needs Owner after 2 Superadmins)
            approvalRequest.stage = "owner";
            await Notification.create({
              role: ROLES.OWNER,
              title: "Authorization Required",
              message: `A sensitive change (${approvalRequest.field}) for ${approvalRequest.targetName} requires your final signature.`,
              type: "approval",
              targetLink: `/admin/approvals`
            });

            // Trigger Telegram to Owner
            await notifyOwnerApprovalRequired(approvalRequest);
          }
        }

        if (comment) {
          if (!approvalRequest.comments) approvalRequest.comments = [];
          approvalRequest.comments.push({ user: userName, text: comment, date: new Date() });
        }
      } else if (isRazu) {
        // Stage 2: Owner
        if (approvalRequest.stage === 'superadmin') {
          return NextResponse.json({ error: "Waiting for Superadmin (Anindo & Saiful) approval first" }, { status: 400 });
        }
        
        approvalRequest.ownerApproved = true;
        approvalRequest.status = 'approved';

        if (comment) {
          if (!approvalRequest.comments) approvalRequest.comments = [];
          approvalRequest.comments.push({ user: userName, text: comment, date: new Date() });
        }

        // Notify Requester (Admin)
        await Notification.create({
          userId: approvalRequest.requesterEmail,
          title: "Request Approved (Final)",
          message: `Your sensitive change for ${approvalRequest.targetName} has been fully approved by Anindo, Saiful, and Mahbub Alam Razu.`,
          type: "system",
          targetLink: `/admin/products`
        });

        await applyApprovedChanges(approvalRequest, userName, comment);
        await notifyApprovalFinalized(approvalRequest);
      } else {
        return NextResponse.json({ error: "Forbidden: You are not authorized for consensus approval" }, { status: 403 });
      }

      await approvalRequest.save();

      // Log audit
      await logAdminActivity({
        adminEmail: user.email,
        action: `approve_request_stage`,
        targetId: approvalRequest.targetId,
        targetName: approvalRequest.targetName,
        details: `${approvalRequest.type} ${approvalRequest.field} update approved during ${approvalRequest.stage === 'superadmin' ? 'Initial' : 'Final Authoritative'} review by ${userName}. Status: ${approvalRequest.status}`
      });

      return NextResponse.json({ message: "Approval recorded successfully", request: approvalRequest });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Approval process error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function applyApprovedChanges(approvalRequest: any, userName: string, comment?: string) {
  if (approvalRequest.type === 'product') {
    const product = await Product.findById(approvalRequest.targetId);
    if (!product) {
      console.error(`ApplyChanges: Product ${approvalRequest.targetId} not found`);
      return;
    }

    const field = approvalRequest.field;
    const newValue = approvalRequest.newValue;
    const isNumeric = field === 'price' || field === 'dealerPrice' || field === 'retailerPrice' || field === 'stock' || field === 'discountPrice';

    if (approvalRequest.variationIndex !== undefined && approvalRequest.variationIndex !== null) {
      const varIndex = Number(approvalRequest.variationIndex);
      const variation = product.variations[varIndex];
      
      if (variation) {
        // Special logic for stock history
        if (field === 'stock') {
          const oldVal = Number(approvalRequest.oldValue || 0);
          const newValNumeric = Number(newValue);
          if (newValNumeric > oldVal) {
            if (!variation.stockHistory) variation.stockHistory = [];
            variation.stockHistory.push({
              amount: newValNumeric - oldVal,
              date: new Date(),
              reason: "Inventory Replenishment (Approved)"
            });
          }
          
          await StockLog.create({
            productId: product._id,
            productName: product.name,
            variationIndex: varIndex,
            weight: variation.weight,
            flavor: variation.flavor,
            oldStock: oldVal,
            newStock: newValNumeric,
            amount: newValNumeric - oldVal,
            reason: newValNumeric > oldVal ? "Inventory Replenishment (Approved)" : "Manual Stock Adjustment (Approved)",
            adminEmail: approvalRequest.requesterEmail,
          });
        }
        
        // Use Database .set() for deep path reliability
        const typedVal = isNumeric ? Number(newValue) : newValue;
        variation.set(field, typedVal);
        product.markModified('variations');
      }
    } else {
      // Apply change to product level
      const typedVal = isNumeric ? Number(newValue) : newValue;
      product.set(field, typedVal);
    }
    
    await product.save();
    // Changes applied successfully
  } else if (approvalRequest.type === 'category') {
    const category = await Category.findById(approvalRequest.targetId);
    if (category) {
      category.set(approvalRequest.field, approvalRequest.newValue);
      await category.save();
    }
  } else if (approvalRequest.type === 'order') {
    const order = await Order.findById(approvalRequest.targetId);
    if (order && approvalRequest.field === 'status') {
      const oldStatus = order.status;
      const newStatus = approvalRequest.newValue;
      order.status = newStatus;

      const activeDuesStatuses = ["processing", "shipped", "delivered"];
      const wasActiveDues = activeDuesStatuses.includes(oldStatus);
      const isActiveDues = activeDuesStatuses.includes(newStatus);
      if (!isActiveDues && wasActiveDues) {
        order.amountPaid = 0;
        order.amountDue = 0;
        order.paymentStatus = "pending";
      }

      if (!order.orderLogs) order.orderLogs = [];
      order.orderLogs.push({
        fromStatus: oldStatus,
        toStatus: newStatus as any,
        changedBy: `System (Approved: ${userName})`,
        reason: `Final consensus approval reached.`,
        changedAt: new Date(),
      });
      await order.save();

      if (order.userId) {
        const { reconcileUserLedger } = await import("@/lib/ledger");
        await reconcileUserLedger(order.userId.toString());
      }

      // Adjust stock and log it upon approval of lost/damaged statuses
      const restorableStatuses = ["cancelled", "damaged", "lost"];
      if (restorableStatuses.includes(newStatus) && !restorableStatuses.includes(oldStatus)) {
        for (const item of order.items) {
          if (item.productId) {
            const product = await Product.findById(item.productId);
            if (product && product.variations) {
              const varIndex = product.variations.findIndex((v: any) => {
                const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
                const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
                return weightMatch && flavorMatch;
              });
              
              if (varIndex !== -1) {
                const variation = product.variations[varIndex];
                const holdField = `variations.${varIndex}.holdStock`;
                const stockField = `variations.${varIndex}.stock`;
                const lostField = `variations.${varIndex}.lostCount`;
                const damagedField = `variations.${varIndex}.damagedCount`;

                const update: any = { $inc: {} };
                
                // Remove from hold anyway
                update.$inc[holdField] = -item.quantity;

                if (newStatus === "cancelled") {
                  // Return to stock
                  update.$inc[stockField] = item.quantity;

                  await StockLog.create({
                    productId: product._id,
                    productName: product.name,
                    variationIndex: varIndex,
                    weight: item.weight,
                    flavor: item.flavor,
                    oldStock: variation.stock || 0,
                    newStock: (variation.stock || 0) + item.quantity,
                    amount: item.quantity,
                    reason: `Order Cancelled - Order #${order._id.toString().slice(-8).toUpperCase()}`,
                    adminEmail: approvalRequest.requesterEmail,
                  });
                } else if (newStatus === "lost") {
                  update.$inc[lostField] = item.quantity;

                  await StockLog.create({
                    productId: product._id,
                    productName: product.name,
                    variationIndex: varIndex,
                    weight: item.weight,
                    flavor: item.flavor,
                    oldStock: variation.stock || 0,
                    newStock: variation.stock || 0,
                    amount: -item.quantity,
                    reason: `Order Lost - Approved consensus - Order #${order._id.toString().slice(-8).toUpperCase()}`,
                    adminEmail: approvalRequest.requesterEmail,
                  });
                } else if (newStatus === "damaged") {
                  update.$inc[damagedField] = item.quantity;

                  await StockLog.create({
                    productId: product._id,
                    productName: product.name,
                    variationIndex: varIndex,
                    weight: item.weight,
                    flavor: item.flavor,
                    oldStock: variation.stock || 0,
                    newStock: variation.stock || 0,
                    amount: -item.quantity,
                    reason: `Order Damaged - Approved consensus - Order #${order._id.toString().slice(-8).toUpperCase()}`,
                    adminEmail: approvalRequest.requesterEmail,
                  });
                }

                await Product.updateOne({ _id: product._id }, update);
              }
            }
          }
        }
      }

      // Telegram Notifications
      try {
        if (newStatus === ORDER_STATUS.PROCESSING && oldStatus === ORDER_STATUS.PENDING) {
          await notifyOrderReady(order);
        } else if (["cancelled", "damaged", "lost"].includes(newStatus) && oldStatus !== newStatus) {
          await notifyCriticalEvent(`Order ${newStatus}`, order, "Approved change");
        }
      } catch (notifyError) {
        console.error("Failed to send status update notification from approval:", notifyError);
      }
    }
  } else if (approvalRequest.type === 'promo-code') {
    const promoCode = await PromoCode.findById(approvalRequest.targetId);
    if (promoCode) {
      // If it's an update, apply the changes from targetDetails
      if (approvalRequest.field === 'update' && approvalRequest.targetDetails) {
        const details = approvalRequest.targetDetails;
        if (details.code) promoCode.code = details.code.toUpperCase();
        if (details.type) promoCode.type = details.type;
        if (details.discountType) promoCode.discountType = details.discountType;
        if (details.discountAmount) promoCode.discountAmount = details.discountAmount;
        if (details.maxUsage) promoCode.maxUsage = details.maxUsage;
        if (details.minOrderAmount !== undefined) promoCode.minOrderAmount = details.minOrderAmount;
        if (details.maxDiscountAmount !== undefined) promoCode.maxDiscountAmount = details.maxDiscountAmount;
        if (details.expiresAt) {
          promoCode.expiresAt = new Date(details.expiresAt);
        } else {
          promoCode.expiresAt = undefined;
        }
        
        promoCode.allProducts = details.allProducts !== undefined ? details.allProducts : promoCode.allProducts;
        promoCode.applicableProducts = details.applicableProducts || promoCode.applicableProducts;
        promoCode.applicableVariations = details.applicableVariations || promoCode.applicableVariations;

        if (details.freeShipping !== undefined) promoCode.freeShipping = details.freeShipping;
      }
      
      promoCode.status = 'approved';
      promoCode.isActive = true;
      await promoCode.save();
    }
  } else if (approvalRequest.type === 'customer') {
    const { User } = await import("@/lib/models");
    const customer = await User.findById(approvalRequest.targetId);
    if (customer && approvalRequest.targetDetails) {
      const details = approvalRequest.targetDetails;
      if (approvalRequest.field === 'customerType') {
        customer.customerType = details.customerType;
        customer.flatDiscountPercent = details.flatDiscountPercent;
        customer.flatDiscountExpiresAt = details.flatDiscountExpiresAt ? new Date(details.flatDiscountExpiresAt) : undefined;
        // Automatically approve and set unlimited credit limit for B2B roles
        if (details.customerType === "retailer" || details.customerType === "dealer") {
          customer.isRetailerApproved = true;
          customer.creditLimit = 999999999;
        }
      } else if (approvalRequest.field === 'isRetailerApproved') {
        customer.isRetailerApproved = details.isRetailerApproved;
        customer.creditLimit = 999999999; // Set approved B2B credit limit to unlimited
      }
      await customer.save();
    }
  }
}
