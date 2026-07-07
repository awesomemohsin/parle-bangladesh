import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, User } from "@/lib/models";
import mongoose from "mongoose";

function getCustomerTypeResolutionStages() {
  return [
    {
      $lookup: {
        from: "users",
        let: { userIdStr: "$userId" },
        pipeline: [
          { $addFields: { idStr: { $toString: "$_id" } } },
          { $match: { $expr: { $eq: ["$idStr", "$$userIdStr"] } } }
        ],
        as: "userDoc"
      }
    },
    {
      $lookup: {
        from: "admins",
        let: { userIdStr: "$userId" },
        pipeline: [
          { $addFields: { idStr: { $toString: "$_id" } } },
          { $match: { $expr: { $eq: ["$idStr", "$$userIdStr"] } } }
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
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user || !hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const productId = searchParams.get("productId");
    const customerType = searchParams.get("customerType") || "all";
    const srId = searchParams.get("srId");

    // 1. BASE DATABASE QUERY
    const query: any = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (productId && productId !== "all") {
      query["items.productId"] = productId;
    }
    if (srId && srId !== "all") {
      const srIdObj = mongoose.Types.ObjectId.isValid(srId) ? new mongoose.Types.ObjectId(srId) : null;
      const srFilter = { $in: [srId, srIdObj].filter(Boolean) };
      query.placedBySR = srFilter;
    }

    // 2. BASE CUSTOMER TYPE FILTER STAGES
    const resolutionStages = getCustomerTypeResolutionStages();
    let customerTypeMatchStage: any[] = [];
    if (customerType && customerType !== "all") {
      let matchCond: any = {};
      if (customerType === "customer") {
        matchCond = { resolvedCustomerType: { $in: ["customer", "guest"] } };
      } else if (customerType === "b2b") {
        matchCond = { resolvedCustomerType: { $in: ["retailer", "dealer", "employee"] } };
      } else if (customerType === "staff") {
        matchCond = { resolvedCustomerType: { $in: ["admin", "super_admin", "moderator", "owner"] } };
      } else if (customerType === "other") {
        matchCond = { resolvedCustomerType: { $nin: ["customer", "guest", "retailer", "dealer", "employee", "admin", "super_admin", "moderator", "owner"] } };
      }
      customerTypeMatchStage = [{ $match: matchCond }];
    }
    const baseFilterStages = [
      ...resolutionStages,
      ...customerTypeMatchStage
    ];

    // 3. ORDER STATUS GROUPING
    const statusStats = await Order.aggregate([
      { $match: query },
      ...baseFilterStages,
      { $unwind: "$items" },
      ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          status: { $first: "$status" },
          orderTotal: { $first: "$total" },
          itemRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          itemQuantity: { $sum: "$items.quantity" }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: productId && productId !== "all" ? "$itemRevenue" : "$orderTotal" },
          totalProducts: { $sum: "$itemQuantity" }
        }
      }
    ]);

    // 4. CUSTOMER TYPE BREAKDOWN
    const customerTypeStats = await Order.aggregate([
      { $match: query },
      ...baseFilterStages,
      { $unwind: "$items" },
      ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          resolvedCustomerType: { $first: "$resolvedCustomerType" },
          orderTotal: { $first: "$total" },
          itemRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          itemQuantity: { $sum: "$items.quantity" }
        }
      },
      {
        $group: {
          _id: "$resolvedCustomerType",
          count: { $sum: 1 },
          totalAmount: { $sum: productId && productId !== "all" ? "$itemRevenue" : "$orderTotal" },
          totalProducts: { $sum: "$itemQuantity" }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // 5. DEALER BREAKDOWN
    const dealerStats = await Order.aggregate([
      { $match: { ...query, customerType: "dealer" } },
      ...baseFilterStages,
      { $unwind: "$items" },
      ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          userId: { $first: "$userId" },
          customerName: { $first: "$customerName" },
          customerPhone: { $first: "$customerPhone" },
          orderTotal: { $first: "$total" },
          itemRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          itemQuantity: { $sum: "$items.quantity" },
          amountDue: { $first: { $ifNull: ["$amountDue", 0] } }
        }
      },
      {
        $group: {
          _id: "$userId",
          customerName: { $first: "$customerName" },
          customerPhone: { $first: "$customerPhone" },
          count: { $sum: 1 },
          totalAmount: { $sum: productId && productId !== "all" ? "$itemRevenue" : "$orderTotal" },
          totalProducts: { $sum: "$itemQuantity" },
          amountDue: { $sum: "$amountDue" }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // 6. SALES REPRESENTATIVES (SR) PERFORMANCE
    const srStats = await Order.aggregate([
      { $match: { ...query, placedBySR: { $ne: null } } },
      ...baseFilterStages,
      { $unwind: "$items" },
      ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          placedBySR: { $first: "$placedBySR" },
          orderTotal: { $first: "$total" },
          itemRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          itemQuantity: { $sum: "$items.quantity" }
        }
      },
      {
        $group: {
          _id: "$placedBySR",
          count: { $sum: 1 },
          totalAmount: { $sum: productId && productId !== "all" ? "$itemRevenue" : "$orderTotal" },
          totalProducts: { $sum: "$itemQuantity" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "srDetails"
        }
      },
      {
        $project: {
          srId: "$_id",
          count: 1,
          totalAmount: 1,
          totalProducts: 1,
          srName: { $arrayElemAt: ["$srDetails.name", 0] },
          srMobile: { $arrayElemAt: ["$srDetails.mobile", 0] }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // 7. PAYMENT METHOD BREAKDOWN
    const paymentStats = await Order.aggregate([
      { $match: query },
      ...baseFilterStages,
      { $unwind: "$items" },
      ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          paymentMethod: { $first: "$paymentMethod" },
          orderTotal: { $first: "$total" },
          itemRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          amountPaid: { $first: { $ifNull: ["$amountPaid", 0] } },
          amountDue: { $first: { $ifNull: ["$amountDue", 0] } }
        }
      },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: productId && productId !== "all" ? "$itemRevenue" : "$orderTotal" },
          paidAmount: { $sum: "$amountPaid" },
          dueAmount: { $sum: "$amountDue" }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // 8. NEW CUSTOMERS REGISTERED
    const userQuery: any = { role: "customer" };
    if (startDate || endDate) {
      userQuery.createdAt = {};
      if (startDate) userQuery.createdAt.$gte = new Date(startDate);
      if (endDate) userQuery.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (customerType && customerType !== "all") {
      if (customerType === "customer") {
        userQuery.customerType = { $in: ["customer", "guest"] };
      } else if (customerType === "b2b") {
        userQuery.customerType = { $in: ["retailer", "dealer", "employee"] };
      } else if (customerType === "staff") {
        userQuery.role = { $in: ["admin", "super_admin", "moderator", "owner"] };
      } else if (customerType === "other") {
        userQuery.customerType = { $nin: ["customer", "guest", "retailer", "dealer", "employee"] };
        userQuery.role = "customer";
      }
    }
    if (srId && srId !== "all") {
      userQuery.referredBySR = srId;
    }
    const newUsers = await User.find(userQuery).select("_id").lean();
    const newUserIds = newUsers.map(u => u._id.toString());
    const newCustomersCount = newUsers.length;

    let newCustomersOrdersCount = 0;
    let newCustomersProductsCount = 0;

    if (newUserIds.length > 0) {
      const newCustomerOrdersStats = await Order.aggregate([
        { 
          $match: {
            ...query,
            userId: { $in: newUserIds }
          }
        },
        ...baseFilterStages,
        { $unwind: "$items" },
        ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
        {
          $group: {
            _id: "$_id",
            itemQuantity: { $sum: "$items.quantity" }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalProducts: { $sum: "$itemQuantity" }
          }
        }
      ]);
      newCustomersOrdersCount = newCustomerOrdersStats[0]?.totalOrders || 0;
      newCustomersProductsCount = newCustomerOrdersStats[0]?.totalProducts || 0;
    }

    // 9. UNIQUE GUESTS COUNT IN PERIOD
    const uniqueGuestsStats = await Order.aggregate([
      { $match: query },
      ...baseFilterStages,
      { $match: { resolvedCustomerType: "guest" } },
      { $unwind: "$items" },
      ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          customerEmail: { $first: "$customerEmail" }
        }
      },
      {
        $group: {
          _id: "$customerEmail"
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 }
        }
      }
    ]);
    const uniqueGuestsCount = uniqueGuestsStats[0]?.count || 0;

    // 10. PRODUCT PERFORMANCE BREAKDOWN
    const productStats = await Order.aggregate([
      { $match: query },
      ...baseFilterStages,
      { $unwind: "$items" },
      ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.name" },
          unitsSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 15 }
    ]);

    // 11. OVERALL STATISTICS (Total units sold, unique SKUs, order extremes)
    const itemStats = await Order.aggregate([
      { $match: query },
      ...baseFilterStages,
      { $unwind: "$items" },
      ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$items.productId",
          quantity: { $sum: "$items.quantity" }
        }
      }
    ]);

    const orderMinMax = await Order.aggregate([
      { $match: query },
      ...baseFilterStages,
      { $unwind: "$items" },
      ...(productId && productId !== "all" ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          orderTotal: { $first: "$total" },
          itemRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      {
        $group: {
          _id: null,
          highestOrderValue: { $max: productId && productId !== "all" ? "$itemRevenue" : "$orderTotal" },
          lowestOrderValue: { $min: productId && productId !== "all" ? "$itemRevenue" : "$orderTotal" },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const totalUniqueSKUs = itemStats.length;
    const totalProductsSold = itemStats.reduce((sum, item) => sum + item.quantity, 0);
    const highestOrderValue = orderMinMax[0]?.highestOrderValue || 0;
    const lowestOrderValue = orderMinMax[0]?.lowestOrderValue || 0;
    const totalOrdersCount = orderMinMax[0]?.totalOrders || 0;
    const averageProductsPerOrder = totalOrdersCount > 0 ? (totalProductsSold / totalOrdersCount) : 0;

    return NextResponse.json({
      dateRange: { startDate, endDate },
      statusStats,
      customerTypeStats,
      dealerStats,
      srStats,
      paymentStats,
      newCustomersCount,
      newCustomersOrdersCount,
      newCustomersProductsCount,
      uniqueGuestsCount,
      productStats,
      overallStats: {
        totalProductsSold,
        totalUniqueSKUs,
        averageProductsPerOrder,
        highestOrderValue,
        lowestOrderValue
      }
    });

  } catch (error) {
    console.error("Report Generation Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
