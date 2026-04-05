import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { ApprovalRequest, Product, Order } from "@/lib/models";
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
      const { Notification } = require("@/lib/models");
      await Notification.create({
        userId: approvalRequest.requesterEmail, // We use email as userId here for simplistic routing
        title: "Request Declined",
        message: `Your change request for ${approvalRequest.targetName} was declined by Stage ${approvalRequest.stage.toUpperCase()}${comment ? `. Reason: ${comment}` : ""}.`,
        type: "alert",
        targetLink: `/admin/products`
      });
      
      // Log audit
      await logAdminActivity({
        adminEmail: user.email,
        action: `decline_request`,
        targetId: approvalRequest.targetId,
        targetName: approvalRequest.targetName,
        details: `Stage ${approvalRequest.stage.toUpperCase()}: ${approvalRequest.type} ${approvalRequest.field} change from ${approvalRequest.oldValue} to ${approvalRequest.newValue} was DECLINED by ${userName}.`
      });

      return NextResponse.json({ message: "Request declined successfully", request: approvalRequest });
    }

    // Approval logic
    if (status === 'approved') {
      if (isAnindo || isSaiful) {
        // Stage 1: Superadmin
        if (approvalRequest.stage !== 'superadmin') {
           return NextResponse.json({ error: "Superadmin approval already complete" }, { status: 400 });
        }
        
        // Don't allow double approval from same person
        if (approvalRequest.superadminApprovals.some((a: string) => a.toLowerCase().includes(userName))) {
           return NextResponse.json({ error: "You already approved this request" }, { status: 400 });
        }

        approvalRequest.superadminApprovals.push(userName);
        
        // If BOTH have approved, move to next stage
        const hasAnindo = approvalRequest.superadminApprovals.some((a: string) => a.includes("anindo"));
        const hasSaiful = approvalRequest.superadminApprovals.some((a: string) => a.includes("saiful"));
        
        if (hasAnindo && hasSaiful) {
          approvalRequest.stage = "owner";
          
          // MISSION CRITICAL: Notify Owner only when superadmin vetting is complete
          const { Notification } = require("@/lib/models");
          await Notification.create({
            role: ROLES.OWNER,
            title: "Authorization Required",
            message: `A change request for ${approvalRequest.targetName} has been fully vetted by Anindo & Saiful. Your final signature is required.`,
            type: "approval",
            targetLink: `/admin/approvals`
          });
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

        // Notify Requester (Admin) of final success
        const { Notification } = require("@/lib/models");
        await Notification.create({
          userId: approvalRequest.requesterEmail,
          title: "Request Processed (FINAL)",
          message: `Your change for ${approvalRequest.targetName} has been fully approved by Anindo, Saiful, and Razu. Changes are now LIVE.`,
          type: "system",
          targetLink: `/admin/products`
        });

        // --- APPLY CHANGES ---
        if (approvalRequest.type === 'product') {
          const product = await Product.findById(approvalRequest.targetId);
          if (product) {
            if (approvalRequest.field === 'price' || approvalRequest.field === 'stock') {
              if (approvalRequest.variationIndex !== undefined) {
                const varIndex = Number(approvalRequest.variationIndex);
                if (product.variations[varIndex]) {
                  if (approvalRequest.field === 'price') product.variations[varIndex].price = Number(approvalRequest.newValue);
                  if (approvalRequest.field === 'stock') product.variations[varIndex].stock = Number(approvalRequest.newValue);
                }
              } else {
                (product as any)[approvalRequest.field] = Number(approvalRequest.newValue);
              }
              await product.save();
            }
          }
        } else if (approvalRequest.type === 'order') {
          const order = await Order.findById(approvalRequest.targetId);
          if (order) {
            if (approvalRequest.field === 'status') {
              const oldStatus = order.status;
              const newStatus = approvalRequest.newValue;
              order.status = newStatus;
              if (!order.orderLogs) order.orderLogs = [];
              order.orderLogs.push({
                fromStatus: oldStatus,
                toStatus: newStatus as any,
                changedBy: `Consensus Approved: ${userName} (FINAL)`,
                reason: `Requested by ${approvalRequest.requesterEmail}${comment ? `. Owner Comment: ${comment}` : ""}`,
                changedAt: new Date(),
              });
              await order.save();
            }
          }
        }
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
        details: `Stage ${approvalRequest.stage.toUpperCase()}: ${approvalRequest.type} ${approvalRequest.field} change approved by ${userName}. Status: ${approvalRequest.status}`
      });

      return NextResponse.json({ message: "Approval recorded successfully", request: approvalRequest });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Approval process error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
