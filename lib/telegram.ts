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
        disable_web_page_preview: true,
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
  const itemsList = order.items.map((item: any) => `▫️ ${item.name} x${item.quantity}`).join('\n');
  
  // Conditional Destination and City
  const isPickup = order.deliveryMethod === 'pickup';
  const city = isPickup ? "Dhaka" : (order.shippingCity || order.city);
  const destination = isPickup 
    ? "Collection Point - Yassin Tower" 
    : (order.shippingAddress || order.address);

  const message = `
🌟 <b>NEW ORDER</b> 🌟
━━━━━━━━━━━━━━━━━━
🆔 <b>ORDER:</b> <code>#${orderIdShort}</code>
👤 <b>CLIENT:</b> ${order.customerName}
📞 <b>PHONE:</b> <code>${order.customerPhone}</code>
🏙️ <b>CITY:</b> ${city}
📍 <b>DESTINATION:</b>
<blockquote>${destination}</blockquote>

🛒 <b>ORDERED ITEMS:</b>
<pre>${itemsList}</pre>

💰 <b>NET TOTAL:</b> <b>৳${order.total.toFixed(0)}</b>
💳 <b>METHOD:</b> ${order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment'}

🔴 <b>STATUS: PENDING</b>
<b>──────────────────</b>
📢 <b>ACTION REQUIRED:</b>
<b>Please review and authorize this order for processing immediately.</b>

🔗 <a href="${BASE_URL}/admin/orders?q=${orderIdShort}">✨ MANAGE ORDER IN DASHBOARD</a>
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
  const itemsList = order.items.map((item: any) => `• ${item.name} x${item.quantity}`).join('\n');
  
  // Conditional Destination
  const isPickup = order.deliveryMethod === 'pickup';
  const destination = isPickup 
    ? "Collection Point - Yassin Tower" 
    : (order.shippingAddress || order.address);

  const message = `
🚚 <b>DISPATCH NOTIFICATION</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ORDER:</b> <code>#${orderIdShort}</code>
👤 <b>CLIENT:</b> ${order.customerName}
📍 <b>ADDRESS:</b>
<blockquote>${destination}</blockquote>

📦 <b>PACKAGE CONTENTS:</b>
<pre>${itemsList}</pre>

🏗️ <b>DELIVERY:</b> ${isPickup ? 'Store Pickup' : 'Home Delivery'}
━━━━━━━━━━━━━━━━━━
🛠️ <b>LOGISTICS ACTION:</b>
<b>Prepare items for packing and schedule courier pickup.</b>

🔗 <a href="${BASE_URL}/admin/orders?q=${orderIdShort}">📦 OPEN LOGISTICS QUEUE</a>
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
🚫 <b>SYSTEM ALERT: ${event.toUpperCase()}</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ORDER:</b> <code>#${orderIdShort}</code>
👤 <b>CLIENT:</b> ${order.customerName}
❗ <b>REASON:</b>
<blockquote>${reason || 'Not provided'}</blockquote>

📢 <b>ATTENTION:</b> @SuperAdmins
`;

  return sendTelegramMessage({
    chatId: CHAT_IDS.MANAGEMENT,
    text: message,
  });
}
