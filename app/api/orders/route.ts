import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import { readOrders, readProductBySlug, writeOrders } from "@/lib/data-store";
import { FileStorage } from "@/lib/file-storage";

type RawOrderItem = {
  productId?: string;
  productSlug?: string;
  name?: string;
  quantity?: number;
  price?: number;
};

function normalizeOrderItems(items: RawOrderItem[]) {
  return items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) return null;

      const directPrice =
        item.price !== undefined ? Number(item.price) : undefined;
      if (item.productSlug) {
        const found = readProductBySlug(item.productSlug);
        if (found) {
          return {
            productId: found.product.id,
            productSlug: found.product.slug,
            name: String(found.product.name),
            quantity,
            price: directPrice ?? Number(found.product.price),
          };
        }
      }

      if (
        !item.name ||
        directPrice === undefined ||
        Number.isNaN(directPrice)
      ) {
        return null;
      }

      return {
        productId: item.productId,
        productSlug: item.productSlug,
        name: item.name,
        quantity,
        price: directPrice,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, [ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orders = readOrders().sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const rawItems = Array.isArray(body.items)
      ? (body.items as RawOrderItem[])
      : [];
    const items = normalizeOrderItems(rawItems);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Order requires at least one valid item" },
        { status: 400 },
      );
    }

    const shippingAddress = body.shippingAddress || {};

    const customerName = body.customerName || shippingAddress.name;
    const customerEmail =
      body.customerEmail || body.email || shippingAddress.email;
    const customerPhone =
      body.customerPhone || body.phone || shippingAddress.phone;
    const address = body.address || shippingAddress.address;
    const city = body.city || shippingAddress.city;
    const postalCode = body.postalCode || shippingAddress.postalCode;

    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !address ||
      !city ||
      !postalCode
    ) {
      return NextResponse.json(
        { error: "Missing customer or shipping information" },
        { status: 400 },
      );
    }

    const settings =
      FileStorage.read<{ shippingCost?: number; taxRate?: number }>(
        "settings.json",
      ) || {};
    const shippingCost = Number(settings.shippingCost ?? 50);
    const taxRate = Number(settings.taxRate ?? 0.05);

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const tax = (subtotal + shippingCost) * taxRate;
    const total = subtotal + shippingCost + tax;

    const now = new Date().toISOString();
    const order = {
      id: `order-${Date.now()}`,
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
      createdAt: now,
      updatedAt: now,
    };

    const orders = readOrders();
    const saved = writeOrders([...orders, order]);

    if (!saved) {
      return NextResponse.json(
        { error: "Failed to place order" },
        { status: 500 },
      );
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Orders POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
