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

  const isPickup = order.deliveryMethod === 'pickup';

  // Format: Address, City - PostalCode
  const displayAddress = isPickup
    ? "Collection Point - Yassin Tower"
    : `${order.shippingAddress || order.address}, ${order.shippingCity || order.city}${order.shippingPostalCode || order.postalCode ? ` - ${order.shippingPostalCode || order.postalCode}` : ''}`;

  const message = `
🌟 <b>NEW PENDING ORDER</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ORDER ID:</b> <code>#${orderIdShort}</code>
👤 <b>CLIENT NAME:</b> ${order.customerName}
📞 <b>PHONE NUMBER:</b> <code>${order.customerPhone}</code>
🏙️ <b>CITY:</b> ${isPickup ? "Dhaka" : (order.shippingCity || order.city)}
📍 <b>ADDRESS:</b>
<blockquote>${displayAddress}</blockquote>

📦 <b>ORDERED ITEMS:</b>
<pre>${itemsList}</pre>

🏗️ <b>DELIVERY:</b> ${isPickup ? 'Store Pickup' : 'Home Delivery'}
💰 <b>NET TOTAL:</b> <b>৳${order.total.toFixed(0)}</b>
━━━━━━━━━━━━━━━━━━
🔴 <b>STATUS: PENDING</b>
📢 <b>ACTION: Review and authorize in dashboard.</b>

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

  const isPickup = order.deliveryMethod === 'pickup';

  // Format: Address, City - PostalCode
  const displayAddress = isPickup
    ? "Collection Point - Yassin Tower"
    : `${order.shippingAddress || order.address}, ${order.shippingCity || order.city}${order.shippingPostalCode || order.postalCode ? ` - ${order.shippingPostalCode || order.postalCode}` : ''}`;

  const message = `
🚚 <b>NEW PROCESSING ORDER</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>ORDER ID:</b> <code>#${orderIdShort}</code>
👤 <b>CLIENT NAME:</b> ${order.customerName}
📞 <b>PHONE NUMBER:</b> <code>${order.customerPhone}</code>
🏙️ <b>CITY:</b> ${isPickup ? "Dhaka" : (order.shippingCity || order.city)}
📍 <b>ADDRESS:</b>
<blockquote>${displayAddress}</blockquote>

📦 <b>PACKAGE CONTENTS:</b>
<pre>${itemsList}</pre>

🏗️ <b>DELIVERY:</b> ${isPickup ? 'Store Pickup' : 'Home Delivery'}
━━━━━━━━━━━━━━━━━━
🔵 <b>STATUS: PROCESSING</b>
🛠️ <b>ACTION: Pack items and schedule dispatch.</b>

📢 <b>ATTENTION:</b> <a href="tg://user?id=8699195789">Logistics Department</a>

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

/**
 * Send alert to Management for a New Contact Inquiry
 */
export async function notifyNewInquiry(submission: any) {
  const message = `
📨 <b>NEW CONTACT INQUIRY</b>
━━━━━━━━━━━━━━━━━━
👤 <b>NAME:</b> ${submission.name}
📞 <b>PHONE:</b> <code>${submission.number}</code>
📧 <b>EMAIL:</b> ${submission.email || 'Not provided'}
🏷️ <b>TYPE:</b> ${submission.type.toUpperCase()}
${submission.organizationName ? `🏢 <b>ORG:</b> ${submission.organizationName}` : ""}
${submission.location ? `📍 <b>LOCATION:</b> ${submission.location}` : ""}

💬 <b>MESSAGE:</b>
<blockquote>${submission.message}</blockquote>
━━━━━━━━━━━━━━━━━━
📢 <b>ACTION: Follow up via dashboard.</b>

🔗 <a href="${BASE_URL}/admin/contacts">📋 VIEW ALL INQUIRIES</a>
`;

  return sendTelegramMessage({
    chatId: CHAT_IDS.MANAGEMENT,
    text: message,
  });
}

/**
 * Send alert to Management for a New Career Application
 */
export async function notifyNewApplication(application: any) {
  const message = `
💼 <b>NEW CAREER APPLICATION</b>
━━━━━━━━━━━━━━━━━━
🎯 <b>POSITION:</b> ${application.position}
👤 <b>NAME:</b> ${application.fullname}
📞 <b>PHONE:</b> <code>${application.phone}</code>
📧 <b>EMAIL:</b> ${application.email}
⏳ <b>EXPERIENCE:</b> ${application.experience || 'N/A'}

📝 <b>MESSAGE:</b>
<blockquote>${application.message}</blockquote>
━━━━━━━━━━━━━━━━━━
📎 <b>RESUME: Attached to admin email.</b>
📢 <b>ACTION: Review candidate in dashboard.</b>

🔗 <a href="${BASE_URL}/admin/careers">📂 OPEN CAREER QUEUE</a>
`;

  return sendTelegramMessage({
    chatId: CHAT_IDS.MANAGEMENT,
    text: message,
  });
}
