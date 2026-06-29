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

    // 1. DATE RANGE FILTER
    const query: any = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }

    // 2. ORDER STATUS GROUPING
    const statusStats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalProducts: { $sum: { $reduce: { input: "$items", initialValue: 0, in: { $add: ["$$value", "$$this.quantity"] } } } }
        }
      }
    ]);

    // 3. CUSTOMER TYPE BREAKDOWN
    const customerTypeStats = await Order.aggregate([
      { $match: query },
      ...getCustomerTypeResolutionStages(),
      {
        $group: {
          _id: "$resolvedCustomerType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalProducts: { $sum: { $reduce: { input: "$items", initialValue: 0, in: { $add: ["$$value", "$$this.quantity"] } } } }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // 4. DEALER BREAKDOWN
    const dealerStats = await Order.aggregate([
      { $match: { ...query, customerType: "dealer" } },
      {
        $group: {
          _id: "$userId",
          customerName: { $first: "$customerName" },
          customerPhone: { $first: "$customerPhone" },
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalProducts: { $sum: { $reduce: { input: "$items", initialValue: 0, in: { $add: ["$$value", "$$this.quantity"] } } } },
          amountDue: { $sum: { $ifNull: ["$amountDue", 0] } }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // 5. SALES REPRESENTATIVES (SR) PERFORMANCE
    const srStats = await Order.aggregate([
      { $match: { ...query, placedBySR: { $ne: null } } },
      {
        $group: {
          _id: "$placedBySR",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalProducts: { $sum: { $reduce: { input: "$items", initialValue: 0, in: { $add: ["$$value", "$$this.quantity"] } } } }
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

    // 6. PAYMENT METHOD BREAKDOWN
    const paymentStats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          paidAmount: { $sum: "$amountPaid" },
          dueAmount: { $sum: "$amountDue" }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // 7. NEW CUSTOMERS REGISTERED
    const userQuery: any = { role: "customer" };
    if (startDate || endDate) {
      userQuery.createdAt = {};
      if (startDate) userQuery.createdAt.$gte = new Date(startDate);
      if (endDate) userQuery.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
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
        { $unwind: "$items" },
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

    // 7.1 UNIQUE GUESTS COUNT IN PERIOD
    const uniqueGuestsStats = await Order.aggregate([
      { $match: query },
      ...getCustomerTypeResolutionStages(),
      { $match: { resolvedCustomerType: "guest" } },
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

    // 8. PRODUCT PERFORMANCE BREAKDOWN
    const productStats = await Order.aggregate([
      { $match: query },
      { $unwind: "$items" },
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

    // 9. OVERALL STATISTICS (Total units sold, unique SKUs, order extremes)
    const itemStats = await Order.aggregate([
      { $match: query },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          quantity: { $sum: "$items.quantity" }
        }
      }
    ]);

    const orderMinMax = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          highestOrderValue: { $max: "$total" },
          lowestOrderValue: { $min: "$total" },
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
