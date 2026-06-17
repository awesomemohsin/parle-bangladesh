const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Chat IDs for Different Groups
export const CHAT_IDS = {
  MANAGEMENT: process.env.TELEGRAM_CHAT_ID_MANAGEMENT || "-1003942975521",
  LOGISTICS: process.env.TELEGRAM_CHAT_ID_LOGISTICS || "-1003968662595",
  OWNERS: (process.env.TELEGRAM_OWNER_IDS || "8781056260").split(","), 
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
      console.error("Telegram API Error:", JSON.stringify(error));
    } else {
      console.log(`Telegram message sent successfully to ${chatId}`);
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

  // Format: Address, Thana, City - PostalCode
  const thanaSuffix = order.shippingThana || order.thana ? `, ${order.shippingThana || order.thana}` : '';
  const displayAddress = isPickup
    ? "Collection Point - Yassin Tower"
    : `${order.shippingAddress || order.address}${thanaSuffix}, ${order.shippingCity || order.city}${order.shippingPostalCode || order.postalCode ? ` - ${order.shippingPostalCode || order.postalCode}` : ''}`;

  const title = order.customerType === 'dealer' ? '🌟 NEW DEALER ORDER' : '🌟 NEW PENDING ORDER';

  const message = `
<b>${title}</b>
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

  // Format: Address, Thana, City - PostalCode
  const thanaSuffix = order.shippingThana || order.thana ? `, ${order.shippingThana || order.thana}` : '';
  const displayAddress = isPickup
    ? "Collection Point - Yassin Tower"
    : `${order.shippingAddress || order.address}${thanaSuffix}, ${order.shippingCity || order.city}${order.shippingPostalCode || order.postalCode ? ` - ${order.shippingPostalCode || order.postalCode}` : ''}`;

  const title = order.customerType === 'dealer' ? '🚚 NEW DEALER ORDER (PROCESSING)' : '🚚 NEW PROCESSING ORDER';

  const message = `
<b>${title}</b>
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

  console.log(`Sending order ready notification for ${orderIdShort} to group ${CHAT_IDS.LOGISTICS}`);
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

/**
 * Notify Superadmins about a new approval request
 */
export async function notifyNewApprovalRequest(request: any) {
  const isSensitive = ['price', 'stock', 'dealerPrice', 'discountPrice', 'creation'].includes(request.field);
  let typeIcon = '🏷️';
  if (request.type === 'order') typeIcon = '📦';
  if (request.type === 'promo-code') typeIcon = '🎟️';
  
  const level = isSensitive ? 'LEVEL 2 (FINANCIAL)' : 'LEVEL 1 (BASIC)';

  // Format values for better readability (handling JSON stringified snapshots)
  const formatValue = (val: string) => {
    if (!val || val === 'none') return '<i>None</i>';
    try {
      if (val.startsWith('{') && val.endsWith('}')) {
        const obj = JSON.parse(val);
        // Extract meaningful info for summary
        const summaryParts = [];
        if (obj.code) summaryParts.push(`Code: [Hidden]`);
        if (obj.discountAmount) summaryParts.push(`Amt: ${obj.discountAmount}${obj.discountType === 'percentage' ? '%' : '৳'}`);
        if (obj.minOrderAmount) summaryParts.push(`Min: ৳${obj.minOrderAmount}`);
        if (obj.maxDiscountAmount) summaryParts.push(`Cap: ৳${obj.maxDiscountAmount}`);
        if (obj.type) summaryParts.push(`Type: ${obj.type}`);
        
        return summaryParts.length > 0 ? summaryParts.join(' | ') : '<i>(Current Config)</i>';
      }
    } catch (e) {}
    return `<code>${val}</code>`;
  };

  const formattedOld = formatValue(request.oldValue);
  const formattedNew = request.newValue === 'updated_configuration' ? '<b>[New Configuration]</b>' : `<b>${request.newValue}</b>`;
  
  let targetName = request.targetName;
  if (request.type === 'promo-code' && targetName.startsWith('Promo: ')) {
    targetName = 'Promo Code [Hidden]';
  }

  let detailMessage = "";
  if (request.type === 'promo-code' && request.targetDetails) {
    const details = request.targetDetails;
    const isUpdate = request.field === 'update';
    
    if (isUpdate) {
      const summaryParts = [];
      if (details.code !== undefined) summaryParts.push(`▫️ <b>NEW CODE:</b> <code>[Hidden]</code>`);
      if (details.discountAmount !== undefined) {
        const isPercentage = details.discountType === 'percentage' || 
          (details.discountType === undefined && request.oldValue.toLowerCase().includes('percentage'));
        const discountSign = isPercentage ? '%' : '৳';
        summaryParts.push(`▫️ <b>NEW RATE:</b> <b>${details.discountAmount}${discountSign}</b>`);
      }
      if (details.maxUsage !== undefined) summaryParts.push(`▫️ <b>NEW MAX USAGE:</b> ${details.maxUsage}`);
      if (details.minOrderAmount !== undefined) summaryParts.push(`▫️ <b>NEW MIN ORDER:</b> ৳${details.minOrderAmount}`);
      if (details.maxDiscountAmount !== undefined) summaryParts.push(`▫️ <b>NEW MAX DISCOUNT CAP:</b> ৳${details.maxDiscountAmount}`);
      if (details.expiresAt !== undefined) summaryParts.push(`▫️ <b>NEW EXPIRATION:</b> ${details.expiresAt ? new Date(details.expiresAt).toLocaleDateString() : 'Never'}`);
      
      if (summaryParts.length > 0) {
        detailMessage = `
🎟️ <b>UPDATED CONFIGURATION:</b>
${summaryParts.join('\n')}
`;
      }
    } else {
      // Creation
      const discountSign = details.discountType === 'percentage' ? '%' : '৳';
      const discountDisplay = `${details.discountAmount}${discountSign}`;
      const promoType = details.type === 'promo' ? 'Promo Code' : 'Flat Discount';
      
      detailMessage = `
🎟️ <b>DISCOUNT DETAILS:</b>
▫️ <b>TYPE:</b> ${promoType}
${details.code ? `▫️ <b>CODE:</b> <code>[Hidden]</code>\n` : ""}▫️ <b>RATE:</b> <b>${discountDisplay}</b>
▫️ <b>MAX USAGE:</b> ${details.maxUsage}
▫️ <b>MIN ORDER AMOUNT:</b> ৳${details.minOrderAmount || 0}
${details.discountType === 'percentage' && details.maxDiscountAmount ? `▫️ <b>MAX DISCOUNT CAP:</b> ৳${details.maxDiscountAmount}\n` : ""}▫️ <b>EXPIRES AT:</b> ${details.expiresAt ? new Date(details.expiresAt).toLocaleDateString() : 'Never'}
`;
    }
  }
  
  const message = `
<b>${typeIcon} NEW APPROVAL REQUEST</b>
<b>PRIORITY:</b> ${level}
━━━━━━━━━━━━━━━━━━
👤 <b>REQUESTER:</b> ${request.requesterEmail}
🎯 <b>TARGET:</b> ${targetName}
${(request.weight || request.flavor) ? `⚖️ <b>VARIANT:</b> ${[request.weight, request.flavor].filter(Boolean).join(' - ')}\n` : ""}📝 <b>CHANGE:</b> <code>${request.field}</code>
🔄 <b>VALUE:</b> ${formattedOld} ➡️ ${formattedNew}
${detailMessage}
📢 <b>ACTION:</b> 2 Superadmins must approve to proceed.
━━━━━━━━━━━━━━━━━━
🔗 <a href="${BASE_URL}/admin/approvals">⚡ OPEN APPROVAL DASHBOARD</a>
`;

  // Send all initial requests to Management Group
  return sendTelegramMessage({ chatId: CHAT_IDS.MANAGEMENT, text: message });
}

/**
 * Notify Owner when a sensitive request passes Superadmin phase
 */
export async function notifyOwnerApprovalRequired(request: any) {
  const message = `
<b>👑 FINAL AUTHORIZATION REQUIRED</b>
━━━━━━━━━━━━━━━━━━
👤 <b>APPROVED BY:</b> ${request.superadminApprovals.join(' & ')}
🎯 <b>TARGET:</b> ${request.targetName}
${(request.weight || request.flavor) ? `⚖️ <b>VARIANT:</b> ${[request.weight, request.flavor].filter(Boolean).join(' - ')}\n` : ""}📝 <b>CHANGE:</b> <code>${request.field}</code>
🔄 <b>VALUE:</b> ${request.oldValue} ➡️ <b>${request.newValue}</b>

❗ <b>SENSITIVE CHANGE:</b> This requires your final approval to go live.
━━━━━━━━━━━━━━━━━━
🔗 <a href="${BASE_URL}/admin/approvals">👑 OPEN OWNER CONSOLE</a>
`;

  // Send to all Owners (gracefully handle if someone hasn't started the bot)
  const results = await Promise.all(
    CHAT_IDS.OWNERS.map(async (id) => {
      try {
        return await sendTelegramMessage({ chatId: id, text: message });
      } catch (err) {
        console.error(`Failed to notify owner ${id}:`, err);
        return false;
      }
    })
  );
  return results.some(res => res); // Return true if at least one was successful
}

/**
 * Notify Requester when a request is finalized (Approved/Declined)
 */
export async function notifyApprovalFinalized(request: any) {
  const isApproved = request.status === 'approved';
  const icon = isApproved ? '✅' : '❌';
  
  let targetName = request.targetName;
  if (request.type === 'promo-code' && targetName.startsWith('Promo: ')) {
    targetName = 'Promo Code [Hidden]';
  }

  const message = `
<b>${icon} REQUEST ${request.status.toUpperCase()}</b>
<b>━━━━━━━━━━━━━━━━━━</b>
🎯 <b>TARGET:</b> ${targetName}
📝 <b>FIELD:</b> <code>${request.field}</code>
👤 <b>FINALIZED BY:</b> ${isApproved ? 'Authorization Consensus' : request.declinedBy}

${isApproved ? '✨ The changes are now LIVE in the system.' : '🚫 The request was rejected and no changes were applied.'}
`;

  // This could go to the management group or the individual requester if we had their Telegram ID
  return sendTelegramMessage({
    chatId: CHAT_IDS.MANAGEMENT,
    text: message,
  });
}
