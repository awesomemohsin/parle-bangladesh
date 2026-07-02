import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserContext, hasAnyRole, getAuthUserFromRequest } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, Product, Customer, PromoCode, ApprovalRequest, StockLog, User, Admin } from "@/lib/models";
import mongoose from "mongoose";
import { notifyNewOrder } from "@/lib/telegram";
import { calculateServerSideCart } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const context = await getEffectiveUserContext(request);
    const user = context?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q") || "";
    const statusQuery = searchParams.get("status") || "all";
    const customerTypeFilter = searchParams.get("customerTypeFilter") || "all";
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
      const cleanPhone = user.mobile ? user.mobile.replace(/\D/g, "") : "";
      
      let srQuery: any[] = [];
      if (user.isSR) {
        // Fetch B2B shops referred by this SR
        const referredShops = await User.find({ referredBySR: user.id }).select("_id").lean();
        const referredShopIds = referredShops.map(s => s._id.toString());
        srQuery = [
          { placedBySR: new mongoose.Types.ObjectId(user.id) },
          { placedBySR: user.id },
          { userId: { $in: referredShopIds } }
        ];
      }

      matchStage = {
        ...matchStage,
        $or: [
          { userId: user.id },
          { customerEmail: user.email },
          ...srQuery,
          ...(user.mobile ? [
            { customerPhone: user.mobile },
            ...(cleanPhone ? [{ customerEmail: `${cleanPhone}@phone.parle.com` }] : [])
          ] : [])
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

    // Run background cleanups (unpaid payments, pending SR negotiated discount approvals)
    try {
      const { runBackgroundCleanups } = await import("@/lib/ledger");
      await runBackgroundCleanups();
    } catch (cleanupErr) {
      console.error("Failed to run passive background cleanups in GET /api/orders:", cleanupErr);
    }

    // Lookup and resolve customerType stages
    const lookupStages = [
      {
        $lookup: {
          from: "users",
          let: { userIdStr: "$userId" },
          pipeline: [
            {
              $addFields: { idStr: { $toString: "$_id" } }
            },
            {
              $match: {
                $expr: { $eq: ["$idStr", "$$userIdStr"] }
              }
            }
          ],
          as: "userDoc"
        }
      },
      {
        $lookup: {
          from: "admins",
          let: { userIdStr: "$userId" },
          pipeline: [
            {
              $addFields: { idStr: { $toString: "$_id" } }
            },
            {
              $match: {
                $expr: { $eq: ["$idStr", "$$userIdStr"] }
              }
            }
          ],
          as: "adminDoc"
        }
      },
      {
        $addFields: {
          resolvedUser: { $arrayElemAt: ["$userDoc", 0] },
          resolvedAdmin: { $arrayElemAt: ["$adminDoc", 0] }
        }
      },
      {
        $addFields: {
          resolvedCustomerType: {
            $cond: {
               if: {
                $or: [
                  { $eq: ["$userId", null] },
                  { $eq: ["$userId", ""] },
                  { $eq: [{ $type: "$userId" }, "missing"] }
                ]
              },
              then: "guest",
              else: {
                $cond: {
                  if: { $ne: ["$resolvedUser", null] },
                  then: { $ifNull: ["$resolvedUser.customerType", { $ifNull: ["$resolvedUser.role", "customer"] }] },
                  else: {
                    $cond: {
                      if: { $ne: ["$resolvedAdmin", null] },
                      then: {
                        $cond: {
                          if: { $eq: ["$resolvedAdmin.role", "owner"] },
                          then: "owner",
                          else: { $ifNull: ["$resolvedAdmin.role", "admin"] }
                        }
                      },
                      else: { $ifNull: ["$customerType", "customer"] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ];

    // Get total count accounting for search query and role filter
    let total = 0;
    if (!searchQuery && customerTypeFilter === "all") {
      total = await Order.countDocuments(matchStage);
    } else {
      const countPipeline = [
        { $match: matchStage },
        {
          $addFields: {
            idString: { $toString: "$_id" }
          }
        }
      ] as any[];
      if (searchQuery) {
        const searchRegex = new RegExp(searchQuery, "i");
        countPipeline.push({
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
      if (customerTypeFilter !== "all") {
        countPipeline.push(...lookupStages);
        let matchCond: any = {};
        if (customerTypeFilter === "customer") {
          matchCond = { resolvedCustomerType: { $in: ["customer", "guest"] } };
        } else if (customerTypeFilter === "b2b") {
          matchCond = { resolvedCustomerType: { $in: ["retailer", "dealer"] } };
        } else if (customerTypeFilter === "staff") {
          matchCond = { resolvedCustomerType: { $in: ["admin", "super_admin", "moderator", "owner"] } };
        } else if (customerTypeFilter === "other") {
          matchCond = { resolvedCustomerType: { $nin: ["customer", "guest", "retailer", "dealer", "admin", "super_admin", "moderator", "owner"] } };
        }
        countPipeline.push({ $match: matchCond });
      }
      countPipeline.push({ $count: "total" });
      const countResult = await Order.aggregate(countPipeline);
      total = countResult[0]?.total || 0;
    }

    // Pipeline
    let pipeline: any[] = [
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

    if (customerTypeFilter !== "all") {
      pipeline.push(...lookupStages);
      let matchCond: any = {};
      if (customerTypeFilter === "customer") {
        matchCond = { resolvedCustomerType: { $in: ["customer", "guest"] } };
      } else if (customerTypeFilter === "b2b") {
        matchCond = { resolvedCustomerType: { $in: ["retailer", "dealer"] } };
      } else if (customerTypeFilter === "staff") {
        matchCond = { resolvedCustomerType: { $in: ["admin", "super_admin", "moderator", "owner"] } };
      } else if (customerTypeFilter === "other") {
        matchCond = { resolvedCustomerType: { $nin: ["customer", "guest", "retailer", "dealer", "admin", "super_admin", "moderator", "owner"] } };
      }
      pipeline.push({ $match: matchCond });
      pipeline.push({ $sort: sortStage });
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
    } else {
      pipeline.push({ $sort: sortStage });
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
      pipeline.push(...lookupStages);
    }

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
        o.customerType = o.resolvedCustomerType || "guest";
        
        delete o.idString;
        delete o.userDoc;
        delete o.adminDoc;
        delete o.resolvedUser;
        delete o.resolvedAdmin;
        delete o.resolvedCustomerType;
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
    const context = await getEffectiveUserContext(request);
    const user = context?.user;
    const srUser = context?.srUser;

    // If token was provided but verification failed (e.g. role demoted), force re-login
    if (token && !user) {
      return NextResponse.json({ error: "Session expired or role updated. Please login again." }, { status: 401 });
    }

    let isDealer = false;
    let isRetailer = false;
    let userDiscount = undefined;
    let customerTypeStr = "guest";

    if (user) {
      const isStaffUser = ["super_admin", "admin", "moderator", "owner"].includes(user.role);
      const isStaffCustomerType = ["super_admin", "admin", "moderator", "owner"].includes(user.customerType);
      const isStaff = isStaffUser || isStaffCustomerType;

      if (isStaff) {
        isDealer = true;
        customerTypeStr = user.role;
      } else if (user.role === "customer") {
        isDealer = user.customerType === "dealer" || user.customerType === "employee";
        isRetailer = user.customerType === "retailer";
        customerTypeStr = user.customerType || "customer";
        const now = new Date();
        if (user.flatDiscountPercent && user.flatDiscountExpiresAt && new Date(user.flatDiscountExpiresAt) > now) {
          userDiscount = {
            percent: user.flatDiscountPercent,
            expiresAt: new Date(user.flatDiscountExpiresAt)
          };
        }
      } else {
        // Logged in as Admin/Superadmin/Owner/Moderator but somehow not caught above
        isDealer = true;
        customerTypeStr = user.role;
      }
    }

    const items = [];
    const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();

    const productIds = rawItems.map((item: any) => item.productId).filter(Boolean);
    const productSlugs = rawItems.map((item: any) => item.productSlug).filter(Boolean);

    const products = await Product.find({
      $or: [
        { _id: { $in: productIds } },
        { slug: { $in: productSlugs } }
      ]
    }).lean();

    const productMapById = new Map(products.map(p => [p._id.toString(), p]));
    const productMapBySlug = new Map(products.map(p => [p.slug, p]));

    for (const item of rawItems) {
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) continue;

      const product = item.productId
        ? productMapById.get(item.productId)
        : (item.productSlug ? productMapBySlug.get(item.productSlug) : null);

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
          if ((variation.stock || 0) < quantity) {
            return NextResponse.json({
              error: `Insufficient stock for product ${(product as any).name} (${item.weight || ""} ${item.flavor || ""}). Available stock: ${variation.stock || 0}`
            }, { status: 400 });
          }

          const basePrice = isDealer && variation.dealerPrice
            ? variation.dealerPrice
            : (isRetailer && variation.retailerPrice ? variation.retailerPrice : variation.price);
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
    const customerPhone = body.customerPhone || body.phone || billingAddress.phone;
    let customerEmail = (body.customerEmail || body.email || billingAddress.email || "").toLowerCase().trim();

    if (!customerEmail && customerPhone) {
      const cleanPhone = customerPhone.replace(/\D/g, "");
      if (cleanPhone) {
        customerEmail = `${cleanPhone}@phone.parle.com`;
      }
    }

    const address = body.address || billingAddress.address;
    const city = body.city || billingAddress.city;
    const postalCode = body.postalCode || billingAddress.postalCode;
    const thana = body.thana || billingAddress.thana;

    const reqShippingAddress = deliveryMethod === "pickup" ? "Collection Point Pickup" : (shippingAddress.address || address);
    const reqShippingCity = deliveryMethod === "pickup" ? "N/A" : (shippingAddress.city || city);
    const reqShippingPostalCode = deliveryMethod === "pickup" ? "N/A" : (shippingAddress.postalCode || postalCode);
    const reqShippingThana = deliveryMethod === "pickup" ? "N/A" : (shippingAddress.thana || thana);

    const missing = [];
    if (!customerName) missing.push("Name");
    if (!customerEmail) missing.push("Email");
    if (!customerPhone) missing.push("Phone");
    if (!address) missing.push("Billing Address");
    if (!city) missing.push("Billing City");
    if (!thana) missing.push("Billing Thana / Police Station");
    if (!postalCode) missing.push("Billing Postal Code");

    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing billing information: ${missing.join(", ")}` }, { status: 400 });
    }

    const totals = await calculateServerSideCart(items, body.promoCode, userDiscount, customerTypeStr);
    const subtotal = totals.subtotal;
    let discountAmount = totals.discountAmount;
    const ruleDiscount = totals.ruleDiscount || 0;
    const promoDiscount = totals.promoDiscount || 0;

    const isB2BUser = customerTypeStr === "retailer" || customerTypeStr === "dealer" || customerTypeStr === "employee";
    const baseShippingCharge = (reqShippingCity === "Dhaka" || reqShippingCity === "Dhaka Metro") ? 80 : 130;
    const shippingCost = (deliveryMethod === "pickup" || isB2BUser) ? 0 : (((subtotal - ruleDiscount) >= 1000 || totals.freeShippingGranted) ? 0 : baseShippingCharge);
    const tax = 0;
    let total = subtotal + shippingCost - discountAmount;

    let srDiscountPercent = 0;
    let srDiscountAmountVal = 0;
    if (srUser && body.srDiscountPercent !== undefined) {
      const inputPercent = Number(body.srDiscountPercent) || 0;
      if (inputPercent > 0) {
        if (inputPercent > 15) {
          return NextResponse.json({ error: "Negotiated discount cannot exceed 15%" }, { status: 400 });
        }
        srDiscountPercent = inputPercent;
        srDiscountAmountVal = Math.round(subtotal * (srDiscountPercent / 100));
        discountAmount += srDiscountAmountVal;
        total = Math.max(0, subtotal + shippingCost - discountAmount);
      }
    }

    // Credit limit check ONLY for probation retailers
    const isProbationRetailer = customerTypeStr === "retailer" && !user.isRetailerApproved;
    if (user && isProbationRetailer) {
      const netBal = (user.walletBalance || 0) - (user.dueBalance || 0);
      const newBal = netBal - total;
      if (newBal < -50000) {
        return NextResponse.json({
          error: `Credit limit exceeded. Your current account balance (৳${netBal >= 0 ? '+' : ''}${netBal}) minus this order (৳${total}) would exceed the ৳50,000 probation limit. Please contact a Superadmin for approval.`
        }, { status: 400 });
      }
    }

    // If logged-in user currently has a virtual email and checks out with a real email, update user profile email
    if (user && user.email?.endsWith("@phone.parle.com") && !customerEmail.endsWith("@phone.parle.com")) {
      try {
        const emailExists = await User.findOne({ email: customerEmail });
        if (!emailExists) {
          await User.findByIdAndUpdate(user.id, { email: customerEmail });
          
          // Also update all past orders of this user to use their new real email!
          await Order.updateMany(
            { userId: user.id },
            { $set: { customerEmail: customerEmail } }
          );
        }
      } catch (userUpdateErr) {
        console.error("Failed to update user virtual email to real email during order placement:", userUpdateErr);
      }
    }

    // If guest, attempt auto-registration
    let autoLoggedInUser: any = null;
    let autoLoginToken: any = null;
    let matchedExistingUser: any = null;

    if (!user) {
      try {
        const normalizedPhone = customerPhone.replace(/\D/g, "");
        const existingUser = await User.findOne({
          $or: [
            { email: customerEmail },
            { mobile: customerPhone },
            { mobile: normalizedPhone }
          ]
        });

        const existingAdmin = await Admin.findOne({
          $or: [
            { email: customerEmail },
            { mobile: customerPhone },
            { mobile: normalizedPhone }
          ]
        });

        if (existingUser) {
          matchedExistingUser = existingUser;
        } else if (existingAdmin) {
          matchedExistingUser = existingAdmin;
        }

        if (!existingUser && !existingAdmin) {
          const crypto = require("crypto");
          const passwordSource = body.password || customerPhone;
          const passwordHash = crypto.createHash("sha256").update(passwordSource).digest("hex");
          
          const newUser = new User({
            email: customerEmail,
            mobile: customerPhone,
            password: passwordHash,
            name: customerName,
            role: "customer",
            customerType: "customer",
            status: "active",
          });

          await newUser.save();
          autoLoggedInUser = newUser;

          const { generateToken } = require("@/lib/auth");
          autoLoginToken = generateToken({
            id: newUser._id.toString(),
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            customerType: newUser.customerType || 'customer',
            tokenVersion: newUser.tokenVersion || 0,
          });
        } else {
          // If already registered, still record guest contact for legacy compatibility
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
        }
      } catch (upsertErr) {
        console.error("Auto registration or guest customer upsert error:", upsertErr);
      }
    }

    const isImpersonatingStaff = srUser && ["super_admin", "admin", "moderator"].includes(srUser.role);
    const isTargetB2B = ["retailer", "dealer", "employee"].includes(customerTypeStr);
    const isStaff = ["super_admin", "admin", "superadmin", "moderator", "owner"].includes(customerTypeStr);
    const isEmployeeOrStaffOrder = customerTypeStr === "employee" || isStaff;
    
    // Status is PENDING if:
    // - There is no srUser (self checkout)
    // - Or the placing party is a staff member impersonating a standard customer (non-B2B)
    // - Or a negotiated discount is applied (srDiscountPercent > 0)
    // - Or the order is for an employee or staff member (always goes to approval)
    // Otherwise (impersonated B2B shop order with no discount), it goes straight to PROCESSING.
    const orderStatus = (isEmployeeOrStaffOrder || (isImpersonatingStaff && !isTargetB2B) || !srUser || srDiscountPercent > 0)
      ? ORDER_STATUS.PENDING
      : ORDER_STATUS.PROCESSING;

    const order = new Order({
      userId: user ? user.id : (autoLoggedInUser ? autoLoggedInUser._id.toString() : (matchedExistingUser ? matchedExistingUser._id.toString() : undefined)),
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      postalCode,
      thana,
      shippingAddress: reqShippingAddress,
      shippingCity: reqShippingCity,
      shippingPostalCode: reqShippingPostalCode,
      shippingThana: reqShippingThana,
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
      status: orderStatus,
      customerType: autoLoggedInUser ? "customer" : (matchedExistingUser ? (matchedExistingUser.customerType || "customer") : customerTypeStr),
      amountPaid: 0,
      amountDue: total,
      placedBySR: srUser ? srUser.id : undefined,
      srDiscountPercent,
      srDiscountAmount: srDiscountAmountVal,
    });

    await order.save();

    if ((isImpersonatingStaff && !isTargetB2B) || (srUser && srDiscountPercent > 0) || isEmployeeOrStaffOrder) {
      const isImpersonatingCustomer = !!(isImpersonatingStaff && !isTargetB2B);
      let fieldVal = "impersonationOrder";
      let oldVal = "N/A";
      let newVal = "";

      if (isEmployeeOrStaffOrder) {
        fieldVal = "employeeOrder";
        oldVal = "N/A";
        const isSelfOrder = !srUser || srUser.email === user.email;
        const isEmployee = user.customerType === "employee";
        if (isSelfOrder) {
          newVal = isEmployee
            ? "Employee Order created by self"
            : "Staff Order created by self";
        } else {
          newVal = isEmployee
            ? `Employee Order created by staff ${srUser.role} (${srUser.email})`
            : `Staff Order created by staff ${srUser.role} (${srUser.email})`;
        }
      } else if (isImpersonatingCustomer) {
        fieldVal = "impersonationOrder";
        oldVal = "N/A";
        newVal = srDiscountPercent > 0 ? `Created by ${srUser.role} with ${srDiscountPercent}% discount` : `Created by ${srUser.role} (${srUser.email})`;
      } else {
        fieldVal = "srDiscount";
        oldVal = "0%";
        newVal = `${srDiscountPercent}% (৳${srDiscountAmountVal})`;
      }

      const approvalRequest = new ApprovalRequest({
        requesterEmail: srUser ? srUser.email : (user ? user.email : "employee@system.com"),
        type: "order",
        targetId: order._id.toString(),
        targetName: `Order #${order._id.toString().slice(-8).toUpperCase()}`,
        field: fieldVal,
        oldValue: oldVal,
        newValue: newVal,
        targetDetails: order.toObject(),
        status: "pending",
        stage: "superadmin",
      });

      await approvalRequest.save();

      // Trigger Telegram Notification for approval request
      try {
        const { notifyNewApprovalRequest } = await import("@/lib/telegram");
        await notifyNewApprovalRequest(approvalRequest.toObject ? approvalRequest.toObject() : approvalRequest);
      } catch (tgError) {
        console.error("Telegram notification failed for order approval request:", tgError);
      }
    }

    // Reconcile ledger for all registered users (B2B, customers, admins)
    const targetRegisteredUser = user || autoLoggedInUser || matchedExistingUser;
    if (targetRegisteredUser) {
      const targetUserId = user ? user.id : targetRegisteredUser._id.toString();
      const targetEmail = user ? user.email : targetRegisteredUser.email;
      const advancePaid = Number(body.advancePaid || body.amountPaid || 0);
      if (advancePaid > 0) {
        const { TransactionLedger } = await import("@/lib/models");
        const ledger = new TransactionLedger({
          userId: targetUserId,
          orderId: order._id,
          amount: advancePaid,
          type: "collection",
          paymentMethod: body.paymentMethod || "cash",
          recordedBy: srUser ? srUser.email : targetEmail,
          notes: body.notes || "",
        });
        await ledger.save();
      }

      const { reconcileUserLedger } = await import("@/lib/ledger");
      await reconcileUserLedger(targetUserId);

      // Reload order to return updated amountPaid, amountDue, and paymentStatus fields
      const updatedOrder = await Order.findById(order._id);
      if (updatedOrder) {
        order.amountPaid = updatedOrder.amountPaid;
        order.amountDue = updatedOrder.amountDue;
        order.paymentStatus = updatedOrder.paymentStatus;
      }
    }

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
      const updatedPromo = await PromoCode.findOneAndUpdate(
        { code: body.promoCode.toUpperCase() },
        { $inc: { currentUsage: 1 } },
        { new: true }
      );
      if (updatedPromo && updatedPromo.currentUsage >= updatedPromo.maxUsage) {
        await PromoCode.updateOne(
          { _id: updatedPromo._id },
          { isActive: false }
        );
      }
    }

    if (totals.appliedRuleIds && totals.appliedRuleIds.length > 0) {
      for (const ruleId of totals.appliedRuleIds) {
        const updatedRule = await PromoCode.findByIdAndUpdate(
          ruleId,
          { $inc: { currentUsage: 1 } },
          { new: true }
        );
        if (updatedRule && updatedRule.currentUsage >= updatedRule.maxUsage) {
          await PromoCode.updateOne(
            { _id: updatedRule._id },
            { isActive: false }
          );
        }
      }
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
          cus_add1: thana ? `${address}, ${thana}` : address,
          cus_city: city,
          cus_postcode: postalCode,
          cus_country: "Bangladesh",
          cus_phone: customerPhone,
          shipping_method: "YES",
          ship_name: customerName,
          ship_add1: reqShippingThana && reqShippingThana !== "N/A" ? `${reqShippingAddress}, ${reqShippingThana}` : reqShippingAddress,
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

        let response;
        if (sslData.status === "SUCCESS" && sslData.GatewayPageURL) {
          response = NextResponse.json({
            id: order._id.toString(),
            paymentMethod: "sslcommerz",
            gatewayUrl: sslData.GatewayPageURL,
            autoSignUp: !!autoLoginToken,
            token: autoLoginToken || null,
            user: autoLoggedInUser ? {
              id: autoLoggedInUser._id.toString(),
              email: autoLoggedInUser.email,
              name: autoLoggedInUser.name,
              role: autoLoggedInUser.role,
              customerType: autoLoggedInUser.customerType || 'customer',
              tokenVersion: autoLoggedInUser.tokenVersion || 0,
              mobile: autoLoggedInUser.mobile,
            } : null
          }, { status: 201 });
        } else {
          console.error("SSLCommerz initiation response failed:", sslData);
          response = NextResponse.json({
            error: "Payment gateway initiation failed: " + (sslData.failedreason || "Unknown response from SSLCommerz")
          }, { status: 400 });
        }

        if (autoLoginToken && response) {
          const { setAuthCookie } = require("@/lib/auth");
          response.headers.set("Set-Cookie", setAuthCookie(autoLoginToken, 'token', 86400 * 7));
        }
        return response;
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
    mappedOrder.autoSignUp = !!autoLoginToken;
    if (autoLoginToken) {
      mappedOrder.token = autoLoginToken;
      mappedOrder.user = {
        id: autoLoggedInUser._id.toString(),
        email: autoLoggedInUser.email,
        name: autoLoggedInUser.name,
        role: autoLoggedInUser.role,
        customerType: autoLoggedInUser.customerType || 'customer',
        tokenVersion: autoLoggedInUser.tokenVersion || 0,
        mobile: autoLoggedInUser.mobile,
      };
    }

    const response = NextResponse.json(mappedOrder, { status: 201 });
    if (autoLoginToken) {
      const { setAuthCookie } = require("@/lib/auth");
      response.headers.set("Set-Cookie", setAuthCookie(autoLoginToken, 'token', 86400 * 7));
    }
    return response;
  } catch (error: any) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
