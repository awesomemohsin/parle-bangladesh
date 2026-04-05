import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, Product, Customer, PromoCode } from "@/lib/models";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q") || "";
    const statusQuery = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // 1. Initial Match (Security + Status)
    let matchStage: any = {};
    if (!hasAnyRole(user, [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR])) {
      matchStage = { 
        $or: [
          { userId: user.id },
          { customerEmail: user.email }
        ]
      };
    }

    if (statusQuery !== "all") {
      matchStage.status = statusQuery;
    }

    // Get total count (using a separate query for simplicity and speed on large datasets)
    const total = await Order.countDocuments(matchStage);

    // Pipeline
    const pipeline: any[] = [
      { $match: matchStage },
      // Create string version of _id to allow partial regex search
      {
        $addFields: {
          idString: { $toString: "$_id" }
        }
      }
    ];

    // 2. Search Stage
    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");
      pipeline.push({
        $match: {
          $or: [
            { idString: searchRegex },
            { customerName: searchRegex },
            { customerEmail: searchRegex },
            { customerPhone: searchRegex },
            { "items.name": searchRegex }
          ]
        }
      });
    }

    // 3. Sort & Pagination Stage
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const ordersRaw = await Order.aggregate(pipeline);

    // Fetch all pending order approvals to mark them in the list
    const { ApprovalRequest } = require("@/lib/models");
    const pendingRequests = await ApprovalRequest.find({ 
      type: "order", 
      status: "pending" 
    }).lean();

    const pendingIds = new Set(pendingRequests.map((r: any) => r.targetId));
    
    return NextResponse.json({ 
      orders: ordersRaw.map(o => { 
        o.id = o._id.toString(); 
        o.pendingApproval = pendingIds.has(o.id);
        delete o.idString; 
        return o; 
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const rawItems = Array.isArray(body.items) ? body.items : [];
    
    // Normalize resolving missing price/name from MongoDB
    const items = [];
    for (const item of rawItems) {
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) continue;

      let validItem: any = null;
      if (item.productSlug) {
        const product = await Product.findOne({ slug: item.productSlug });
        if (product) {
          validItem = {
            productId: product._id.toString(),
            productSlug: product.slug,
            name: product.name,
            quantity,
            price: item.price !== undefined ? Number(item.price) : product.price,
            weight: item.weight,
            flavor: item.flavor,
            image: item.image || product.image,
          };
        }
      }
      if (!validItem && item.name && item.price !== undefined) {
          validItem = {
            productId: item.productId,
            productSlug: item.productSlug,
            name: item.name,
            quantity,
            price: Number(item.price),
            weight: item.weight,
            flavor: item.flavor,
            image: item.image,
          };
      }
      
      if (validItem) items.push(validItem);
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Order requires at least one valid item" }, { status: 400 });
    }

    const billingAddress = body.billingAddress || {};
    const shippingAddress = body.shippingAddress || {};
    const instruction = body.instruction || "";

    const customerName = body.customerName || billingAddress.name;
    const customerEmail = (body.customerEmail || body.email || billingAddress.email || "").toLowerCase().trim();
    const customerPhone = body.customerPhone || body.phone || billingAddress.phone;
    const address = body.address || billingAddress.address;
    const city = body.city || billingAddress.city;
    const postalCode = body.postalCode || billingAddress.postalCode;

    const reqShippingAddress = shippingAddress.address || address;
    const reqShippingCity = shippingAddress.city || city;
    const reqShippingPostalCode = shippingAddress.postalCode || postalCode;

    const missing = [];
    if (!customerName) missing.push("Name");
    if (!customerEmail) missing.push("Email");
    if (!customerPhone) missing.push("Phone");
    if (!address) missing.push("Billing Address");
    if (!city) missing.push("Billing City");
    if (!postalCode) missing.push("Billing Postal Code");

    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing billing information: ${missing.join(", ")}` }, { status: 400 });
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = subtotal >= 1000 ? 0 : 80;
    const tax = 0;
    const discountAmount = Number(body.discountAmount || 0);
    const total = subtotal + shippingCost - discountAmount;
    const taxRate = 0;

    const user = getAuthUserFromRequest(request);

    // If guest (no user.id), upsert into Customer collection
    if (!user) {
      try {
        await Customer.findOneAndUpdate(
          { email: customerEmail },
          { 
            name: customerName, 
            mobile: customerPhone,
            email: customerEmail,
            role: "customer" 
          },
          { upsert: true, new: true }
        );
      } catch (upsertErr) {
        console.error("Guest customer upsert error:", upsertErr);
      }
    }

    const order = new Order({
      userId: user ? user.id : undefined,
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      postalCode,
      shippingAddress: reqShippingAddress,
      shippingCity: reqShippingCity,
      shippingPostalCode: reqShippingPostalCode,
      instruction,
      paymentMethod: body.paymentMethod || "cash_on_delivery",
      items,
      subtotal,
      shippingCost,
      tax,
      discountAmount,
      promoCode: body.promoCode,
      total,
      status: ORDER_STATUS.PENDING,
    });

    await order.save();

    // Increment ordersCount for each product
    for (const item of items) {
      if (item.productSlug) {
        await Product.findOneAndUpdate(
          { slug: item.productSlug },
          { $inc: { ordersCount: item.quantity } }
        );
      }
    }

    if (body.promoCode) {
      await PromoCode.findOneAndUpdate(
        { code: body.promoCode.toUpperCase() },
        { $inc: { currentUsage: 1 } }
      );
    }

    const mappedOrder = order.toObject();
    mappedOrder.id = mappedOrder._id.toString();
    delete mappedOrder._id;
    delete mappedOrder.__v;
    
    return NextResponse.json(mappedOrder, { status: 201 });
  } catch (error) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
