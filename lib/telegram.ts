const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Chat IDs for Different Groups
export const CHAT_IDS = {
  MANAGEMENT: process.env.TELEGRAM_CHAT_ID_MANAGEMENT || "-1003942975521", 
  LOGISTICS: process.env.TELEGRAM_CHAT_ID_LOGISTICS || "-1003968662595",   
};

const BASE_URL = "https://parlebangladesh.com";

interface TelegramOptions {
  chatId: string;
  text: string;
  parse_mode?: "HTML" | "MarkdownV2";
}

export async function sendTelegramMessage({ chatId, text, parse_mode = "HTML" }: TelegramOptions) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is missing in environment variables");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode,
        disable_web_page_preview: false,
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
  const orderIdShort = order._id.toString().slice(-8).toUpperCase();
  const itemsList = order.items.map((item: any) => `• ${item.name} (${item.quantity}x)`).join('\n');
  
  const message = `
🚨 <b>NEW ORDER RECEIVED</b> 🚨
━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> #${orderIdShort}
👤 <b>Customer:</b> ${order.customerName}
📞 <b>Phone:</b> <code>${order.customerPhone}</code>
📍 <b>City:</b> ${order.city}
🏠 <b>Address:</b> ${order.address}

🛒 <b>Items:</b>
${itemsList}

💰 <b>Total Amount:</b> ৳${order.total.toFixed(0)}
💳 <b>Payment:</b> ${order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment'}

⚠️ <b>STATUS: PENDING</b>
<b><u>NEED YOUR ATTENTION TO PROCESS THIS ORDER!</u></b>

🔗 <a href="${BASE_URL}/admin/orders?q=${order._id.toString()}">OPEN & PROCESS ORDER NOW</a>
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
  const orderIdShort = order._id.toString().slice(-8).toUpperCase();
  
  const message = `
🛠️ <b>ORDER READY FOR DISPATCH</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> #${orderIdShort}
👤 <b>Customer:</b> ${order.customerName}
📍 <b>Address:</b> ${order.shippingAddress || order.address}
📦 <b>Items:</b> ${order.items.length} product(s)

📢 <b>Attention:</b> Moderators
<i>Please begin packing and arrange shipping.</i>

🔗 <a href="${BASE_URL}/admin/orders?q=${order._id.toString()}">OPEN IN LOGISTICS QUEUE</a>
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
  const orderIdShort = order._id.toString().slice(-8).toUpperCase();
  
  const message = `
⚠️ <b>CRITICAL EVENT: ${event.toUpperCase()}</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> #${orderIdShort}
👤 <b>Customer:</b> ${order.customerName}
❗ <b>Reason:</b> ${reason || 'Not provided'}

📢 <b>Attention:</b> Superadmins
`;

  return sendTelegramMessage({
    chatId: CHAT_IDS.MANAGEMENT,
    text: message,
  });
}
