import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, Product } from "@/lib/models";
import { FileStorage } from "@/lib/file-storage";

function mapDoc(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let query: any = {};
    if (!hasAnyRole(user, [ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN])) {
      query = { 
        $or: [
          { userId: user.id },
          { customerEmail: user.email }
        ]
      };
    }

    // sort newest first
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ orders: orders.map(o => { o.id = o._id.toString(); return o; }) });
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
          };
      }
      
      if (validItem) items.push(validItem);
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Order requires at least one valid item" }, { status: 400 });
    }

    const shippingAddress = body.shippingAddress || {};
    const customerName = body.customerName || shippingAddress.name;
    const customerEmail = body.customerEmail || body.email || shippingAddress.email;
    const customerPhone = body.customerPhone || body.phone || shippingAddress.phone;
    const address = body.address || shippingAddress.address;
    const city = body.city || shippingAddress.city;
    const postalCode = body.postalCode || shippingAddress.postalCode;

    const missing = [];
    if (!customerName) missing.push("Name");
    if (!customerEmail) missing.push("Email");
    if (!customerPhone) missing.push("Phone");
    if (!address) missing.push("Address");
    if (!city) missing.push("City");
    if (!postalCode) missing.push("Postal Code");

    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing shipping information: ${missing.join(", ")}` }, { status: 400 });
    }

    const settings = FileStorage.read<{ shippingCost?: number; taxRate?: number }>("settings.json") || {};
    const shippingCost = Number(settings.shippingCost ?? 50);
    const taxRate = Number(settings.taxRate ?? 0.05);

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = (subtotal + shippingCost) * taxRate;
    const total = subtotal + shippingCost + tax;

    const user = getAuthUserFromRequest(request);

    const order = new Order({
      userId: user ? user.id : undefined,
      customerName,
      customerEmail,
      customerPhone,
      address,
      city,
      postalCode,
      paymentMethod: body.paymentMethod || "cash_on_delivery",
      items,
      subtotal,
      shippingCost,
      tax,
      total,
      status: ORDER_STATUS.PENDING,
    });

    await order.save();
    return NextResponse.json(mapDoc(order), { status: 201 });
  } catch (error) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
