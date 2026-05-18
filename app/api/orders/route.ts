import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUser, hasAnyRole, getAuthUserFromRequest } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, Product, Customer, PromoCode, ApprovalRequest, StockLog, User } from "@/lib/models";
import mongoose from "mongoose";
import { notifyNewOrder } from "@/lib/telegram";
import { calculateServerSideCart } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q") || "";
    const statusQuery = searchParams.get("status") || "all";
    const adminContext = searchParams.get("adminContext") === "true"; 
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const startDateQuery = searchParams.get("startDate");
    const endDateQuery = searchParams.get("endDate");

    const productIdQuery = searchParams.get("productId");
    const productSlugQuery = searchParams.get("productSlug");
    const weightQuery = searchParams.get("weight");
    const flavorQuery = searchParams.get("flavor");

    // 1. Initial Match (Security + Context)
    let matchStage: any = {};

    if (productIdQuery || productSlugQuery) {
      const itemMatch: any = productIdQuery ? { productId: productIdQuery } : { productSlug: productSlugQuery };
      if (weightQuery) itemMatch.weight = weightQuery;
      if (flavorQuery) itemMatch.flavor = flavorQuery;
      matchStage.items = { $elemMatch: itemMatch };
    }
    
    // If not admin context OR not an admin role, force identity filter
    const privilegedUser = hasAnyRole(user, [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR]);
    
    if (!adminContext || !privilegedUser) {
      matchStage = { 
        ...matchStage,
        $or: [
          { userId: user.id },
          { customerEmail: user.email }
        ]
      };
    } else {
      // Role-based filtering for moderators
      if (user.role === ROLES.MODERATOR) {
        // Moderators cannot see pending orders
        if (statusQuery === "all") {
          matchStage.status = { $ne: ORDER_STATUS.PENDING };
        } else if (statusQuery === "pending") {
          // Explicitly block searching for pending
          matchStage.status = "NONE_ALLOWED";
        } else {
          // Support multiple statuses
          const statuses = statusQuery.split(",");
          if (statuses.length > 1) {
            matchStage.status = { $in: statuses };
          } else {
            matchStage.status = statusQuery;
          }
        }
      } else if (statusQuery !== "all") {
        const statuses = statusQuery.split(",");
        if (statuses.length > 1) {
          matchStage.status = { $in: statuses };
        } else {
          matchStage.status = statusQuery;
        }
      }
    }

    // Apply date range filtering
    if (startDateQuery || endDateQuery) {
      matchStage.createdAt = {};
      if (startDateQuery) {
        matchStage.createdAt.$gte = new Date(startDateQuery);
      }
      if (endDateQuery) {
        const end = new Date(endDateQuery);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = end;
      }
    }

    // Auto-cancel unpaid online orders older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await Order.updateMany(
      {
        paymentMethod: "sslcommerz",
        paymentStatus: { $ne: "paid" },
        status: { $nin: ["cancelled", "lost", "damaged", "delivered"] },
        createdAt: { $lt: thirtyMinutesAgo }
      },
      {
        $set: { 
          status: "cancelled", 
          cancelReason: "Not paid in 30 minutes",
          statusReason: "Payment timeout: Unpaid order cancelled automatically after 30 minutes." 
        }
      }
    );

    // Get total count
    const total = await Order.countDocuments(matchStage);

    // Pipeline
    const pipeline: any[] = [
      { $match: matchStage },
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

    const sortQuery = searchParams.get("sort") || "newest";

    // 3. Sort & Pagination Stage
    let sortStage: any = { createdAt: -1 };
    if (sortQuery === "oldest") sortStage = { createdAt: 1 };
    else if (sortQuery === "total-high") sortStage = { total: -1 };
    else if (sortQuery === "total-low") sortStage = { total: 1 };

    pipeline.push({ $sort: sortStage });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const ordersRaw = await Order.aggregate(pipeline);

    // Fetch all pending order approvals
    const pendingRequests = await ApprovalRequest.find({ 
      type: "order", 
      status: "pending" 
    }).lean();

    const pendingIds = new Set(pendingRequests.map((r: any) => r.targetId));
    
    return NextResponse.json({ 
      orders: ordersRaw.map(o => { 
        o.id = o._id.toString(); 
        o.pendingApproval = pendingIds.has(o.id);
        if (!o.customerType) o.customerType = "retailer";
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
  } catch (error: any) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const rawItems = Array.isArray(body.items) ? body.items : [];
    
    // Securely calculate prices on the server based on user role
    // DEEP VERIFICATION: Checks tokenVersion and ensures user isn't stale
    const token = await import("@/lib/api-auth").then(m => m.getTokenFromRequest(request));
    const user = await getVerifiedAuthUser(request);

    // If token was provided but verification failed (e.g. role demoted), force re-login
    if (token && !user) {
      return NextResponse.json({ error: "Session expired or role updated. Please login again." }, { status: 401 });
    }
    
    let isDealer = false;
    let userDiscount = undefined;
    let customerTypeStr = "retailer";

    if (user) {
      const dbUser = await User.findById(user.id).select("customerType flatDiscountPercent flatDiscountExpiresAt").lean() as any;
      if (dbUser) {
        isDealer = dbUser.customerType === "dealer";
        customerTypeStr = dbUser.customerType || "retailer";
        const now = new Date();
        if (dbUser.flatDiscountPercent && dbUser.flatDiscountExpiresAt && new Date(dbUser.flatDiscountExpiresAt) > now) {
          userDiscount = {
            percent: dbUser.flatDiscountPercent,
            expiresAt: new Date(dbUser.flatDiscountExpiresAt)
          };
        }
      }
    }

    const items = [];
    const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();
    
    for (const item of rawItems) {
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) continue;

      const product = item.productId 
        ? await Product.findById(item.productId).lean()
        : (item.productSlug ? await Product.findOne({ slug: item.productSlug }).lean() : null);

      if (product) {
        const productIdStr = (product as any)._id?.toString();
        // Find if any flat discount applies to this product (regardless of minOrder for now)
        const applicableFlat = flatDiscounts.find(d => 
          d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === productIdStr))
        );

        const variation = (product as any).variations.find((v: any) => {
          const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
          const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
          return weightMatch && flavorMatch;
        });

        if (variation) {
          const basePrice = isDealer && variation.dealerPrice ? variation.dealerPrice : variation.price;
          let effectiveVarDiscountPrice = variation.discountPrice;

          items.push({
            productId: (product as any)._id.toString(),
            productSlug: (product as any).slug,
            name: (product as any).name,
            quantity,
            price: basePrice,
            variationDiscountPrice: effectiveVarDiscountPrice,
            weight: item.weight,
            flavor: item.flavor,
            image: item.image || variation.image || (product as any).image,
          });
        }
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Order requires at least one valid item" }, { status: 400 });
    }

    const billingAddress = body.billingAddress || {};
    const shippingAddress = body.shippingAddress || {};
    const instruction = body.instruction || "";
    const deliveryMethod = body.deliveryMethod || "shipping";

    const customerName = body.customerName || billingAddress.name;
    const customerEmail = (body.customerEmail || body.email || billingAddress.email || "").toLowerCase().trim();
    const customerPhone = body.customerPhone || body.phone || billingAddress.phone;
    const address = body.address || billingAddress.address;
    const city = body.city || billingAddress.city;
    const postalCode = body.postalCode || billingAddress.postalCode;

    const reqShippingAddress = deliveryMethod === "pickup" ? "Collection Point Pickup" : (shippingAddress.address || address);
    const reqShippingCity = deliveryMethod === "pickup" ? "N/A" : (shippingAddress.city || city);
    const reqShippingPostalCode = deliveryMethod === "pickup" ? "N/A" : (shippingAddress.postalCode || postalCode);

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

    const totals = await calculateServerSideCart(items, body.promoCode, userDiscount);
    const subtotal = totals.subtotal;
    const discountAmount = totals.discountAmount;
    const ruleDiscount = totals.ruleDiscount || 0;
    const promoDiscount = totals.promoDiscount || 0;
    
    const baseShippingCharge = reqShippingCity === "Dhaka" ? 80 : 130;
    const shippingCost = deliveryMethod === "pickup" ? 0 : ((subtotal - ruleDiscount) >= 1000 ? 0 : baseShippingCharge);
    const tax = 0;
    const total = subtotal + shippingCost - discountAmount;

    // If guest, upsert into Customer collection
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
          { upsert: true, returnDocument: 'after' }
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
      deliveryMethod,
      instruction,
      paymentMethod: body.paymentMethod || "cash_on_delivery",
      items,
      subtotal,
      shippingCost,
      tax,
      discountAmount,
      ruleDiscount,
      promoDiscount,
      isRestricted: totals.isRestricted,
      promoCode: body.promoCode,
      total,
      status: ORDER_STATUS.PENDING,
      customerType: customerTypeStr,
    });

    await order.save();

    try {
      await notifyNewOrder(order);
    } catch (e) {
      console.error("Telegram notify error:", e);
    }

    const { Notification } = require("@/lib/models");
    await Notification.create({
      role: ROLES.ADMIN,
      title: "New Order Received",
      message: `A new order #${order._id.toString().slice(-8).toUpperCase()} has been placed by ${customerName}.`,
      type: "order",
      targetLink: `/admin/orders`
    });

    // Increment ordersCount and holdStock for each product atomically
    for (const item of items) {
      if (item.productId) {
        const product = await Product.findById(item.productId);
        if (product && product.variations) {
          const varIndex = product.variations.findIndex((v: any) => {
            const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
            const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
            return weightMatch && flavorMatch;
          });
          
          if (varIndex !== -1) {
            const holdField = `variations.${varIndex}.holdStock`;
            const stockField = `variations.${varIndex}.stock`;
            
            const variation = product.variations[varIndex];
            const oldStockVal = variation.stock || 0;
            const newStockVal = oldStockVal - item.quantity;

            await StockLog.create({
              productId: product._id,
              productName: product.name,
              variationIndex: varIndex,
              weight: item.weight,
              flavor: item.flavor,
              oldStock: oldStockVal,
              newStock: newStockVal,
              amount: -item.quantity,
              reason: `Order Placed (Hold Reserved) - Order #${order._id.toString().slice(-8).toUpperCase()}`,
            });

            await Product.updateOne(
              { _id: product._id },
              { 
                $inc: { 
                  ordersCount: item.quantity,
                  [holdField]: item.quantity, 
                  [stockField]: -item.quantity 
                } 
              }
            );
          } else {
            // No variation match, just update total count
            await Product.updateOne(
              { _id: product._id },
              { $inc: { ordersCount: item.quantity } }
            );
          }
        }
      }
    }

    if (body.promoCode) {
      await PromoCode.findOneAndUpdate(
        { code: body.promoCode.toUpperCase() },
        { $inc: { currentUsage: 1 } }
      );
    }

    // SSLCommerz payment initiation logic
    if (body.paymentMethod === "sslcommerz") {
      try {
        const storeId = process.env.SSLCOMMERZ_STORE_ID;
        const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD;
        const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX === "true";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const sslInitUrl = isSandbox 
          ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php" 
          : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

        const payload = new URLSearchParams({
          store_id: storeId || "",
          store_passwd: storePasswd || "",
          total_amount: total.toFixed(2),
          currency: "BDT",
          tran_id: order._id.toString(),
          success_url: `${appUrl}/api/payment/sslcommerz/success`,
          fail_url: `${appUrl}/api/payment/sslcommerz/fail`,
          cancel_url: `${appUrl}/api/payment/sslcommerz/cancel`,
          ipn_url: `${appUrl}/api/payment/sslcommerz/ipn`,
          cus_name: customerName,
          cus_email: customerEmail,
          cus_add1: address,
          cus_city: city,
          cus_postcode: postalCode,
          cus_country: "Bangladesh",
          cus_phone: customerPhone,
          shipping_method: "YES",
          ship_name: customerName,
          ship_add1: reqShippingAddress,
          ship_city: reqShippingCity,
          ship_postcode: reqShippingPostalCode,
          ship_country: "Bangladesh",
          num_of_item: items.length.toString(),
          product_name: "Parle Biscuits & Snacks",
          product_category: "Food",
          product_profile: "physical-goods",
        });

        const sslRes = await fetch(sslInitUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: payload.toString(),
        });

        // SSLCommerz API responses are returned as JSON
        const sslData = await sslRes.json();

        if (sslData.status === "SUCCESS" && sslData.GatewayPageURL) {
          return NextResponse.json({
            id: order._id.toString(),
            paymentMethod: "sslcommerz",
            gatewayUrl: sslData.GatewayPageURL,
          }, { status: 201 });
        } else {
          console.error("SSLCommerz initiation response failed:", sslData);
          return NextResponse.json({ 
            error: "Payment gateway initiation failed: " + (sslData.failedreason || "Unknown response from SSLCommerz") 
          }, { status: 400 });
        }
      } catch (err: any) {
        console.error("SSLCommerz fetch initiation error:", err);
        return NextResponse.json({ 
          error: "Failed to connect to payment gateway. Please try Cash on Delivery or retry." 
        }, { status: 500 });
      }
    }

    const mappedOrder = order.toObject() as any;
    mappedOrder.id = mappedOrder._id.toString();
    delete mappedOrder._id;
    delete mappedOrder.__v;
    
    return NextResponse.json(mappedOrder, { status: 201 });
  } catch (error: any) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
