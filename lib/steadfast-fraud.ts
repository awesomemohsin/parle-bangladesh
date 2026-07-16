import { Order } from "@/lib/models";

export async function triggerSteadfastTrustCheck(orderId: string, phone: string) {
  try {
    // 1. Fetch order and check if already checked
    const order = await Order.findById(orderId);
    if (!order || (order.courierTrust && order.courierTrust.checkedAt)) {
      return;
    }

    // 2. Fetch Steadfast API credentials
    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;

    if (!apiKey || !secretKey) {
      console.warn("[Steadfast Auto Trust Check] Credentials not configured.");
      return;
    }

    // 3. Normalize phone number to 11 digits
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("880")) {
      cleanPhone = cleanPhone.slice(2);
    } else if (!cleanPhone.startsWith("0") && cleanPhone.length === 10) {
      cleanPhone = "0" + cleanPhone;
    }

    const baseUrl = process.env.STEADFAST_API_URL || "https://portal.packzy.com/api/v1";
    const res = await fetch(`${baseUrl}/fraud_check/${cleanPhone}`, {
      method: "GET",
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
    });

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error(`[Steadfast Auto Trust Check] Failed to parse API response (Status ${res.status}):`, responseText);
      return;
    }

    if (res.status === 200) {
      const total = data.total_parcels || 0;
      const delivered = data.total_delivered || 0;
      const cancelled = data.total_cancelled || 0;
      const successRate = total > 0 ? Math.round((delivered / total) * 100) : 100;

      // 4. Update the order document
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            courierTrust: {
              successRate,
              successParcel: delivered,
              avoidParcel: cancelled,
              totalParcel: total,
              checkedAt: new Date()
            }
          }
        }
      );
      console.log(`[Steadfast Auto Trust Check] Trust score saved successfully for Order ${orderId} (${successRate}% trust)`);
    } else {
      console.error("[Steadfast Auto Trust Check] API error response:", data);
    }
  } catch (error: any) {
    console.error(`[Steadfast Auto Trust Check] Error checking Order ${orderId}:`, error);
  }
}
