const TELEGRAM_BOT_TOKEN = "8697716533:AAGym-qQ0XdjOwEv2w1TO48hFJca8_QP1kU";

// Chat IDs for Different Groups
export const CHAT_IDS = {
  MANAGEMENT: "-1003942975521", // For Admins/SuperAdmins (New Orders)
  LOGISTICS: "-1003968662595",   // For Moderators (Processing/Dispatch)
};

interface TelegramOptions {
  chatId: string;
  text: string;
  parse_mode?: "HTML" | "MarkdownV2";
}

export async function sendTelegramMessage({ chatId, text, parse_mode = "HTML" }: TelegramOptions) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Telegram API Error:", error);
    }
    return response.ok;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

/**
 * Send alert to Management Group for a New Order
 */
export async function notifyNewOrder(order: any) {
  const message = `
📦 <b>NEW ORDER RECEIVED!</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> #${order._id.toString().slice(-8).toUpperCase()}
👤 <b>Customer:</b> ${order.customerName}
📞 <b>Phone:</b> ${order.customerPhone}
📍 <b>Location:</b> ${order.city}
💰 <b>Total:</b> ৳${order.total.toFixed(0)}
🛒 <b>Items:</b> ${order.items.length} units

📢 <b>Attention:</b> @Admins @SuperAdmins
<a href="https://parle-bangladesh.vercel.app/admin/orders">View in Admin Panel</a>
`;

  return sendTelegramMessage({
    chatId: CHAT_IDS.MANAGEMENT,
    text: message,
  });
}

/**
 * Send alert to Logistics Group for a Ready-to-Process Order
 */
export async function notifyOrderReady(order: any) {
  const message = `
🛠️ <b>ORDER READY FOR DISPATCH</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> #${order._id.toString().slice(-8).toUpperCase()}
👤 <b>Customer:</b> ${order.customerName}
📍 <b>Address:</b> ${order.shippingAddress || order.address}
🏗️ <b>Method:</b> ${order.deliveryMethod === 'pickup' ? 'Store Pickup' : 'Home Delivery'}

📢 <b>Attention:</b> @Moderators
<i>Please begin packing and arrange shipping immediately.</i>
<a href="https://parle-bangladesh.vercel.app/admin/orders">Open Logistics Queue</a>
`;

  return sendTelegramMessage({
    chatId: CHAT_IDS.LOGISTICS,
    text: message,
  });
}

/**
 * Send critical alert (Cancellations, Loss, etc)
 */
export async function notifyCriticalEvent(event: string, order: any, reason?: string) {
    const message = `
⚠️ <b>CRITICAL EVENT: ${event.toUpperCase()}</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> #${order._id.toString().slice(-8).toUpperCase()}
👤 <b>Customer:</b> ${order.customerName}
❗ <b>Reason:</b> ${reason || 'Not provided'}

📢 <b>Attention:</b> @SuperAdmins
`;

    return sendTelegramMessage({
      chatId: CHAT_IDS.MANAGEMENT,
      text: message,
    });
}
