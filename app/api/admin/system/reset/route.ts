import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Order, Cart, Notification, AdminActivity, ContactSubmission, ApprovalRequest, User } from '@/lib/models';

import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(req);
    
    // Only OWNER can perform a full system reset
    if (!user || !hasAnyRole(user, [ROLES.OWNER])) {
      return NextResponse.json({ error: 'Forbidden. Owner Authorization Level 5 Required.' }, { status: 403 });
    }

    // ⚠️ CRITICAL OPERATION: Wiping operational data
    const results = await Promise.allSettled([
      Order.deleteMany({}),
      Cart.deleteMany({}),
      Notification.deleteMany({}),
      AdminActivity.deleteMany({}),
      ContactSubmission.deleteMany({}),
      ApprovalRequest.deleteMany({})
    ]);

    // Track this reset as an activity if needed, but avoid large logs
    return NextResponse.json({ 
      success: true, 
      message: 'All operational data (Orders, Carts, Notifications, Activities, Contacts, and Approvals) has been permanently cleared from the database.',
      details: results.map((r, i) => ({
        collection: ['Orders', 'Carts', 'Notifications', 'AdminActivities', 'ContactSubmissions', 'ApprovalRequests'][i],
        status: r.status
      }))
    });
  } catch (error: any) {
    console.error('Reset Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
